package com.example.momosandbox.service;

import com.example.momosandbox.entity.Booking;
import com.example.momosandbox.entity.BookingStatus;
import com.example.momosandbox.entity.PaymentStatus;
import com.example.momosandbox.repository.BookingRepository;
import com.example.momosandbox.repository.PaymentRepository;
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

    /**
     * Runs every minute to check for and expire bookings that have passed their payment deadline.
     * This is a critical business process to release workspaces that were held but not paid for.
     */
    @Scheduled(fixedRate = 60000) // Run every 60 seconds
    @Transactional
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

        for (Booking booking : expiredBookings) {
            log.info("Expiring booking with ID: {} and code: {}", booking.getId(), booking.getBookingCode());
            booking.setStatus(BookingStatus.EXPIRED);
            
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
}
