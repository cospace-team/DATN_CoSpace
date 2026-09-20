package com.cospace.app.service;

import com.cospace.app.entity.Booking;
import com.cospace.app.entity.BookingCancellation;
import com.cospace.app.entity.BookingStatus;
import com.cospace.app.entity.CancellationPolicy;
import com.cospace.app.repository.BookingCancellationRepository;
import com.cospace.app.repository.BookingRepository;
import com.cospace.app.repository.CancellationPolicyRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CancellationServiceTest {

    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private BookingCancellationRepository cancellationRepository;
    @Mock
    private CancellationPolicyRepository policyRepository;
    @Mock
    private NotificationService notificationService;
    @Mock
    private RefundService refundService;
    @Mock
    private BookingAddonService bookingAddonService;

    @InjectMocks
    private CancellationService cancellationService;

    private final UUID userId = UUID.randomUUID();
    private final UUID branchId = UUID.randomUUID();

    private Booking booking(BookingStatus status, long totalAmount, OffsetDateTime startAt) {
        return Booking.builder()
                .id(UUID.randomUUID())
                .bookingCode("WH-TEST01")
                .userId(userId)
                .branchId(branchId)
                .status(status)
                .startAt(startAt)
                .endAt(startAt.plusHours(2))
                .totalAmount(totalAmount)
                .build();
    }

    private CancellationPolicy policy(UUID policyBranchId, int min, int max, int refundPercent) {
        return CancellationPolicy.builder()
                .id(UUID.randomUUID())
                .name("policy-" + refundPercent)
                .ruleType("hours_before")
                .minValue(min)
                .maxValue(max)
                .refundPercent(BigDecimal.valueOf(refundPercent))
                .branchId(policyBranchId)
                .build();
    }

    private void givenBookingIsCancellable(Booking booking) {
        when(bookingRepository.findByIdWithLock(booking.getId())).thenReturn(Optional.of(booking));
        when(cancellationRepository.findByBookingId(booking.getId())).thenReturn(Optional.empty());
        when(cancellationRepository.save(any(BookingCancellation.class))).thenAnswer(inv -> inv.getArgument(0));
        // Unless a test says otherwise, the customer paid the full amount.
        org.mockito.Mockito.lenient().when(refundService.refundableAmount(booking.getId())).thenReturn(booking.getTotalAmount());
    }

    private static OffsetDateTime hoursFromNow(long hours) {
        return OffsetDateTime.now(ZoneOffset.UTC).plusHours(hours);
    }

    @Test
    void rejectsUnknownBooking() {
        UUID bookingId = UUID.randomUUID();
        when(bookingRepository.findByIdWithLock(bookingId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> cancellationService.cancelBooking(userId, bookingId, null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsCancellingSomeoneElsesBooking() {
        Booking booking = booking(BookingStatus.CONFIRMED, 100_000L, hoursFromNow(48));
        when(bookingRepository.findByIdWithLock(booking.getId())).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> cancellationService.cancelBooking(UUID.randomUUID(), booking.getId(), null))
                .isInstanceOf(IllegalArgumentException.class);

        assertThat(booking.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void rejectsBookingThatIsAlreadyCheckedIn() {
        Booking booking = booking(BookingStatus.CHECKED_IN, 100_000L, hoursFromNow(-1));
        when(bookingRepository.findByIdWithLock(booking.getId())).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> cancellationService.cancelBooking(userId, booking.getId(), null))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void rejectsSecondCancellationOfSameBooking() {
        Booking booking = booking(BookingStatus.CONFIRMED, 100_000L, hoursFromNow(48));
        when(bookingRepository.findByIdWithLock(booking.getId())).thenReturn(Optional.of(booking));
        when(cancellationRepository.findByBookingId(booking.getId()))
                .thenReturn(Optional.of(BookingCancellation.builder().build()));

        assertThatThrownBy(() -> cancellationService.cancelBooking(userId, booking.getId(), null))
                .isInstanceOf(IllegalStateException.class);
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void pendingPaymentBookingIsCancelledWithoutRefund() {
        Booking booking = booking(BookingStatus.PENDING_PAYMENT, 200_000L, hoursFromNow(48));
        givenBookingIsCancellable(booking);

        BookingCancellation result = cancellationService.cancelBooking(userId, booking.getId(), "đổi lịch");

        assertThat(booking.getStatus()).isEqualTo(BookingStatus.CANCELLED);
        assertThat(result.getRefundPercent()).isZero();
        assertThat(result.getRefundAmount()).isZero();
        assertThat(result.getPenaltyAmount()).isEqualTo(200_000L);
        assertThat(result.getRefundStatus()).isEqualTo("processed");
        assertThat(result.getProcessedAt()).isNotNull();
        assertThat(result.getReason()).isEqualTo("đổi lịch");
        assertThat(result.getAppliedRuleJson()).containsEntry("policy_name", "PENDING_PAYMENT_CANCEL");
        verify(policyRepository, never()).findByBranchIdIsNullAndIsActiveTrueOrderByPriorityDesc();
    }

    @Test
    void confirmedBookingGetsRefundFromMatchingPolicy() {
        Booking booking = booking(BookingStatus.CONFIRMED, 400_000L, hoursFromNow(72));
        givenBookingIsCancellable(booking);
        when(policyRepository.findByBranchIdIsNullAndIsActiveTrueOrderByPriorityDesc())
                .thenReturn(List.of(policy(null, 0, 23, 0), policy(null, 24, 100_000, 100)));

        BookingCancellation result = cancellationService.cancelBooking(userId, booking.getId(), null);

        assertThat(booking.getStatus()).isEqualTo(BookingStatus.CANCELLED);
        assertThat(result.getRefundPercent()).isEqualTo(100);
        assertThat(result.getRefundAmount()).isEqualTo(400_000L);
        assertThat(result.getPenaltyAmount()).isZero();
        assertThat(result.getRefundStatus()).isEqualTo("pending");
        assertThat(result.getProcessedAt()).isNull();
        assertThat(result.getReason()).isEqualTo("Khách hàng yêu cầu hủy");
        verify(refundService).requestRefund(eq(booking), eq(null), eq(400_000L),
                eq(com.cospace.app.entity.Refund.REASON_CANCELLATION), anyString());
        verify(refundService).cancelOpenPayments(booking.getId());
    }

    @Test
    void refundNeverExceedsWhatWasActuallyPaid() {
        Booking booking = booking(BookingStatus.CONFIRMED, 400_000L, hoursFromNow(72));
        givenBookingIsCancellable(booking);
        when(refundService.refundableAmount(booking.getId())).thenReturn(250_000L); // e.g. an unpaid running tab
        when(policyRepository.findByBranchIdIsNullAndIsActiveTrueOrderByPriorityDesc())
                .thenReturn(List.of(policy(null, 0, 100_000, 100)));

        BookingCancellation result = cancellationService.cancelBooking(userId, booking.getId(), null);

        assertThat(result.getRefundAmount()).isEqualTo(250_000L);
        assertThat(result.getRefundAmount() + result.getPenaltyAmount()).isEqualTo(400_000L);
    }

    @Test
    void maintenanceCancelsConfirmedBookingWithFullRefundAndNotifies() {
        Booking booking = booking(BookingStatus.CONFIRMED, 300_000L, hoursFromNow(5));
        when(cancellationRepository.findByBookingId(booking.getId())).thenReturn(Optional.empty());
        when(refundService.refundableAmount(booking.getId())).thenReturn(300_000L);
        org.mockito.ArgumentCaptor<BookingCancellation> captor = org.mockito.ArgumentCaptor.forClass(BookingCancellation.class);

        cancellationService.cancelForMaintenance(booking, "Hỏng điều hòa");

        assertThat(booking.getStatus()).isEqualTo(BookingStatus.CANCELLED);
        verify(cancellationRepository).save(captor.capture());
        assertThat(captor.getValue().getRefundAmount()).isEqualTo(300_000L);
        assertThat(captor.getValue().getPenaltyAmount()).isZero();
        verify(refundService).requestRefund(eq(booking), eq(null), eq(300_000L),
                eq(com.cospace.app.entity.Refund.REASON_MAINTENANCE), anyString());
        verify(notificationService).createNotification(eq(userId), anyString(), anyString(), anyString(), eq(booking.getId()), anyString());
    }

    @Test
    void maintenanceCutRefundsOnlyTheLostShareOfTime() {
        OffsetDateTime start = hoursFromNow(-1);
        Booking booking = booking(BookingStatus.CHECKED_IN, 400_000L, start); // 2h booking, started 1h ago
        when(refundService.refundableAmount(booking.getId())).thenReturn(400_000L);

        long refunded = cancellationService.refundTimeLostToMaintenance(booking, start.plusMinutes(90), booking.getEndAt(), null);

        assertThat(refunded).isEqualTo(100_000L); // last 30 of 120 minutes
        verify(refundService).requestRefund(eq(booking), eq(null), eq(100_000L),
                eq(com.cospace.app.entity.Refund.REASON_MAINTENANCE), anyString());
    }

    @Test
    void policyPercentAppliesToRentalWhilePaidAddonsAreReturnedInFull() {
        Booking booking = booking(BookingStatus.CONFIRMED, 450_000L, hoursFromNow(10)); // 400k rental + 50k add-ons paid
        booking.setAddonAmount(50_000L);
        givenBookingIsCancellable(booking);
        when(policyRepository.findByBranchIdIsNullAndIsActiveTrueOrderByPriorityDesc())
                .thenReturn(List.of(policy(null, 0, 100_000, 50)));

        BookingCancellation result = cancellationService.cancelBooking(userId, booking.getId(), null);

        assertThat(result.getRefundAmount()).isEqualTo(250_000L); // 50% of 400k + 50k
        assertThat(result.getRefundAmount() + result.getPenaltyAmount()).isEqualTo(450_000L);
        verify(bookingAddonService).voidUnpaid(booking, userId);
    }

    @Test
    void unpaidTabIsDroppedBeforeTheRefundIsComputed() {
        Booking booking = booking(BookingStatus.CONFIRMED, 330_000L, hoursFromNow(48)); // 300k rental + 30k unpaid tab
        booking.setAddonAmount(30_000L);
        givenBookingIsCancellable(booking);
        when(refundService.refundableAmount(booking.getId())).thenReturn(300_000L);
        when(bookingAddonService.voidUnpaid(booking, userId)).thenAnswer(inv -> {
            booking.setAddonAmount(0);
            booking.setTotalAmount(300_000L);
            return 30_000L;
        });
        when(policyRepository.findByBranchIdIsNullAndIsActiveTrueOrderByPriorityDesc())
                .thenReturn(List.of(policy(null, 0, 100_000, 100)));

        BookingCancellation result = cancellationService.cancelBooking(userId, booking.getId(), null);

        assertThat(result.getRefundAmount()).isEqualTo(300_000L);
        assertThat(result.getPenaltyAmount()).isZero();
    }

    @Test
    void maintenanceCutDoesNotRefundConsumedAddons() {
        OffsetDateTime start = hoursFromNow(-1);
        Booking booking = booking(BookingStatus.CHECKED_IN, 460_000L, start); // 400k rental + 60k add-ons
        booking.setAddonAmount(60_000L);
        when(refundService.refundableAmount(booking.getId())).thenReturn(460_000L);

        // Maintenance starts now, so the refunded window is the hour left of a two-hour booking:
        // half the 400k rental, none of the 60k of add-ons already served. The exact figure moves by
        // milliseconds because the service reads the clock itself.
        assertThat(cancellationService.refundTimeLostToMaintenance(booking, start.plusMinutes(60), booking.getEndAt(), null))
                .isBetween(199_900L, 200_000L);
    }

    @Test
    void branchPolicyIsPreferredOverGlobalPolicy() {
        Booking booking = booking(BookingStatus.CONFIRMED, 100_000L, hoursFromNow(10));
        givenBookingIsCancellable(booking);
        when(policyRepository.findByBranchIdAndIsActiveTrueOrderByPriorityDesc(branchId))
                .thenReturn(List.of(policy(branchId, 0, 100_000, 50)));
        org.mockito.Mockito.lenient().when(policyRepository.findByBranchIdIsNullAndIsActiveTrueOrderByPriorityDesc())
                .thenReturn(List.of(policy(null, 0, 100_000, 100)));

        BookingCancellation result = cancellationService.cancelBooking(userId, booking.getId(), null);

        assertThat(result.getRefundPercent()).isEqualTo(50);
        verify(policyRepository, never()).findByBranchIdIsNullAndIsActiveTrueOrderByPriorityDesc();
    }

    @Test
    void policiesWithOtherRuleTypesAreIgnored() {
        Booking booking = booking(BookingStatus.CONFIRMED, 100_000L, hoursFromNow(48));
        givenBookingIsCancellable(booking);
        CancellationPolicy otherRule = policy(null, 0, 100_000, 100);
        otherRule.setRuleType("days_before");
        when(policyRepository.findByBranchIdIsNullAndIsActiveTrueOrderByPriorityDesc())
                .thenReturn(List.of(otherRule));

        BookingCancellation result = cancellationService.cancelBooking(userId, booking.getId(), null);

        assertThat(result.getRefundPercent()).isZero();
        assertThat(result.getAppliedRuleJson()).containsEntry("policy_name", "DEFAULT_NO_REFUND");
    }

    @Test
    void bookingThatHasAlreadyStartedCannotBeCancelled() {
        // A paid booking whose time has come is a no-show, not a refund: before this rule a grace
        // period measured from the order time still refunded 100% hours into the booking.
        Booking started = booking(BookingStatus.CONFIRMED, 100_000L, hoursFromNow(-1));
        started.setCreatedAt(OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(30));
        when(bookingRepository.findByIdWithLock(started.getId())).thenReturn(Optional.of(started));
        when(cancellationRepository.findByBookingId(started.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> cancellationService.cancelBooking(userId, started.getId(), null))
                .isInstanceOf(IllegalStateException.class);

        assertThat(started.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
        verify(bookingRepository, never()).save(any());
        verify(refundService, never()).requestRefund(any(), any(), anyLong(), any(), any());
    }

    @Test
    void unpaidHoldCanStillBeCancelledAfterItsStartTime() {
        Booking started = booking(BookingStatus.PENDING_PAYMENT, 100_000L, hoursFromNow(-1));
        givenBookingIsCancellable(started);

        BookingCancellation result = cancellationService.cancelBooking(userId, started.getId(), null);

        assertThat(started.getStatus()).isEqualTo(BookingStatus.CANCELLED);
        assertThat(result.getRefundAmount()).isZero();
    }

    @Test
    void staffCanCancelForACustomerAfterTheBookingHasStarted() {
        // The counter's way out of the cases rule Q1 closed for the customer.
        Booking started = booking(BookingStatus.CONFIRMED, 200_000L, hoursFromNow(-1));
        givenBookingIsCancellable(started);
        when(policyRepository.findByBranchIdIsNullAndIsActiveTrueOrderByPriorityDesc())
                .thenReturn(List.of(policy(null, 0, 24, 50)));
        UUID staffId = UUID.randomUUID();

        BookingCancellation result = cancellationService.cancelByStaff(staffId, started.getId(), "Khách báo ốm", false);

        assertThat(started.getStatus()).isEqualTo(BookingStatus.CANCELLED);
        assertThat(result.getRefundPercent()).isEqualTo(50);
        assertThat(result.getReason()).isEqualTo("Khách báo ốm");
        // The record stays attached to the customer, with the staff member noted in the snapshot.
        assertThat(result.getUserId()).isEqualTo(userId);
        assertThat(result.getAppliedRuleJson()).containsEntry("cancelled_by_staff_id", staffId.toString());
    }

    @Test
    void staffCancellationRequiresAReason() {
        Booking booking = booking(BookingStatus.CONFIRMED, 200_000L, hoursFromNow(10));

        assertThatThrownBy(() -> cancellationService.cancelByStaff(UUID.randomUUID(), booking.getId(), "  ", false))
                .isInstanceOf(IllegalArgumentException.class);

        verify(bookingRepository, never()).save(any());
    }

    @Test
    void waivingThePenaltyReturnsEverythingTheCustomerPaid() {
        Booking booking = booking(BookingStatus.CONFIRMED, 300_000L, hoursFromNow(1));
        givenBookingIsCancellable(booking);

        BookingCancellation result = cancellationService.cancelByStaff(
                UUID.randomUUID(), booking.getId(), "Phòng hỏng máy lạnh, lỗi của chi nhánh", true);

        assertThat(result.getRefundPercent()).isEqualTo(100);
        assertThat(result.getRefundAmount()).isEqualTo(300_000L);
        assertThat(result.getPenaltyAmount()).isZero();
        assertThat(result.getAppliedRuleJson()).containsEntry("policy_name", "STAFF_WAIVED_PENALTY");
        // No policy lookup is needed when the branch takes the blame.
        verify(policyRepository, never()).findByBranchIdIsNullAndIsActiveTrueOrderByPriorityDesc();
    }

    @Test
    void staffStillCannotCancelABookingInUse() {
        Booking inUse = booking(BookingStatus.CHECKED_IN, 200_000L, hoursFromNow(-1));
        when(bookingRepository.findByIdWithLock(inUse.getId())).thenReturn(Optional.of(inUse));

        assertThatThrownBy(() -> cancellationService.cancelByStaff(UUID.randomUUID(), inUse.getId(), "Khách đổi ý", false))
                .isInstanceOf(IllegalStateException.class);

        assertThat(inUse.getStatus()).isEqualTo(BookingStatus.CHECKED_IN);
    }

    @Test
    void policyWindowIsHalfOpenAndMeasuredInMinutes() {
        // "Hủy trước 24 giờ" must cover 24:00 exactly and stop covering 23:59.
        Booking justInside = booking(BookingStatus.CONFIRMED, 100_000L, hoursFromNow(24).plusMinutes(1));
        givenBookingIsCancellable(justInside);
        when(policyRepository.findByBranchIdIsNullAndIsActiveTrueOrderByPriorityDesc())
                .thenReturn(List.of(policy(null, 24, 999, 80)));

        assertThat(cancellationService.cancelBooking(userId, justInside.getId(), null).getRefundPercent())
                .isEqualTo(80);

        Booking justOutside = booking(BookingStatus.CONFIRMED, 100_000L, hoursFromNow(23).plusMinutes(59));
        givenBookingIsCancellable(justOutside);

        assertThat(cancellationService.cancelBooking(userId, justOutside.getId(), null).getRefundPercent())
                .isZero();
    }

    @Test
    void graceWindowEndsExactlyOnTheHourNotFiftyNineMinutesLater() {
        Booking booking = booking(BookingStatus.CONFIRMED, 200_000L, hoursFromNow(48));
        booking.setCreatedAt(OffsetDateTime.now(ZoneOffset.UTC).minusHours(2).minusMinutes(30));
        givenBookingIsCancellable(booking);
        when(policyRepository.findByBranchIdIsNullAndIsActiveTrueOrderByPriorityDesc())
                .thenReturn(List.of(CancellationPolicy.builder()
                        .id(UUID.randomUUID()).name("grace-2h").ruleType("GRACE_HOURS")
                        .minValue(0).maxValue(2).refundPercent(BigDecimal.valueOf(100)).build()));

        // 2 hours 30 minutes after ordering: outside a two-hour grace period.
        assertThat(cancellationService.cancelBooking(userId, booking.getId(), null).getRefundPercent()).isZero();
    }

    @Test
    void noMatchingPolicyMeansNoRefund() {
        Booking booking = booking(BookingStatus.CONFIRMED, 150_000L, hoursFromNow(2));
        givenBookingIsCancellable(booking);
        when(policyRepository.findByBranchIdIsNullAndIsActiveTrueOrderByPriorityDesc())
                .thenReturn(List.of(policy(null, 24, 100_000, 100)));

        BookingCancellation result = cancellationService.cancelBooking(userId, booking.getId(), null);

        assertThat(result.getRefundAmount()).isZero();
        assertThat(result.getPenaltyAmount()).isEqualTo(150_000L);
        assertThat(result.getAppliedRuleJson()).containsEntry("policy_name", "DEFAULT_NO_REFUND");
    }

    @Test
    void refundPlusPenaltyAlwaysEqualsTotalAmount() {
        Booking booking = booking(BookingStatus.CONFIRMED, 333_333L, hoursFromNow(48));
        givenBookingIsCancellable(booking);
        when(policyRepository.findByBranchIdIsNullAndIsActiveTrueOrderByPriorityDesc())
                .thenReturn(List.of(policy(null, 0, 100_000, 50)));

        BookingCancellation result = cancellationService.cancelBooking(userId, booking.getId(), null);

        assertThat(result.getRefundAmount() + result.getPenaltyAmount()).isEqualTo(333_333L);
        assertThat(result.getRefundAmount()).isEqualTo(166_666L);
    }

    @Test
    void notifiesCustomerAfterCancellation() {
        Booking booking = booking(BookingStatus.PENDING_PAYMENT, 100_000L, hoursFromNow(48));
        givenBookingIsCancellable(booking);

        cancellationService.cancelBooking(userId, booking.getId(), null);

        verify(notificationService).createNotification(
                eq(userId), anyString(), anyString(), eq("BOOKING"), eq(booking.getId()), eq("BOOKING"));
    }
}
