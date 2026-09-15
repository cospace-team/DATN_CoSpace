package com.cospace.app.service;

import com.cospace.app.entity.Booking;
import com.cospace.app.entity.BookingStatus;
import com.cospace.app.entity.PaymentStatus;
import com.cospace.app.repository.BookingRepository;
import com.cospace.app.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class BookingExpiryScheduler {

    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final BookingAddonService bookingAddonService;

    /**
     * Runs every minute to check for and expire bookings that have passed their payment deadline.
     * Each booking is expired in its own transaction so one failure never blocks the rest.
     */
    @Scheduled(fixedRate = 60000) // Run every 60 seconds
    public void expirePendingBookings() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        log.info("Running BookingExpiryScheduler at {}", now);

        List<Booking> expiredBookings = bookingRepository.findAllByStatusAndPaymentDeadlineAtBefore(
                BookingStatus.PENDING_PAYMENT,
                now
        );

        if (expiredBookings.isEmpty()) {
            log.info("No pending bookings to expire.");
            return;
        }

        log.warn("Found {} bookings to expire.", expiredBookings.size());

        int expired = 0;
        for (Booking booking : expiredBookings) {
            try {
                expireSingleBooking(booking);
                expired++;
            } catch (RuntimeException e) {
                log.error("Failed to expire booking {}: {}", booking.getId(), e.getMessage(), e);
            }
        }
        if (expired > 0) {
            log.info("Successfully expired {} bookings.", expired);
        }
    }

    @Transactional
    public void expireSingleBooking(Booking booking) {
        if (booking == null || booking.getStatus() != BookingStatus.PENDING_PAYMENT) {
            return; // already handled by concurrent process
        }

        log.info("Expiring booking with ID: {} and code: {}", booking.getId(), booking.getBookingCode());
        BookingStateMachine.transition(booking, BookingStatus.EXPIRED);
        // Add-ons ordered with an unpaid booking will never be served.
        bookingAddonService.voidUnpaid(booking, null);
        bookingRepository.save(booking);

        // Also expire any initiated or pending payment associated with this booking
        paymentRepository.findTopByBookingIdAndStatusInOrderByCreatedAtDesc(
                booking.getId(), List.of(PaymentStatus.INITIATED, PaymentStatus.PENDING)
        ).ifPresent(payment -> {
            log.info("Expiring pending payment ID: {} for booking: {}", payment.getId(), booking.getId());
            payment.setStatus(PaymentStatus.EXPIRED);
            paymentRepository.save(payment);
        });
    }
}
