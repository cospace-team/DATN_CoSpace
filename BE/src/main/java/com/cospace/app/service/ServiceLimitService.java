package com.cospace.app.service;

import com.cospace.app.dto.api.ServiceLimitDto.AvailabilityResponse;
import com.cospace.app.dto.api.ServiceLimitDto.LimitResponse;
import com.cospace.app.entity.BookingServiceItem;
import com.cospace.app.entity.BookingStatus;
import com.cospace.app.entity.BranchServiceLimit;
import com.cospace.app.entity.ExtraServiceEntity;
import com.cospace.app.repository.BookingServiceItemRepository;
import com.cospace.app.repository.BranchServiceLimitRepository;
import com.cospace.app.repository.ExtraServiceRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Per-branch limits on extra services that are physical items (projectors, portable screens…): a
 * branch with 2 projectors can lend at most 2 at the same time. Units in use are the quantities on
 * the branch's live bookings whose time overlaps the requested window. Services without a limit
 * (drinks, printing) are unrestricted.
 */
@Service
@RequiredArgsConstructor
public class ServiceLimitService {

    /** Bookings that hold their add-ons: awaiting payment, paid, or in use. */
    static final List<BookingStatus> HOLDING_STATUSES = List.of(
            BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN);

    /** Stands in for "leave out no booking" in the usage query. */
    private static final UUID NO_BOOKING = new UUID(0L, 0L);

    private final BranchServiceLimitRepository limitRepository;
    private final ExtraServiceRepository extraServiceRepository;
    private final BookingServiceItemRepository bookingServiceItemRepository;
    private final ExtraServiceService extraServiceService;
    private final EntityManager entityManager;

    /** The key a limit is stored under: the service code, or its id when it has none. */
    public static String limitKey(ExtraServiceEntity service) {
        return service.getCode() != null && !service.getCode().isBlank() ? service.getCode() : service.getId().toString();
    }

    /* ─────────────── Admin ─────────────── */

    /** Services offered at a branch (its own and inherited global ones) with their limit there. */
    @Transactional(readOnly = true)
    public List<LimitResponse> listLimits(UUID branchId) {
        Map<String, Integer> limits = limitRepository.findByBranchId(branchId).stream()
                .collect(Collectors.toMap(BranchServiceLimit::getServiceCode, BranchServiceLimit::getMaxConcurrent));
        return offeredAt(branchId).values().stream()
                .map(s -> LimitResponse.builder()
                        .serviceId(s.getId())
                        .serviceKey(limitKey(s))
                        .name(s.getName())
                        .serviceType(s.getServiceType())
                        .unit(s.getUnit())
                        .price(s.getPrice())
                        .branchOwned(branchId.equals(s.getBranchId()))
                        .maxConcurrent(limits.get(limitKey(s)))
                        .build())
                .toList();
    }

    /** Sets (or with null removes) how many of a service the branch can lend at once. */
    @Transactional
    public void setLimit(UUID actorId, UUID branchId, String serviceKey, Integer maxConcurrent) {
        if (branchId == null || serviceKey == null || serviceKey.isBlank()) {
            throw new IllegalArgumentException("Thiếu chi nhánh hoặc dịch vụ.");
        }
        if (!offeredAt(branchId).containsKey(serviceKey)) {
            throw new IllegalArgumentException("Dịch vụ không được cung cấp tại chi nhánh này.");
        }
        if (maxConcurrent == null) {
            limitRepository.findByBranchIdAndServiceCode(branchId, serviceKey).ifPresent(limitRepository::delete);
            return;
        }
        if (maxConcurrent < 0 || maxConcurrent > 1000) {
            throw new IllegalArgumentException("Số lượng phải từ 0 đến 1000.");
        }
        BranchServiceLimit limit = limitRepository.findByBranchIdAndServiceCode(branchId, serviceKey)
                .orElseGet(() -> BranchServiceLimit.builder().branchId(branchId).serviceCode(serviceKey).build());
        limit.setMaxConcurrent(maxConcurrent);
        limit.setUpdatedBy(actorId);
        limitRepository.save(limit);
    }

    /* ─────────────── Customers & booking ─────────────── */

    /** How many of each limited service are still free at a branch for a time window. */
    @Transactional(readOnly = true)
    public List<AvailabilityResponse> availability(UUID branchId, OffsetDateTime start, OffsetDateTime end) {
        requireWindow(start, end);
        Map<String, Integer> limits = limitRepository.findByBranchId(branchId).stream()
                .collect(Collectors.toMap(BranchServiceLimit::getServiceCode, BranchServiceLimit::getMaxConcurrent));
        List<AvailabilityResponse> result = new ArrayList<>();
        for (ExtraServiceEntity s : offeredAt(branchId).values()) {
            Integer max = limits.get(limitKey(s));
            if (max == null) continue;
            long inUse = inUse(s, branchId, start, end, NO_BOOKING);
            result.add(AvailabilityResponse.builder()
                    .serviceId(s.getId())
                    .serviceKey(limitKey(s))
                    .name(s.getName())
                    .maxConcurrent(max)
                    .inUse(inUse)
                    .remaining(Math.max(0, max - inUse))
                    .build());
        }
        return result;
    }

    /**
     * Refuses add-on lines that would lend out more of a limited service than the branch has for the
     * window. With {@code lock}, the check holds a per-service advisory lock until the transaction
     * ends, so two concurrent bookings cannot both take the last unit; a quote checks without it.
     *
     * @param excludeBookingId a booking whose current lines should not be counted (it is changing them)
     */
    @Transactional
    public void requireCapacity(UUID branchId, OffsetDateTime start, OffsetDateTime end,
                                List<BookingServiceItem> lines, UUID excludeBookingId, boolean lock) {
        if (lines == null || lines.isEmpty() || branchId == null) {
            return;
        }
        Map<UUID, Integer> requested = new LinkedHashMap<>();
        for (BookingServiceItem line : lines) {
            if (line.getServiceId() != null) {
                requested.merge(line.getServiceId(), line.getQuantity(), Integer::sum);
            }
        }
        if (requested.isEmpty()) {
            return;
        }
        Map<String, Integer> limits = limitRepository.findByBranchId(branchId).stream()
                .collect(Collectors.toMap(BranchServiceLimit::getServiceCode, BranchServiceLimit::getMaxConcurrent));
        if (limits.isEmpty()) {
            return;
        }
        // Lines for the same item (a global row and a branch override) count together.
        Map<String, Integer> byKey = new LinkedHashMap<>();
        Map<String, ExtraServiceEntity> serviceOfKey = new LinkedHashMap<>();
        for (Map.Entry<UUID, Integer> e : requested.entrySet()) {
            ExtraServiceEntity s = extraServiceRepository.findById(e.getKey()).orElse(null);
            if (s == null || !limits.containsKey(limitKey(s))) continue;
            byKey.merge(limitKey(s), e.getValue(), Integer::sum);
            serviceOfKey.putIfAbsent(limitKey(s), s);
        }
        // Keys are locked in a fixed order so two bookings cannot deadlock on each other.
        for (String key : byKey.keySet().stream().sorted().toList()) {
            ExtraServiceEntity s = serviceOfKey.get(key);
            if (lock) {
                entityManager.createNativeQuery("SELECT pg_advisory_xact_lock(hashtext(:key))")
                        .setParameter("key", "service-limit:" + branchId + ":" + key)
                        .getSingleResult();
            }
            int max = limits.get(key);
            long inUse = inUse(s, branchId, start, end, excludeBookingId != null ? excludeBookingId : NO_BOOKING);
            int wanted = byKey.get(key);
            if (inUse + wanted > max) {
                long left = Math.max(0, max - inUse);
                throw new IllegalStateException(left == 0
                        ? "Dịch vụ \"" + s.getName() + "\" đã được đặt hết trong khung giờ này (cơ sở có " + max + ")."
                        : "Dịch vụ \"" + s.getName() + "\" chỉ còn " + left + "/" + max + " trong khung giờ này.");
            }
        }
    }

    /* ─────────────── Internals ─────────────── */

    /** Units of the service (any row sharing its key) held at the branch during the window. */
    private long inUse(ExtraServiceEntity service, UUID branchId, OffsetDateTime start, OffsetDateTime end, UUID excludeBookingId) {
        Set<UUID> ids = service.getCode() != null && !service.getCode().isBlank()
                ? extraServiceRepository.findByCode(service.getCode()).stream()
                        .filter(s -> s.getBranchId() == null || branchId.equals(s.getBranchId()))
                        .map(ExtraServiceEntity::getId).collect(Collectors.toSet())
                : Set.of(service.getId());
        return bookingServiceItemRepository.sumQuantityInUse(ids, BookingServiceItem.STATUS_VOID, branchId,
                HOLDING_STATUSES, start, end, excludeBookingId);
    }

    /** Active services of a branch by limit key, a branch's own row taking precedence. */
    private Map<String, ExtraServiceEntity> offeredAt(UUID branchId) {
        Map<String, ExtraServiceEntity> byKey = new LinkedHashMap<>();
        for (ExtraServiceEntity s : extraServiceService.getAvailableServices(branchId)) {
            byKey.put(limitKey(s), s);
        }
        return byKey;
    }

    private static void requireWindow(OffsetDateTime start, OffsetDateTime end) {
        if (start == null || end == null || !end.isAfter(start)) {
            throw new IllegalArgumentException("Khoảng thời gian không hợp lệ.");
        }
    }
}
