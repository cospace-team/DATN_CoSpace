package com.cospace.app.service;

import com.cospace.app.entity.Booking;
import com.cospace.app.entity.BookingStatus;
import com.cospace.app.entity.CheckinLog;
import com.cospace.app.entity.DurationUnit;
import com.cospace.app.repository.BookingRepository;
import com.cospace.app.repository.CheckinLogRepository;
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
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookingLifecycleServiceTest {

    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private CheckinLogRepository checkinLogRepository;
    @Mock
    private NotificationService notificationService;
    @Mock
    private BookingAddonService bookingAddonService;
    @Mock
    private ReputationService reputationService;

    @InjectMocks
    private BookingLifecycleService lifecycleService;

    private final OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

    private Booking booking(BookingStatus status, OffsetDateTime endAt) {
        Booking b = Booking.builder().id(UUID.randomUUID()).bookingCode("WH-ABC234").userId(UUID.randomUUID())
                .status(status).startAt(endAt.minusHours(2)).endAt(endAt).build();
        when(bookingRepository.findByIdWithLock(b.getId())).thenReturn(Optional.of(b));
        return b;
    }

    @Test
    void overdueGuestIsCheckedOutAtBookedEnd() {
        Booking b = booking(BookingStatus.CHECKED_IN, now.minusHours(3));
        CheckinLog log = CheckinLog.builder().id(UUID.randomUUID()).bookingId(b.getId()).checkinAt(now.minusHours(3)).build();
        when(checkinLogRepository.findActiveCheckinByBookingId(b.getId())).thenReturn(Optional.of(log));

        assertThat(lifecycleService.autoCheckoutOverdue(b.getId(), now)).isTrue();

        assertThat(b.getStatus()).isEqualTo(BookingStatus.COMPLETED);
        assertThat(log.getCheckoutAt()).isEqualTo(b.getEndAt());
        verify(notificationService).createNotification(any(), any(), any(), any(), any(), any());
    }

    @Test
    void guestWithinGracePeriodIsLeftAlone() {
        // Past the late check-out grace but not the auto check-out window: staff bill the late fee.
        Booking b = booking(BookingStatus.CHECKED_IN, now.minusMinutes(40));

        assertThat(lifecycleService.autoCheckoutOverdue(b.getId(), now)).isFalse();

        assertThat(b.getStatus()).isEqualTo(BookingStatus.CHECKED_IN);
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void bookingAlreadyCheckedOutByStaffIsSkipped() {
        Booking b = booking(BookingStatus.COMPLETED, now.minusHours(1));

        assertThat(lifecycleService.autoCheckoutOverdue(b.getId(), now)).isFalse();
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void endedBookingNeverCheckedInBecomesNoShow() {
        Booking b = booking(BookingStatus.CONFIRMED, now.minusMinutes(1));
        when(checkinLogRepository.existsByBookingId(b.getId())).thenReturn(false);

        assertThat(lifecycleService.closeEndedBooking(b.getId(), now)).isEqualTo(BookingStatus.NO_SHOW);
        assertThat(b.getStatus()).isEqualTo(BookingStatus.NO_SHOW);
        verify(bookingAddonService).voidUnpaid(b, null);
        verify(reputationService).penalizeMissedCheckin(b, true);
    }

    @Test
    void noShowPenalizedAtCloseGetsOnlyThePenaltyNotification() {
        Booking b = booking(BookingStatus.CONFIRMED, now.minusMinutes(1));
        when(checkinLogRepository.existsByBookingId(b.getId())).thenReturn(false);
        when(reputationService.penalizeMissedCheckin(b, true)).thenReturn(true);

        lifecycleService.closeEndedBooking(b.getId(), now);

        // The penalty notification already says the booking was missed.
        verify(notificationService, never()).createNotification(any(), any(), any(), any(), any(), any());
    }

    @Test
    void noShowAlreadyPenalizedAtDeadlineIsNotNotifiedAgain() {
        Booking b = booking(BookingStatus.CONFIRMED, now.minusMinutes(1));
        when(checkinLogRepository.existsByBookingId(b.getId())).thenReturn(false);
        when(reputationService.hasMissedCheckinPenalty(b.getId())).thenReturn(true);

        assertThat(lifecycleService.closeEndedBooking(b.getId(), now)).isEqualTo(BookingStatus.NO_SHOW);

        verify(reputationService, never()).penalizeMissedCheckin(any(), anyBoolean());
        verify(notificationService, never()).createNotification(any(), any(), any(), any(), any(), any());
    }

    @Test
    void noShowWithoutPenaltyStillTellsTheCustomer() {
        Booking b = booking(BookingStatus.CONFIRMED, now.minusMinutes(1));
        when(checkinLogRepository.existsByBookingId(b.getId())).thenReturn(false);

        lifecycleService.closeEndedBooking(b.getId(), now);

        verify(notificationService).createNotification(eq(b.getUserId()), eq("Bạn đã bỏ lỡ lượt đặt chỗ"), any(), any(), eq(b.getId()), any());
    }

    @Test
    void endedMultiDayPassThatWasUsedBecomesCompleted() {
        Booking b = booking(BookingStatus.CONFIRMED, now.minusMinutes(1));
        when(checkinLogRepository.existsByBookingId(b.getId())).thenReturn(true);

        assertThat(lifecycleService.closeEndedBooking(b.getId(), now)).isEqualTo(BookingStatus.COMPLETED);
        verify(notificationService, never()).createNotification(any(), any(), any(), any(), any(), any());
        verify(reputationService, never()).penalizeMissedCheckin(any(), anyBoolean());
    }

    private Booking startedBooking(BookingStatus status, OffsetDateTime startAt, DurationUnit unit) {
        Booking b = Booking.builder().id(UUID.randomUUID()).bookingCode("WH-LATE01").userId(UUID.randomUUID())
                .status(status).unit(unit).startAt(startAt).endAt(startAt.plusHours(3)).build();
        when(bookingRepository.findByIdWithLock(b.getId())).thenReturn(Optional.of(b));
        return b;
    }

    @Test
    void bookingNotCheckedInPastDeadlineIsPenalized() {
        when(reputationService.checkinDeadlineMinutes()).thenReturn(30L);
        Booking b = startedBooking(BookingStatus.CONFIRMED, now.minusMinutes(31), DurationUnit.hour);
        when(checkinLogRepository.existsByBookingId(b.getId())).thenReturn(false);
        when(reputationService.penalizeMissedCheckin(b)).thenReturn(true);

        assertThat(lifecycleService.penalizeMissedCheckin(b.getId(), now)).isTrue();
        // The booking stays usable: the guest may still turn up late.
        assertThat(b.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
    }

    @Test
    void bookingStillWithinDeadlineIsNotPenalized() {
        when(reputationService.checkinDeadlineMinutes()).thenReturn(30L);
        Booking b = startedBooking(BookingStatus.CONFIRMED, now.minusMinutes(10), DurationUnit.hour);

        assertThat(lifecycleService.penalizeMissedCheckin(b.getId(), now)).isFalse();
        verify(reputationService, never()).penalizeMissedCheckin(any());
    }

    @Test
    void checkedInOrCancelledBookingIsNotPenalized() {
        Booking checkedIn = startedBooking(BookingStatus.CHECKED_IN, now.minusHours(1), DurationUnit.hour);
        Booking cancelled = startedBooking(BookingStatus.CANCELLED, now.minusHours(1), DurationUnit.hour);

        assertThat(lifecycleService.penalizeMissedCheckin(checkedIn.getId(), now)).isFalse();
        assertThat(lifecycleService.penalizeMissedCheckin(cancelled.getId(), now)).isFalse();
        verify(reputationService, never()).penalizeMissedCheckin(any());
    }

    @Test
    void multiDayPassIsExemptFromCheckinDeadline() {
        Booking b = startedBooking(BookingStatus.CONFIRMED, now.minusHours(5), DurationUnit.week);

        assertThat(lifecycleService.penalizeMissedCheckin(b.getId(), now)).isFalse();
        verify(reputationService, never()).penalizeMissedCheckin(any());
    }
}
