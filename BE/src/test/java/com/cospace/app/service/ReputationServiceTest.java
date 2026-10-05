package com.cospace.app.service;

import com.cospace.app.entity.Booking;
import com.cospace.app.entity.ReputationEvent;
import com.cospace.app.entity.User;
import com.cospace.app.repository.BookingRepository;
import com.cospace.app.repository.ReputationEventRepository;
import com.cospace.app.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyCollection;
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
    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private AuditLogService auditLogService;

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
    void staffMayOnlyLookUpCustomersOfTheirOwnBranch() {
        UUID branchId = UUID.randomUUID();
        UUID known = UUID.randomUUID();
        UUID stranger = UUID.randomUUID();
        when(bookingRepository.existsByUserIdAndBranchId(known, branchId)).thenReturn(true);
        when(bookingRepository.existsByUserIdAndBranchId(stranger, branchId)).thenReturn(false);

        reputationService.requireCustomerOfBranch(branchId, known);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> reputationService.requireCustomerOfBranch(branchId, stranger))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
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
    void penaltyAtNoShowCloseIsOneMissedBookingNotification() {
        User u = customer(100);
        Booking b = bookingOf(u);

        assertThat(reputationService.penalizeMissedCheckin(b, true)).isTrue();

        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        verify(notificationService).createNotification(eq(u.getId()), eq("Bạn đã bỏ lỡ lượt đặt chỗ"), body.capture(),
                any(), eq(b.getId()), any());
        assertThat(body.getValue()).contains("trừ 10 điểm uy tín").contains("không được hoàn tiền");
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

    private final OffsetDateTime start = OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(5);

    @Test
    void onTimeCheckinGivesPointsBack() {
        User u = customer(80);
        Booking b = bookingOf(u);
        b.setStartAt(start);

        assertThat(reputationService.rewardOnTimeCheckin(b, start.plusMinutes(10))).isTrue();

        assertThat(u.getReputationScore()).isEqualTo(82);
    }

    @Test
    void lateCheckinEarnsNothing() {
        Booking b = Booking.builder().id(UUID.randomUUID()).userId(UUID.randomUUID()).startAt(start).build();

        assertThat(reputationService.rewardOnTimeCheckin(b, start.plusMinutes(31))).isFalse();
        verify(userRepository, never()).findByIdWithLock(any());
    }

    @Test
    void fullScoreEarnsNothing() {
        User u = customer(100);
        Booking b = bookingOf(u);
        b.setStartAt(start);

        assertThat(reputationService.rewardOnTimeCheckin(b, start)).isFalse();
        verify(reputationEventRepository, never()).save(any());
    }

    @Test
    void revertGivesPenaltyBackOnceAndIsAudited() {
        User u = customer(70);
        Booking b = bookingOf(u);
        when(bookingRepository.findByIdWithLock(b.getId())).thenReturn(Optional.of(b));
        when(reputationEventRepository.findByBookingIdAndReason(b.getId(), ReputationEvent.REASON_MISSED_CHECKIN))
                .thenReturn(Optional.of(ReputationEvent.builder().userId(u.getId()).bookingId(b.getId()).delta(-10).build()));

        assertThat(reputationService.revertMissedCheckinPenalty(UUID.randomUUID(), b.getId(), "Khách đã đến, quên quét mã"))
                .isEqualTo(u.getId());

        assertThat(u.getReputationScore()).isEqualTo(80);
        verify(auditLogService).log(any(), eq("REPUTATION_PENALTY_REVERTED"), any(), eq(u.getId()), any(), any(), any(), any());
    }

    @Test
    void revertRefusedWhenAlreadyReverted() {
        Booking b = Booking.builder().id(UUID.randomUUID()).bookingCode("WH-REP002").userId(UUID.randomUUID()).build();
        when(bookingRepository.findByIdWithLock(b.getId())).thenReturn(Optional.of(b));
        when(reputationEventRepository.findByBookingIdAndReason(b.getId(), ReputationEvent.REASON_MISSED_CHECKIN))
                .thenReturn(Optional.of(ReputationEvent.builder().userId(b.getUserId()).delta(-10).build()));
        when(reputationEventRepository.existsByBookingIdAndReason(b.getId(), ReputationEvent.REASON_PENALTY_REVERTED))
                .thenReturn(true);

        assertThatThrownBy(() -> reputationService.revertMissedCheckinPenalty(UUID.randomUUID(), b.getId(), "lý do"))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void revertRequiresReason() {
        assertThatThrownBy(() -> reputationService.revertMissedCheckinPenalty(UUID.randomUUID(), UUID.randomUUID(), " "))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private User storedCustomer(int score) {
        User u = User.builder().id(UUID.randomUUID()).role(User.Role.customer).reputationScore(score).build();
        when(userRepository.findById(u.getId())).thenReturn(Optional.of(u));
        return u;
    }

    @Test
    void goodScoreBooksFreely() {
        User u = storedCustomer(60);

        reputationService.requireCanBookOnline(u.getId());
        verify(bookingRepository, never()).countByUserIdAndStatusIn(any(), anyCollection());
    }

    @Test
    void limitedScoreMayHoldOnlyOneUnusedBooking() {
        User u = storedCustomer(45);
        when(bookingRepository.countByUserIdAndStatusIn(eq(u.getId()), anyCollection())).thenReturn(0L, 1L);

        reputationService.requireCanBookOnline(u.getId()); // first booking is fine
        assertThatThrownBy(() -> reputationService.requireCanBookOnline(u.getId()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("1 đơn");
    }

    @Test
    void blockedScoreCannotBookOnline() {
        User u = storedCustomer(20);

        assertThatThrownBy(() -> reputationService.requireCanBookOnline(u.getId()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("tại quầy");
    }
}
