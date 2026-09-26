package com.cospace.app.service;

import com.cospace.app.entity.Booking;
import com.cospace.app.entity.BookingStatus;
import com.cospace.app.repository.BookingRepository;
import com.cospace.app.repository.CheckinLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Closes bookings whose time is up but that nobody closed: guests who never checked out, and paid
 * bookings nobody showed up for. Each booking is handled in its own locked transaction so a
 * concurrent staff check-out or check-in always wins cleanly.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BookingLifecycleService {

    private final BookingRepository bookingRepository;
    private final CheckinLogRepository checkinLogRepository;
    private final NotificationService notificationService;
    private final BookingAddonService bookingAddonService;

    /**
     * How long after the booked end time a guest still checked in is checked out automatically.
     * It is well past the 15-minute late check-out grace on purpose: until then a guest who stayed
     * on is checked out by staff, who bill the late check-out fee (see BookingExtensionService).
     */
    @Value("${app.booking.auto-checkout-after-minutes:120}")
    private long checkoutGraceMinutes = 120;

    public long checkoutGraceMinutes() {
        return checkoutGraceMinutes;
    }

    /**
     * Checks out a guest still CHECKED_IN more than the grace period past the booking's end.
     *
     * @return true if the booking was closed
     */
    @Transactional
    public boolean autoCheckoutOverdue(UUID bookingId, OffsetDateTime now) {
        Booking booking = bookingRepository.findByIdWithLock(bookingId).orElse(null);
        if (booking == null || booking.getStatus() != BookingStatus.CHECKED_IN
                || !booking.getEndAt().plusMinutes(checkoutGraceMinutes).isBefore(now)) {
            return false; // already handled, or not overdue any more
        }

        checkinLogRepository.findActiveCheckinByBookingId(bookingId).ifPresent(log -> {
            // Nobody saw the guest leave: record the booked end as the checkout time and bill no overstay.
            log.setCheckoutAt(booking.getEndAt());
            log.setNote((log.getNote() != null ? log.getNote() + " | " : "")
                    + "Hệ thống tự check-out do quá giờ kết thúc " + checkoutGraceMinutes + " phút");
            checkinLogRepository.save(log);
        });
        BookingStateMachine.transition(booking, BookingStatus.COMPLETED);
        bookingRepository.save(booking);

        // The guest left without settling the tab: the debt stays on the booking for staff to collect.
        long owed = bookingAddonService.unpaidAmount(bookingId);
        notificationService.createNotification(booking.getUserId(),
                "Đơn đặt chỗ đã kết thúc",
                "Đơn " + booking.getBookingCode() + " đã quá giờ kết thúc và được hệ thống tự động check-out. "
                        + "Vui lòng thu dọn đồ dùng cá nhân và liên hệ quầy nếu cần gia hạn."
                        + (owed > 0 ? " Bạn còn " + RefundService.vnd(owed) + " tiền dịch vụ gọi thêm chưa thanh toán, vui lòng thanh toán tại quầy." : ""),
                "BOOKING", booking.getId(), "BOOKING");
        log.info("Auto-checked-out overdue booking {}", booking.getBookingCode());
        return true;
    }

    /**
     * Closes a CONFIRMED booking whose time has fully passed: COMPLETED if it was used at some point
     * (a multi-day pass checked out between visits), otherwise NO_SHOW. A no-show keeps its payment.
     *
     * @return the status the booking was moved to, or null if nothing changed
     */
    @Transactional
    public BookingStatus closeEndedBooking(UUID bookingId, OffsetDateTime now) {
        Booking booking = bookingRepository.findByIdWithLock(bookingId).orElse(null);
        if (booking == null || booking.getStatus() != BookingStatus.CONFIRMED || booking.getEndAt().isAfter(now)) {
            return null;
        }

        boolean wasUsed = checkinLogRepository.existsByBookingId(bookingId);
        BookingStatus target = wasUsed ? BookingStatus.COMPLETED : BookingStatus.NO_SHOW;
        BookingStateMachine.transition(booking, target);
        if (!wasUsed) {
            bookingAddonService.voidUnpaid(booking, null); // nothing was served to a guest who never came
        }
        bookingRepository.save(booking);

        if (!wasUsed) {
            notificationService.createNotification(booking.getUserId(),
                    "Bạn đã bỏ lỡ lượt đặt chỗ",
                    "Đơn " + booking.getBookingCode() + " đã kết thúc mà không có lượt check-in nào. "
                            + "Theo chính sách, đơn không đến sẽ không được hoàn tiền.",
                    "BOOKING", booking.getId(), "BOOKING");
        }
        log.info("Closed ended booking {} as {}", booking.getBookingCode(), target);
        return target;
    }
}
