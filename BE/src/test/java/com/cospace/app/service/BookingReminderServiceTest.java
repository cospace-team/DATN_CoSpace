package com.cospace.app.service;

import com.cospace.app.entity.Booking;
import com.cospace.app.entity.BookingStatus;
import com.cospace.app.entity.DurationUnit;
import com.cospace.app.repository.BookingRepository;
import com.cospace.app.repository.CheckinLogRepository;
import com.cospace.app.repository.NotificationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookingReminderServiceTest {

    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private CheckinLogRepository checkinLogRepository;
    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private NotificationService notificationService;
    @Mock
    private ReputationService reputationService;

    @InjectMocks
    private BookingReminderService reminderService;

    private final OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

    private Booking booking(OffsetDateTime startAt) {
        Booking b = Booking.builder().id(UUID.randomUUID()).bookingCode("WH-RMD001").userId(UUID.randomUUID())
                .status(BookingStatus.CONFIRMED).unit(DurationUnit.hour).unitCount(2)
                .startAt(startAt).endAt(startAt.plusHours(2)).build();
        when(bookingRepository.findById(b.getId())).thenReturn(Optional.of(b));
        lenient().when(reputationService.checkinDeadline(b)).thenReturn(startAt.plusMinutes(30));
        return b;
    }

    @Test
    void upcomingBookingIsRemindedOnce() {
        Booking b = booking(now.plusMinutes(45));

        assertThat(reminderService.remindUpcoming(b.getId(), now)).isTrue();
        verify(notificationService).createNotification(eq(b.getUserId()), any(), any(),
                eq(BookingReminderService.TYPE_UPCOMING), eq(b.getId()), any());

        when(notificationRepository.existsByReferenceIdAndType(b.getId(), BookingReminderService.TYPE_UPCOMING)).thenReturn(true);
        assertThat(reminderService.remindUpcoming(b.getId(), now)).isFalse();
    }

    @Test
    void bookingFarAheadIsNotRemindedYet() {
        Booking b = booking(now.plusHours(3));

        assertThat(reminderService.remindUpcoming(b.getId(), now)).isFalse();
    }

    @Test
    void startedBookingNotCheckedInGetsCheckinReminder() {
        Booking b = booking(now.minusMinutes(2));

        assertThat(reminderService.remindCheckin(b.getId(), now)).isTrue();
        verify(notificationService).createNotification(eq(b.getUserId()), any(), any(),
                eq(BookingReminderService.TYPE_CHECKIN), eq(b.getId()), any());
    }

    @Test
    void checkedInBookingGetsNoCheckinReminder() {
        Booking b = booking(now.minusMinutes(2));
        when(checkinLogRepository.existsByBookingId(b.getId())).thenReturn(true);

        assertThat(reminderService.remindCheckin(b.getId(), now)).isFalse();
        verify(notificationService, never()).createNotification(any(), any(), any(), any(), any(), any());
    }
}
