package com.cospace.app.service;

import com.cospace.app.entity.BookingStatus;
import com.cospace.app.repository.BookingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

/** Sends booking and check-in reminders (see {@link BookingReminderService}) every minute. */
@Component
@RequiredArgsConstructor
@Slf4j
public class BookingReminderScheduler {

    private final BookingRepository bookingRepository;
    private final BookingReminderService reminderService;
    private final ReputationService reputationService;

    @Scheduled(fixedDelayString = "${app.reputation.reminder-interval-ms:60000}", initialDelay = 30_000)
    public void sendReminders() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        int sent = 0;

        for (UUID id : bookingRepository.findIdsByStatusAndStartAtBetween(BookingStatus.CONFIRMED,
                now, now.plusMinutes(reminderService.reminderBeforeMinutes()))) {
            try {
                if (reminderService.remindUpcoming(id, now)) sent++;
            } catch (RuntimeException e) {
                log.error("Failed to send booking reminder for {}", id, e);
            }
        }
        for (UUID id : bookingRepository.findIdsByStatusAndStartAtBetween(BookingStatus.CONFIRMED,
                now.minusMinutes(reputationService.checkinDeadlineMinutes()), now)) {
            try {
                if (reminderService.remindCheckin(id, now)) sent++;
            } catch (RuntimeException e) {
                log.error("Failed to send check-in reminder for {}", id, e);
            }
        }

        if (sent > 0) {
            log.info("Booking reminders: {} sent", sent);
        }
    }
}
