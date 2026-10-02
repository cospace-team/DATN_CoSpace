package com.cospace.app.service;

import com.cospace.app.entity.Booking;
import com.cospace.app.entity.ReputationEvent;
import com.cospace.app.entity.User;
import com.cospace.app.repository.ReputationEventRepository;
import com.cospace.app.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReputationServiceTest {

    @Mock
    private ReputationEventRepository reputationEventRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private ReputationService reputationService;

    private User customer(int score) {
        User u = User.builder().id(UUID.randomUUID()).role(User.Role.customer).reputationScore(score).build();
        when(userRepository.findByIdWithLock(u.getId())).thenReturn(Optional.of(u));
        return u;
    }

    private Booking bookingOf(User u) {
        return Booking.builder().id(UUID.randomUUID()).bookingCode("WH-REP001").userId(u.getId()).build();
    }

    @Test
    void missedCheckinDeductsPointsAndLogsEvent() {
        User u = customer(100);
        Booking b = bookingOf(u);

        assertThat(reputationService.penalizeMissedCheckin(b)).isTrue();

        assertThat(u.getReputationScore()).isEqualTo(90);
        ArgumentCaptor<ReputationEvent> event = ArgumentCaptor.forClass(ReputationEvent.class);
        verify(reputationEventRepository).save(event.capture());
        assertThat(event.getValue().getDelta()).isEqualTo(-10);
        assertThat(event.getValue().getScoreAfter()).isEqualTo(90);
        assertThat(event.getValue().getReason()).isEqualTo(ReputationEvent.REASON_MISSED_CHECKIN);
        verify(notificationService).createNotification(eq(u.getId()), any(), any(), any(), eq(b.getId()), any());
    }

    @Test
    void scoreNeverDropsBelowZero() {
        User u = customer(4);

        assertThat(reputationService.penalizeMissedCheckin(bookingOf(u))).isTrue();

        assertThat(u.getReputationScore()).isZero();
    }

    @Test
    void bookingIsPenalizedOnlyOnce() {
        Booking b = Booking.builder().id(UUID.randomUUID()).userId(UUID.randomUUID()).build();
        when(reputationEventRepository.existsByBookingIdAndReason(b.getId(), ReputationEvent.REASON_MISSED_CHECKIN))
                .thenReturn(true);

        assertThat(reputationService.penalizeMissedCheckin(b)).isFalse();
        verify(userRepository, never()).save(any());
        verify(reputationEventRepository, never()).save(any());
    }

    @Test
    void nonCustomerAccountsAreNotPenalized() {
        User staff = User.builder().id(UUID.randomUUID()).role(User.Role.staff).reputationScore(100).build();
        when(userRepository.findByIdWithLock(staff.getId())).thenReturn(Optional.of(staff));

        assertThat(reputationService.penalizeMissedCheckin(bookingOf(staff))).isFalse();
        assertThat(staff.getReputationScore()).isEqualTo(100);
    }
}
