package com.cospace.app.service;

import com.cospace.app.config.CacheConfig;
import com.cospace.app.entity.ExtraServiceEntity;
import com.cospace.app.repository.BookingServiceItemRepository;
import com.cospace.app.repository.ExtraServiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ExtraServiceService {

    private final ExtraServiceRepository extraServiceRepository;
    private final BookingServiceItemRepository bookingServiceItemRepository;

    @Transactional(readOnly = true)
    @Cacheable(CacheConfig.EXTRA_SERVICES)
    public List<ExtraServiceEntity> getAvailableServices(UUID branchId) {
        // LinkedHashMap keeps insertion order and allows branch overrides by code
        Map<String, ExtraServiceEntity> merged = new LinkedHashMap<>();
        // 1. Global active defaults
        for (ExtraServiceEntity s : extraServiceRepository.findByBranchIdIsNullAndIsActiveTrue()) {
            merged.put(s.getCode(), s);
        }
        // 2. Branch-specific overrides (replaces global with branch custom price/name)
        if (branchId != null) {
            for (ExtraServiceEntity s : extraServiceRepository.findByBranchIdAndIsActiveTrue(branchId)) {
                merged.put(s.getCode(), s);
            }
        }
        return new ArrayList<>(merged.values());
    }

    /**
     * For Admin / Branch Admin management UI: returns all services including inactive ones.
     */
    @Transactional(readOnly = true)
    public List<ExtraServiceEntity> getAllServices(UUID branchId) {
        if (branchId != null) {
            return extraServiceRepository.findByBranchId(branchId);
        }
        return extraServiceRepository.findByBranchIdIsNull();
    }

    @Transactional
    @CacheEvict(value = CacheConfig.EXTRA_SERVICES, allEntries = true)
    public ExtraServiceEntity createService(ExtraServiceEntity service) {
        if (service.getName() == null || service.getName().isBlank()) {
            throw new IllegalArgumentException("Tên dịch vụ không được để trống.");
        }
        requireValidPrice(service.getPrice());
        return extraServiceRepository.save(service);
    }

    /** A service is never priced below zero: a negative line would quietly discount the booking it is added to. */
    private static void requireValidPrice(long price) {
        if (price < 0) {
            throw new IllegalArgumentException("Giá dịch vụ không được âm.");
        }
    }

    /**
     * Applies a partial update: only fields actually present in {@code updates} are changed.
     * The branch-admin UI's "bật/tắt" toggle sends only {@code {isActive}} — binding straight to
     * the entity (as before) would leave every other field at its JSON default (null/0/false),
     * wiping the service's name, unit and price on a simple on/off toggle.
     */
    @Transactional
    @CacheEvict(value = CacheConfig.EXTRA_SERVICES, allEntries = true)
    public ExtraServiceEntity updateService(UUID id, Map<String, Object> updates) {
        ExtraServiceEntity existing = extraServiceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Dịch vụ không tồn tại"));
        if (updates.containsKey("code") && updates.get("code") != null) {
            existing.setCode(updates.get("code").toString());
        }
        if (updates.containsKey("name") && updates.get("name") != null) {
            if (updates.get("name").toString().isBlank()) {
                throw new IllegalArgumentException("Tên dịch vụ không được để trống.");
            }
            existing.setName(updates.get("name").toString());
        }
        if (updates.containsKey("serviceType") && updates.get("serviceType") != null) {
            existing.setServiceType(updates.get("serviceType").toString());
        }
        if (updates.containsKey("description")) {
            Object description = updates.get("description");
            existing.setDescription(description != null ? description.toString() : null);
        }
        if (updates.containsKey("price") && updates.get("price") != null) {
            long price;
            try {
                // Through BigDecimal so "35000" and a JSON number serialised as "35000.0" both parse.
                price = new java.math.BigDecimal(updates.get("price").toString().trim()).setScale(0, java.math.RoundingMode.HALF_UP).longValueExact();
            } catch (NumberFormatException | ArithmeticException e) {
                throw new IllegalArgumentException("Giá dịch vụ không hợp lệ.");
            }
            requireValidPrice(price);
            existing.setPrice(price);
        }
        if (updates.containsKey("unit") && updates.get("unit") != null) {
            existing.setUnit(updates.get("unit").toString());
        }
        if (updates.containsKey("isActive") && updates.get("isActive") != null) {
            existing.setActive(Boolean.parseBoolean(updates.get("isActive").toString()));
        } else if (updates.containsKey("active") && updates.get("active") != null) {
            existing.setActive(Boolean.parseBoolean(updates.get("active").toString()));
        }
        return extraServiceRepository.save(existing);
    }

    /**
     * Permanently removes a service — what the branch-admin UI's "Xóa vĩnh viễn" (permanently
     * delete) button promises, as distinct from the separate on/off toggle above. A service
     * already used on a booking can't be hard-deleted (booking_services has an ON DELETE
     * RESTRICT foreign key to it, and doing so would corrupt that booking's history), so that
     * case is rejected with a clear message instead of letting the FK violation surface as a 500.
     */
    @Transactional
    @CacheEvict(value = CacheConfig.EXTRA_SERVICES, allEntries = true)
    public void deleteService(UUID id) {
        ExtraServiceEntity existing = extraServiceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Dịch vụ không tồn tại"));
        if (bookingServiceItemRepository.existsByServiceId(id)) {
            throw new IllegalArgumentException(
                    "Không thể xóa vĩnh viễn dịch vụ đã được sử dụng trong đơn đặt chỗ. Hãy tắt dịch vụ thay vì xóa.");
        }
        extraServiceRepository.delete(existing);
    }
}
