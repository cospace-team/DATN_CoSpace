package com.cospace.app.service;

import com.cospace.app.entity.Booking;
import com.cospace.app.entity.BookingStatus;
import com.cospace.app.entity.PaymentStatus;
import com.cospace.app.repository.BookingRepository;
import com.cospace.app.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Releases unpaid bookings whose payment hold has run out.
 *
 * <p>The booking is always re-read under a row lock before anything changes. A payment webhook
 * confirms the booking under that same lock, so without it a run that started before the payment
 * arrived would merge its stale {@code PENDING_PAYMENT} copy back over the confirmed row: the
 * customer's money taken, the booking expired, the slot given away and no refund recorded. Rule #26
 * requires {@code SELECT … FOR UPDATE} on both sides for exactly this reason.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BookingExpiryService {

    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final BookingAddonService bookingAddonService;

    /**
     * Expires one booking if it is still an unpaid hold whose deadline has passed. Runs in its own
     * transaction, so a caller looping over many bookings is never blocked by one failure.
     *
     * @return true if this call expired the booking; false if it was already paid, cancelled or
     *         expired by someone else in the meantime
     */
    @Transactional
    public boolean expire(UUID bookingId, OffsetDateTime now) {
        Booking booking = bookingRepository.findByIdWithLock(bookingId).orElse(null);
        if (booking == null || !isExpiredHold(booking, now)) {
            return false;
        }

        log.info("Expiring booking {} ({})", booking.getId(), booking.getBookingCode());
        BookingStateMachine.transition(booking, BookingStatus.EXPIRED);
        // Add-ons ordered with an unpaid booking will never be served.
        bookingAddonService.voidUnpaid(booking, null);
        bookingRepository.save(booking);

        paymentRepository.findTopByBookingIdAndStatusInOrderByCreatedAtDesc(
                        bookingId, List.of(PaymentStatus.INITIATED, PaymentStatus.PENDING))
                .ifPresent(payment -> {
                    log.info("Expiring pending payment {} for booking {}", payment.getId(), bookingId);
                    payment.setStatus(PaymentStatus.EXPIRED);
                    paymentRepository.save(payment);
                });
        return true;
    }

    /** An unpaid booking whose payment deadline has passed no longer holds its workspace. */
    public static boolean isExpiredHold(Booking booking, OffsetDateTime now) {
        return booking != null
                && booking.getStatus() == BookingStatus.PENDING_PAYMENT
                && booking.getPaymentDeadlineAt() != null
                && !now.isBefore(booking.getPaymentDeadlineAt());
    }
}
