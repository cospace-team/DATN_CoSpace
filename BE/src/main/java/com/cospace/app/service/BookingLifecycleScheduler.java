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
 * Periodically closes bookings whose time is over and penalises missed check-ins (see
 * {@link BookingLifecycleService}). Candidates
 * are only ids; each is re-checked under a row lock, so one failure never blocks the rest.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class BookingLifecycleScheduler {

    private final BookingRepository bookingRepository;
    private final BookingLifecycleService lifecycleService;
    private final ReputationService reputationService;

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

        // Runs before the ended pass so a booking still gets its penalty under the usual message.
        // Only bookings that started in the last day: older ones are settled by the ended pass.
        OffsetDateTime deadline = now.minusMinutes(reputationService.checkinDeadlineMinutes());
        List<UUID> late = bookingRepository.findIdsNotCheckedInStartedBetween(
                BookingStatus.CONFIRMED, deadline.minusDays(1), deadline);
        int penalized = 0;
        for (UUID id : late) {
            try {
                if (lifecycleService.penalizeMissedCheckin(id, now)) penalized++;
            } catch (RuntimeException e) {
                log.error("Failed to apply missed check-in penalty to booking {}", id, e);
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

        if (checkedOut > 0 || closed > 0 || penalized > 0) {
            log.info("Booking lifecycle: {} overdue check-outs, {} missed check-in penalties, {} ended bookings closed",
                    checkedOut, penalized, closed);
        }
    }
}
