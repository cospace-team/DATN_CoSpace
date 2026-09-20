package com.cospace.app.service;

import com.cospace.app.entity.Booking;
import com.cospace.app.entity.BookingStatus;
import com.cospace.app.repository.BookingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

/**
 * Finds unpaid bookings past their payment deadline and hands each one to
 * {@link BookingExpiryService}, which expires it in its own locked transaction. The work is split
 * across two beans on purpose: a {@code @Transactional} method called from the same class runs
 * without a transaction at all, which is how a scheduler run could previously overwrite a booking
 * a webhook had just confirmed.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BookingExpiryScheduler {

    private final BookingRepository bookingRepository;
    private final BookingExpiryService bookingExpiryService;

    /** Runs every 30 seconds; each booking is expired safely so one failure never blocks the rest. */
    @Scheduled(fixedRate = 30000)
    public void expirePendingBookings() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        log.debug("Running BookingExpiryScheduler at {}", now);

        List<Booking> overdue = bookingRepository.findAllByStatusAndPaymentDeadlineAtBefore(
                BookingStatus.PENDING_PAYMENT, now);
        if (overdue.isEmpty()) {
            return;
        }

        int expired = 0;
        for (Booking booking : overdue) {
            try {
                if (bookingExpiryService.expire(booking.getId(), now)) {
                    expired++;
                }
            } catch (RuntimeException e) {
                log.error("Failed to expire booking {}: {}", booking.getId(), e.getMessage(), e);
            }
        }
        if (expired > 0) {
            log.info("Expired {} of {} overdue bookings.", expired, overdue.size());
        }
    }
}
