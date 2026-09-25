package com.cospace.app.service;

import com.cospace.app.dto.api.BookingExtensionDto;
import com.cospace.app.entity.Booking;
import com.cospace.app.entity.BookingServiceItem;
import com.cospace.app.entity.BookingStatus;
import com.cospace.app.entity.BranchEntity;
import com.cospace.app.entity.DurationUnit;
import com.cospace.app.entity.MaintenanceStatus;
import com.cospace.app.entity.WorkspaceMaintenanceEntity;
import com.cospace.app.repository.BookingRepository;
import com.cospace.app.repository.BranchEntityRepository;
import com.cospace.app.repository.WorkspaceMaintenanceRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

/**
 * Staying longer than booked. A guest can buy extra hours before the booking ends, if the seat is
 * free after it and the branch is still open; the hours are charged at the workspace's hourly rate.
 * A guest who simply stays on and checks out more than the grace period late pays a surcharge per
 * started hour of overstay at the hourly rate times {@link #LATE_FEE_MULTIPLIER_PERCENT}%. Both
 * charges go on the booking's running tab and must be paid (QR or cash) before check-out.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BookingExtensionService {

    /** Most hours a single extension may add. */
    static final int MAX_EXTENSION_HOURS = 8;
    /** Late check-out surcharge relative to the hourly rate (150% = ×1.5). */
    static final long LATE_FEE_MULTIPLIER_PERCENT = 150;

    private static final List<BookingStatus> BLOCKING_STATUSES =
            List.of(BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN);
    private static final DateTimeFormatter HH_MM = DateTimeFormatter.ofPattern("HH:mm");

    private final BookingRepository bookingRepository;
    private final WorkspaceMaintenanceRepository maintenanceRepository;
    private final BranchEntityRepository branchRepository;
    private final PricingService pricingService;
    private final BookingAddonService bookingAddonService;
    private final EntityManager entityManager;

    /** Minutes after the booked end during which checking out is still free. */
    @Value("${app.booking.late-fee-grace-minutes:15}")
    private long lateFeeGraceMinutes = 15;

    /* ─────────────── Extension ─────────────── */

    @Transactional(readOnly = true)
    public BookingExtensionDto.QuoteResponse quote(UUID bookingId, int hours) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đặt chỗ."));
        return buildQuote(booking, hours, OffsetDateTime.now(ZoneOffset.UTC));
    }

    /** Adds {@code hours} to the booking and puts the fee on its tab. */
    @Transactional
    public void extend(UUID actorId, UUID bookingId, int hours) {
        Booking booking = bookingRepository.findByIdWithLock(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đặt chỗ."));
        // Same lock as booking creation, so nobody books the freed-up slot while we extend into it.
        entityManager.createNativeQuery("SELECT pg_advisory_xact_lock(hashtext(:key))")
                .setParameter("key", "booking:" + booking.getWorkspaceId())
                .getSingleResult();

        BookingExtensionDto.QuoteResponse quote = buildQuote(booking, hours, OffsetDateTime.now(ZoneOffset.UTC));
        if (!quote.isAvailable()) {
            throw new IllegalStateException(quote.getReason());
        }

        OffsetDateTime oldEnd = booking.getEndAt();
        booking.setEndAt(quote.getNewEndAt());
        bookingAddonService.addCharge(booking, BookingServiceItem.LINE_EXTENSION,
                String.format("Gia hạn %d giờ (%s → %s)", hours, local(oldEnd), local(quote.getNewEndAt())),
                quote.getAmount(), actorId);
        bookingRepository.save(booking);
        log.info("Booking {} extended by {}h to {} ({}đ)", booking.getBookingCode(), hours, quote.getNewEndAt(), quote.getAmount());
    }

    BookingExtensionDto.QuoteResponse buildQuote(Booking booking, int hours, OffsetDateTime now) {
        if (hours < 1 || hours > MAX_EXTENSION_HOURS) {
            throw new IllegalArgumentException("Số giờ gia hạn phải từ 1 đến " + MAX_EXTENSION_HOURS + ".");
        }
        BookingExtensionDto.QuoteResponse.QuoteResponseBuilder q = BookingExtensionDto.QuoteResponse.builder()
                .bookingId(booking.getId())
                .hours(hours)
                .currentEndAt(booking.getEndAt())
                .newEndAt(booking.getEndAt().plusHours(hours));

        if (booking.getStatus() != BookingStatus.CONFIRMED && booking.getStatus() != BookingStatus.CHECKED_IN) {
            return q.available(false).maxHours(0)
                    .reason("Chỉ gia hạn được đơn đã xác nhận hoặc đang sử dụng.").build();
        }
        if (isMultiDayPass(booking)) {
            return q.available(false).maxHours(0)
                    .reason("Gói nhiều ngày không gia hạn theo giờ. Vui lòng đặt thêm đơn mới.").build();
        }
        if (!now.isBefore(booking.getEndAt())) {
            return q.available(false).maxHours(0)
                    .reason("Đơn đã qua giờ kết thúc, không thể gia hạn. Phụ phí check-out muộn sẽ được tính khi trả chỗ.").build();
        }

        long pricePerHour = pricingService.getUnitPriceVnd(booking.getBranchId(), booking.getWorkspaceTypeId(), DurationUnit.hour.name());
        q.pricePerHour(pricePerHour).amount(pricePerHour * hours);

        Limit limit = maxExtensionHours(booking, now);
        q.maxHours(limit.hours());
        if (hours > limit.hours()) {
            return q.available(false).reason(limit.reason()).build();
        }
        return q.available(true).build();
    }

    private record Limit(int hours, String reason) {
    }

    /** How many whole hours the booking can grow before it hits another booking, maintenance or closing time. */
    private Limit maxExtensionHours(Booking booking, OffsetDateTime now) {
        OffsetDateTime end = booking.getEndAt();
        OffsetDateTime horizon = end.plusHours(MAX_EXTENSION_HOURS);
        OffsetDateTime limitAt = horizon;
        String reason = "Mỗi lần gia hạn tối đa " + MAX_EXTENSION_HOURS + " giờ.";

        for (Booking other : bookingRepository.findOverlappingBookings(booking.getWorkspaceId(), end, horizon, BLOCKING_STATUSES)) {
            if (other.getId().equals(booking.getId()) || BookingExpiryService.isExpiredHold(other, now)) continue;
            OffsetDateTime from = other.getStartAt().isBefore(end) ? end : other.getStartAt();
            if (from.isBefore(limitAt)) {
                limitAt = from;
                reason = "Chỗ đã có khách đặt từ " + local(other.getStartAt()) + ", chỉ gia hạn được đến giờ đó.";
            }
        }
        List<WorkspaceMaintenanceEntity> maintenances = maintenanceRepository.findOverlappingMaintenances(
                booking.getWorkspaceId(), end.toZonedDateTime(), horizon.toZonedDateTime(),
                List.of(MaintenanceStatus.active, MaintenanceStatus.scheduled));
        for (WorkspaceMaintenanceEntity m : maintenances) {
            OffsetDateTime start = m.getStartAt().toOffsetDateTime();
            OffsetDateTime from = start.isBefore(end) ? end : start;
            if (from.isBefore(limitAt)) {
                limitAt = from;
                reason = "Chỗ có lịch bảo trì từ " + local(start) + ".";
            }
        }
        OffsetDateTime closing = closingTimeAfter(booking.getBranchId(), end);
        if (closing != null && closing.isBefore(limitAt)) {
            limitAt = closing;
            reason = "Chi nhánh đóng cửa lúc " + local(closing) + ".";
        }
        int hours = (int) Math.max(0, Duration.between(end, limitAt).toHours());
        return new Limit(hours, hours == 0 ? "Không thể gia hạn: " + reason : reason);
    }

    /** The branch's closing time on the day {@code end} falls on (Vietnam time), if it has fixed hours. */
    private OffsetDateTime closingTimeAfter(UUID branchId, OffsetDateTime end) {
        BranchEntity branch = branchId != null ? branchRepository.findById(branchId).orElse(null) : null;
        if (branch == null) return null;
        LocalTime open = branch.getOpenTime();
        LocalTime close = branch.getCloseTime();
        if (open == null || close == null || !close.isAfter(open)) return null;
        LocalDateTime localEnd = end.atZoneSameInstant(BookingService.BUSINESS_ZONE).toLocalDateTime();
        return localEnd.toLocalDate().atTime(close).atZone(BookingService.BUSINESS_ZONE).toOffsetDateTime();
    }

    /* ─────────────── Late check-out ─────────────── */

    /** What checking out now would cost on top of the booking, for the check-out screen. */
    @Transactional(readOnly = true)
    public BookingExtensionDto.LateFeeResponse lateFee(UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đặt chỗ."));
        return computeLateFee(booking, OffsetDateTime.now(ZoneOffset.UTC));
    }

    /**
     * Puts the late check-out fee on the tab, once per booking. Staff can still waive it by
     * cancelling the line; a waived fee is not charged again.
     *
     * @return the fee charged, 0 when none is due or it was already handled
     */
    @Transactional
    public long chargeLateFee(UUID actorId, UUID bookingId) {
        Booking booking = bookingRepository.findByIdWithLock(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đặt chỗ."));
        BookingExtensionDto.LateFeeResponse fee = computeLateFee(booking, OffsetDateTime.now(ZoneOffset.UTC));
        if (!fee.isDue() || fee.isAlreadyCharged()) {
            return 0;
        }
        bookingAddonService.addCharge(booking, BookingServiceItem.LINE_LATE_FEE,
                String.format("Check-out muộn %d phút (%d giờ × 1,5 giá giờ)", fee.getLateMinutes(), fee.getBillableHours()),
                fee.getAmount(), actorId);
        bookingRepository.save(booking);
        log.info("Late check-out fee {}đ charged on booking {}", fee.getAmount(), booking.getBookingCode());
        return fee.getAmount();
    }

    /** True when the guest is checking out late and the fee has not been charged or waived yet. */
    @Transactional(readOnly = true)
    public boolean isLateFeePending(Booking booking, OffsetDateTime now) {
        BookingExtensionDto.LateFeeResponse fee = computeLateFee(booking, now);
        return fee.isDue() && !fee.isAlreadyCharged();
    }

    BookingExtensionDto.LateFeeResponse computeLateFee(Booking booking, OffsetDateTime now) {
        long lateMinutes = Math.max(0, Duration.between(booking.getEndAt(), now).toMinutes());
        boolean due = lateMinutes > lateFeeGraceMinutes;
        BookingExtensionDto.LateFeeResponse.LateFeeResponseBuilder r = BookingExtensionDto.LateFeeResponse.builder()
                .bookingId(booking.getId())
                .endAt(booking.getEndAt())
                .lateMinutes(lateMinutes)
                .graceMinutes(lateFeeGraceMinutes)
                .multiplierPercent(LATE_FEE_MULTIPLIER_PERCENT)
                .alreadyCharged(bookingAddonService.hasAnyLine(booking.getId(), BookingServiceItem.LINE_LATE_FEE))
                .due(due);
        if (!due) {
            return r.billableHours(0).amount(0).build();
        }
        long hours = (lateMinutes + 59) / 60;
        long pricePerHour = hourlyRateForLateFee(booking);
        if (pricePerHour <= 0) {
            // No hourly rate to bill against: never block the check-out over a fee we cannot price.
            return r.due(false).billableHours(0).amount(0).build();
        }
        return r.billableHours(hours)
                .pricePerHour(pricePerHour)
                .amount(pricePerHour * hours * LATE_FEE_MULTIPLIER_PERCENT / 100)
                .build();
    }

    /** The workspace's hourly rate, or the booking's own rate when it was booked by the hour and no rate is listed any more. */
    private long hourlyRateForLateFee(Booking booking) {
        try {
            return pricingService.getUnitPriceVnd(booking.getBranchId(), booking.getWorkspaceTypeId(), DurationUnit.hour.name());
        } catch (IllegalArgumentException noHourlyPrice) {
            return booking.getUnit() == DurationUnit.hour ? booking.getPricePerUnit() : 0;
        }
    }

    private static boolean isMultiDayPass(Booking booking) {
        return booking.isContract()
                || booking.getUnit() == DurationUnit.week
                || booking.getUnit() == DurationUnit.month
                || (booking.getUnit() == DurationUnit.day && booking.getUnitCount() > 1);
    }

    private static String local(OffsetDateTime at) {
        return at.atZoneSameInstant(BookingService.BUSINESS_ZONE).format(HH_MM);
    }
}
