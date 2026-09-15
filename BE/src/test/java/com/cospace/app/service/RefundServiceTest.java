package com.cospace.app.service;

import com.cospace.app.entity.Booking;
import com.cospace.app.entity.BookingCancellation;
import com.cospace.app.entity.BookingStatus;
import com.cospace.app.entity.Payment;
import com.cospace.app.entity.PaymentStatus;
import com.cospace.app.entity.Refund;
import com.cospace.app.repository.BookingCancellationRepository;
import com.cospace.app.repository.BookingRepository;
import com.cospace.app.repository.BranchEntityRepository;
import com.cospace.app.repository.PaymentRepository;
import com.cospace.app.repository.RefundRepository;
import com.cospace.app.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RefundServiceTest {

    @Mock
    private RefundRepository refundRepository;
    @Mock
    private PaymentRepository paymentRepository;
    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private BookingCancellationRepository cancellationRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private BranchEntityRepository branchRepository;
    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private RefundService refundService;

    private final UUID userId = UUID.randomUUID();

    private Booking booking() {
        return Booking.builder().id(UUID.randomUUID()).bookingCode("WH-ABC234").userId(userId)
                .branchId(UUID.randomUUID()).status(BookingStatus.CANCELLED).totalAmount(300_000L).build();
    }

    private Payment paid(Booking b, long amount) {
        return Payment.builder().id(UUID.randomUUID()).bookingId(b.getId()).userId(userId)
                .amount(amount).status(PaymentStatus.PAID).build();
    }

    @Test
    void refundableAmountIsReceivedMinusRefundsAlreadyOwed() {
        Booking b = booking();
        when(paymentRepository.findByBookingIdAndStatusIn(eq(b.getId()), any())).thenReturn(List.of(paid(b, 300_000L)));
        when(refundRepository.sumAmountByBookingAndStatuses(eq(b.getId()), anyCollection())).thenReturn(100_000L);

        assertThat(refundService.refundableAmount(b.getId())).isEqualTo(200_000L);
    }

    @Test
    void zeroAmountRequestsNothing() {
        assertThat(refundService.requestRefund(booking(), null, 0, Refund.REASON_CANCELLATION, null)).isNull();
        verify(refundRepository, never()).save(any());
    }

    @Test
    void samePaymentIsNeverRefundedTwiceForTheSameReason() {
        Booking b = booking();
        UUID paymentId = UUID.randomUUID();
        when(refundRepository.existsByPaymentIdAndReasonType(paymentId, Refund.REASON_LATE_PAYMENT)).thenReturn(true);

        assertThat(refundService.requestRefund(b, paymentId, 100_000L, Refund.REASON_LATE_PAYMENT, null)).isNull();
        verify(refundRepository, never()).save(any());
    }

    @Test
    void requestNotifiesCustomer() {
        Booking b = booking();
        when(refundRepository.save(any(Refund.class))).thenAnswer(inv -> inv.getArgument(0));

        Refund refund = refundService.requestRefund(b, null, 120_000L, Refund.REASON_CANCELLATION, "Hủy đơn");

        assertThat(refund.getStatus()).isEqualTo(Refund.STATUS_PENDING);
        assertThat(refund.getBranchId()).isEqualTo(b.getBranchId());
        verify(notificationService).createNotification(eq(userId), anyString(), anyString(), eq("REFUND"), eq(b.getId()), anyString());
    }

    @Test
    void processingFullRefundMarksPaymentsRefundedAndSyncsCancellation() {
        Booking b = booking();
        Payment payment = paid(b, 300_000L);
        Refund refund = Refund.builder().id(UUID.randomUUID()).bookingId(b.getId()).userId(userId).branchId(b.getBranchId())
                .amount(300_000L).reasonType(Refund.REASON_CANCELLATION).status(Refund.STATUS_PENDING).build();
        BookingCancellation cancellation = BookingCancellation.builder().bookingId(b.getId()).refundStatus("pending").build();
        when(refundRepository.findById(refund.getId())).thenReturn(Optional.of(refund));
        when(refundRepository.save(any(Refund.class))).thenAnswer(inv -> inv.getArgument(0));
        when(paymentRepository.findByBookingIdAndStatusIn(b.getId(), List.of(PaymentStatus.PAID))).thenReturn(List.of(payment));
        when(refundRepository.sumAmountByBookingAndStatuses(b.getId(), Set.of(Refund.STATUS_PROCESSED))).thenReturn(300_000L);
        when(cancellationRepository.findByBookingId(b.getId())).thenReturn(Optional.of(cancellation));

        refundService.markProcessed(refund.getId(), UUID.randomUUID(), "CK Vietcombank");

        assertThat(refund.getStatus()).isEqualTo(Refund.STATUS_PROCESSED);
        assertThat(refund.getProcessedAt()).isNotNull();
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.REFUNDED);
        assertThat(cancellation.getRefundStatus()).isEqualTo(Refund.STATUS_PROCESSED);
    }

    @Test
    void cannotProcessTwice() {
        Refund refund = Refund.builder().id(UUID.randomUUID()).status(Refund.STATUS_PROCESSED).build();
        when(refundRepository.findById(refund.getId())).thenReturn(Optional.of(refund));

        assertThatThrownBy(() -> refundService.markProcessed(refund.getId(), UUID.randomUUID(), null))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void rejectionRequiresAReason() {
        assertThatThrownBy(() -> refundService.reject(UUID.randomUUID(), UUID.randomUUID(), " "))
                .isInstanceOf(IllegalArgumentException.class);
        verify(refundRepository, never()).save(any());
    }
}
