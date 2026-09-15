package com.cospace.app.service;

import com.cospace.app.entity.BookingStatus;
import com.cospace.app.repository.BookingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

/**
 * Periodically closes bookings whose time is over (see {@link BookingLifecycleService}). Candidates
 * are only ids; each is re-checked under a row lock, so one failure never blocks the rest.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class BookingLifecycleScheduler {

    private final BookingRepository bookingRepository;
    private final BookingLifecycleService lifecycleService;

    @Scheduled(fixedDelayString = "${app.booking.lifecycle-interval-ms:300000}", initialDelay = 60_000)
    public void closeFinishedBookings() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        List<UUID> overdue = bookingRepository.findIdsByStatusAndEndAtBefore(
                BookingStatus.CHECKED_IN, now.minusMinutes(lifecycleService.checkoutGraceMinutes()));
        int checkedOut = 0;
        for (UUID id : overdue) {
            try {
                if (lifecycleService.autoCheckoutOverdue(id, now)) checkedOut++;
            } catch (RuntimeException e) {
                log.error("Failed to auto-checkout booking {}", id, e);
            }
        }

        List<UUID> ended = bookingRepository.findIdsByStatusAndEndAtBefore(BookingStatus.CONFIRMED, now);
        int closed = 0;
        for (UUID id : ended) {
            try {
                if (lifecycleService.closeEndedBooking(id, now) != null) closed++;
            } catch (RuntimeException e) {
                log.error("Failed to close ended booking {}", id, e);
            }
        }

        if (checkedOut > 0 || closed > 0) {
            log.info("Booking lifecycle: {} overdue check-outs, {} ended bookings closed", checkedOut, closed);
        }
    }
}
