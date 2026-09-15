package com.cospace.app.service;

import com.cospace.app.dto.MomoResponse;
import com.cospace.app.dto.api.BookingDto;
import com.cospace.app.dto.api.CashCreatePaymentResponse;
import com.cospace.app.dto.api.PayosCreatePaymentResponse;
import com.cospace.app.dto.api.PayosWebhookDto;
import com.cospace.app.entity.Booking;
import com.cospace.app.entity.BookingStatus;
import com.cospace.app.entity.Payment;
import com.cospace.app.entity.PaymentStatus;
import com.cospace.app.repository.BookingRepository;
import com.cospace.app.repository.PaymentRepository;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock
    private PaymentRepository paymentRepository;
    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private BookingService bookingService;
    @Mock
    private MomoService momoService;
    @Mock
    private PayosService payosService;
    @Mock
    private RefundService refundService;
    @Mock
    private BookingAddonService bookingAddonService;

    @InjectMocks
    private PaymentService paymentService;

    private final UUID userId = UUID.randomUUID();

    private Booking booking(BookingStatus status) {
        return Booking.builder()
                .id(UUID.randomUUID())
                .bookingCode("WH-ABC234")
                .userId(userId)
                .status(status)
                .totalAmount(150_000L)
                .paymentDeadlineAt(OffsetDateTime.now(ZoneOffset.UTC).plusMinutes(10))
                .build();
    }

    private BookingDto payableDto(UUID bookingId, long total) {
        return BookingDto.builder()
                .id(bookingId).bookingCode("WH-ABC234").totalAmount(total)
                .status(BookingStatus.PENDING_PAYMENT)
                .paymentDeadlineAt(OffsetDateTime.now(ZoneOffset.UTC).plusMinutes(10).toString())
                .build();
    }

    private Payment payment(Booking booking, String orderId, PaymentStatus status) {
        return Payment.builder()
                .id(UUID.randomUUID())
                .bookingId(booking.getId())
                .userId(userId)
                .provider("payos")
                .method("vietqr")
                .orderId(orderId)
                .amount(booking.getTotalAmount())
                .status(status)
                .build();
    }

    private PayosWebhookDto payosWebhook(long orderCode, String code) {
        PayosWebhookDto dto = new PayosWebhookDto();
        dto.setCode(code);
        dto.setSignature("sig");
        Map<String, Object> data = new HashMap<>();
        data.put("orderCode", orderCode);
        data.put("code", code);
        data.put("reference", "FT123");
        dto.setData(data);
        return dto;
    }

    @Nested
    class PayosWebhook {

        @Test
        void rejectsInvalidSignatureWithoutTouchingPayment() {
            PayosWebhookDto webhook = payosWebhook(111L, "00");
            when(payosService.verifyWebhookSignature(webhook.getData(), "sig")).thenReturn(false);

            assertThatThrownBy(() -> paymentService.handlePayosWebhook(webhook))
                    .isInstanceOf(IllegalArgumentException.class);
            verifyNoInteractions(paymentRepository, bookingRepository);
        }

        @Test
        void rejectsEmptyPayload() {
            assertThatThrownBy(() -> paymentService.handlePayosWebhook(null))
                    .isInstanceOf(IllegalArgumentException.class);
            assertThatThrownBy(() -> paymentService.handlePayosWebhook(new PayosWebhookDto()))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        void rejectsPayloadWithoutOrderCode() {
            PayosWebhookDto webhook = payosWebhook(111L, "00");
            webhook.getData().remove("orderCode");
            when(payosService.verifyWebhookSignature(anyMap(), anyString())).thenReturn(true);

            assertThatThrownBy(() -> paymentService.handlePayosWebhook(webhook))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        void successfulWebhookMarksPaymentPaidAndConfirmsBooking() {
            Booking booking = booking(BookingStatus.PENDING_PAYMENT);
            Payment payment = payment(booking, "PAYOS-111", PaymentStatus.PENDING);
            PayosWebhookDto webhook = payosWebhook(111L, "00");
            when(payosService.verifyWebhookSignature(anyMap(), anyString())).thenReturn(true);
            when(paymentRepository.findByOrderId("PAYOS-111")).thenReturn(Optional.of(payment));
            when(bookingRepository.findByIdWithLock(booking.getId())).thenReturn(Optional.of(booking));

            paymentService.handlePayosWebhook(webhook);

            assertThat(payment.getStatus()).isEqualTo(PaymentStatus.PAID);
            assertThat(payment.getPaidAt()).isNotNull();
            assertThat(payment.getGatewayTransactionId()).isEqualTo("FT123");
            assertThat(booking.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
            verify(paymentRepository).save(payment);
            verify(bookingRepository).save(booking);
        }

        @Test
        void failedWebhookMarksPaymentFailedAndLeavesBookingPending() {
            Booking booking = booking(BookingStatus.PENDING_PAYMENT);
            Payment payment = payment(booking, "PAYOS-111", PaymentStatus.PENDING);
            when(payosService.verifyWebhookSignature(anyMap(), anyString())).thenReturn(true);
            when(paymentRepository.findByOrderId("PAYOS-111")).thenReturn(Optional.of(payment));

            paymentService.handlePayosWebhook(payosWebhook(111L, "01"));

            assertThat(payment.getStatus()).isEqualTo(PaymentStatus.FAILED);
            assertThat(booking.getStatus()).isEqualTo(BookingStatus.PENDING_PAYMENT);
            verify(bookingRepository, never()).save(any());
        }

        @Test
        void duplicateWebhookIsIgnored() {
            Booking booking = booking(BookingStatus.CONFIRMED);
            Payment payment = payment(booking, "PAYOS-111", PaymentStatus.PAID);
            OffsetDateTime paidAt = OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(3);
            payment.setPaidAt(paidAt);
            when(payosService.verifyWebhookSignature(anyMap(), anyString())).thenReturn(true);
            when(paymentRepository.findByOrderId("PAYOS-111")).thenReturn(Optional.of(payment));

            paymentService.handlePayosWebhook(payosWebhook(111L, "00"));

            assertThat(payment.getPaidAt()).isEqualTo(paidAt);
            verify(paymentRepository, never()).save(any());
            verifyNoInteractions(bookingRepository);
        }

        @Test
        void latePaymentDoesNotResurrectExpiredBooking() {
            Booking booking = booking(BookingStatus.EXPIRED);
            Payment payment = payment(booking, "PAYOS-111", PaymentStatus.EXPIRED);
            when(payosService.verifyWebhookSignature(anyMap(), anyString())).thenReturn(true);
            when(paymentRepository.findByOrderId("PAYOS-111")).thenReturn(Optional.of(payment));
            when(bookingRepository.findByIdWithLock(booking.getId())).thenReturn(Optional.of(booking));

            paymentService.handlePayosWebhook(payosWebhook(111L, "00"));

            assertThat(payment.getStatus()).isEqualTo(PaymentStatus.PAID);
            assertThat(booking.getStatus()).isEqualTo(BookingStatus.EXPIRED);
            verify(bookingRepository, never()).save(any());
            // The money is not kept silently: a refund for exactly this payment is queued.
            verify(refundService).requestRefund(eq(booking), eq(payment.getId()), eq(150_000L),
                    eq(com.cospace.app.entity.Refund.REASON_LATE_PAYMENT), anyString());
        }

        @Test
        void duplicatePaymentForPaidBookingIsQueuedForRefund() {
            Booking booking = booking(BookingStatus.CONFIRMED);
            Payment second = payment(booking, "PAYOS-222", PaymentStatus.PENDING);
            when(payosService.verifyWebhookSignature(anyMap(), anyString())).thenReturn(true);
            when(paymentRepository.findByOrderId("PAYOS-222")).thenReturn(Optional.of(second));
            when(bookingRepository.findByIdWithLock(booking.getId())).thenReturn(Optional.of(booking));
            when(paymentRepository.existsByBookingIdAndStatusAndPurposeAndIdNot(booking.getId(), PaymentStatus.PAID,
                    Payment.PURPOSE_BOOKING, second.getId()))
                    .thenReturn(true);

            paymentService.handlePayosWebhook(payosWebhook(222L, "00"));

            assertThat(booking.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
            verify(refundService).requestRefund(eq(booking), eq(second.getId()), eq(150_000L),
                    eq(com.cospace.app.entity.Refund.REASON_DUPLICATE_PAYMENT), anyString());
        }

        @Test
        void unknownOrderCodeIsRejected() {
            when(payosService.verifyWebhookSignature(anyMap(), anyString())).thenReturn(true);
            when(paymentRepository.findByOrderId(anyString())).thenReturn(Optional.empty());

            assertThatThrownBy(() -> paymentService.handlePayosWebhook(payosWebhook(999L, "00")))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Nested
    class MomoCallback {

        private Map<String, String> params(String partnerCode, String resultCode) {
            Map<String, String> p = new HashMap<>();
            p.put("orderId", "PAY-ABCDEFGHJKLM");
            p.put("partnerCode", partnerCode);
            p.put("resultCode", resultCode);
            p.put("transId", "4088878653");
            p.put("signature", "sig");
            return p;
        }

        @Test
        void rejectsMissingOrderId() {
            Map<String, String> p = params("CSPARTNER", "0");
            p.remove("orderId");

            assertThatThrownBy(() -> paymentService.handleMomoCallback(p))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        void rejectsInvalidSignature() {
            Map<String, String> p = params("CSPARTNER", "0");
            when(momoService.verifyCallbackSignature(p, "sig")).thenReturn(false);

            assertThatThrownBy(() -> paymentService.handleMomoCallback(p))
                    .isInstanceOf(IllegalArgumentException.class);
            verifyNoInteractions(paymentRepository, bookingRepository);
        }

        @Test
        void successfulCallbackMarksPaidAndConfirmsBooking() {
            Booking booking = booking(BookingStatus.PENDING_PAYMENT);
            Payment payment = payment(booking, "PAY-ABCDEFGHJKLM", PaymentStatus.PENDING);
            Map<String, String> p = params("CSPARTNER", "0");
            when(momoService.verifyCallbackSignature(p, "sig")).thenReturn(true);
            when(paymentRepository.findByOrderId("PAY-ABCDEFGHJKLM")).thenReturn(Optional.of(payment));
            when(bookingRepository.findByIdWithLock(booking.getId())).thenReturn(Optional.of(booking));

            paymentService.handleMomoCallback(p);

            assertThat(payment.getStatus()).isEqualTo(PaymentStatus.PAID);
            assertThat(payment.getGatewayTransactionId()).isEqualTo("4088878653");
            assertThat(booking.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
        }

        @Test
        void nonZeroResultCodeMarksFailed() {
            Booking booking = booking(BookingStatus.PENDING_PAYMENT);
            Payment payment = payment(booking, "PAY-ABCDEFGHJKLM", PaymentStatus.PENDING);
            Map<String, String> p = params("CSPARTNER", "1006");
            when(momoService.verifyCallbackSignature(p, "sig")).thenReturn(true);
            when(paymentRepository.findByOrderId("PAY-ABCDEFGHJKLM")).thenReturn(Optional.of(payment));

            paymentService.handleMomoCallback(p);

            assertThat(payment.getStatus()).isEqualTo(PaymentStatus.FAILED);
            assertThat(booking.getStatus()).isEqualTo(BookingStatus.PENDING_PAYMENT);
        }

        @Test
        void invalidSignatureIsRejectedEvenForSandboxPartnerCode() {
            Map<String, String> p = params("MOMO", "0");
            when(momoService.verifyCallbackSignature(p, "sig")).thenReturn(false);

            assertThatThrownBy(() -> paymentService.handleMomoCallback(p))
                    .isInstanceOf(IllegalArgumentException.class);
            verifyNoInteractions(paymentRepository, bookingRepository);
        }
    }

    @Nested
    class PayosReturn {

        private static final Map<String, String> FORGED_PAID_PARAMS =
                Map.of("orderCode", "111", "status", "PAID", "code", "00", "cancel", "false");

        @Test
        void returnUrlQueryParamsAloneMustNotMarkPaymentPaid() {
            Booking booking = booking(BookingStatus.PENDING_PAYMENT);
            Payment payment = payment(booking, "PAYOS-111", PaymentStatus.PENDING);
            when(paymentRepository.findByOrderId("PAYOS-111")).thenReturn(Optional.of(payment));
            when(payosService.getPaymentLinkStatus(111L))
                    .thenReturn(new PayosService.PaymentLinkStatus("PENDING", 150_000L, 0L));

            boolean paid = paymentService.handlePayosReturn(FORGED_PAID_PARAMS);

            assertThat(paid).isFalse();
            assertThat(payment.getStatus()).isEqualTo(PaymentStatus.PENDING);
            verify(paymentRepository, never()).save(any());
            verifyNoInteractions(bookingRepository);
        }

        @Test
        void unverifiablePaymentIsNotMarkedPaid() {
            Booking booking = booking(BookingStatus.PENDING_PAYMENT);
            Payment payment = payment(booking, "PAYOS-111", PaymentStatus.PENDING);
            when(paymentRepository.findByOrderId("PAYOS-111")).thenReturn(Optional.of(payment));
            when(payosService.getPaymentLinkStatus(111L)).thenReturn(null);

            assertThat(paymentService.handlePayosReturn(FORGED_PAID_PARAMS)).isFalse();
            assertThat(payment.getStatus()).isEqualTo(PaymentStatus.PENDING);
            verifyNoInteractions(bookingRepository);
        }

        @Test
        void paymentVerifiedAsPaidByPayosConfirmsBooking() {
            Booking booking = booking(BookingStatus.PENDING_PAYMENT);
            Payment payment = payment(booking, "PAYOS-111", PaymentStatus.PENDING);
            when(paymentRepository.findByOrderId("PAYOS-111")).thenReturn(Optional.of(payment));
            when(payosService.getPaymentLinkStatus(111L))
                    .thenReturn(new PayosService.PaymentLinkStatus("PAID", 150_000L, 150_000L));
            when(bookingRepository.findByIdWithLock(booking.getId())).thenReturn(Optional.of(booking));

            boolean paid = paymentService.handlePayosReturn(Map.of("orderCode", "111"));

            assertThat(paid).isTrue();
            assertThat(payment.getStatus()).isEqualTo(PaymentStatus.PAID);
            assertThat(payment.getPaidAt()).isNotNull();
            assertThat(booking.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
        }

        @Test
        void underpaidPaymentIsNotConfirmed() {
            Booking booking = booking(BookingStatus.PENDING_PAYMENT);
            Payment payment = payment(booking, "PAYOS-111", PaymentStatus.PENDING);
            when(paymentRepository.findByOrderId("PAYOS-111")).thenReturn(Optional.of(payment));
            when(payosService.getPaymentLinkStatus(111L))
                    .thenReturn(new PayosService.PaymentLinkStatus("PAID", 1_000L, 1_000L));

            assertThat(paymentService.handlePayosReturn(Map.of("orderCode", "111"))).isFalse();
            assertThat(payment.getStatus()).isEqualTo(PaymentStatus.PENDING);
            verifyNoInteractions(bookingRepository);
        }

        @Test
        void paymentCancelledAtPayosIsMarkedFailed() {
            Booking booking = booking(BookingStatus.PENDING_PAYMENT);
            Payment payment = payment(booking, "PAYOS-111", PaymentStatus.PENDING);
            when(paymentRepository.findByOrderId("PAYOS-111")).thenReturn(Optional.of(payment));
            when(payosService.getPaymentLinkStatus(111L))
                    .thenReturn(new PayosService.PaymentLinkStatus("CANCELLED", 150_000L, 0L));

            assertThat(paymentService.handlePayosReturn(Map.of("orderCode", "111", "cancel", "true"))).isFalse();
            assertThat(payment.getStatus()).isEqualTo(PaymentStatus.FAILED);
            verifyNoInteractions(bookingRepository);
        }

        @Test
        void cancelParamAloneDoesNotFailAPaymentStillPendingAtPayos() {
            Booking booking = booking(BookingStatus.PENDING_PAYMENT);
            Payment payment = payment(booking, "PAYOS-111", PaymentStatus.PENDING);
            when(paymentRepository.findByOrderId("PAYOS-111")).thenReturn(Optional.of(payment));
            when(payosService.getPaymentLinkStatus(111L))
                    .thenReturn(new PayosService.PaymentLinkStatus("PENDING", 150_000L, 0L));

            paymentService.handlePayosReturn(Map.of("orderCode", "111", "status", "CANCELLED", "cancel", "true"));

            assertThat(payment.getStatus()).isEqualTo(PaymentStatus.PENDING);
        }

        @Test
        void alreadyPaidPaymentReturnsTrueWithoutAskingPayos() {
            Booking booking = booking(BookingStatus.CONFIRMED);
            Payment payment = payment(booking, "PAYOS-111", PaymentStatus.PAID);
            when(paymentRepository.findByOrderId("PAYOS-111")).thenReturn(Optional.of(payment));

            assertThat(paymentService.handlePayosReturn(Map.of("orderCode", "111"))).isTrue();
            verifyNoInteractions(payosService, bookingRepository);
        }

        @Test
        void blankOrMalformedOrderCodeIsIgnored() {
            assertThat(paymentService.handlePayosReturn(Map.of())).isFalse();
            assertThat(paymentService.handlePayosReturn(Map.of("orderCode", "abc"))).isFalse();
            verifyNoInteractions(paymentRepository, payosService);
        }
    }

    @Nested
    class Simulation {

        @Test
        void refusedWhenRealPayosCredentialsAreConfigured() {
            when(payosService.isDemoMode()).thenReturn(false);

            assertThatThrownBy(() -> paymentService.simulatePayosPayment(userId, "123"))
                    .isInstanceOf(IllegalStateException.class);
            verifyNoInteractions(paymentRepository);
        }

        @Test
        void refusedForSomeoneElsesPayment() {
            Booking booking = booking(BookingStatus.PENDING_PAYMENT);
            when(payosService.isDemoMode()).thenReturn(true);
            when(paymentRepository.findByOrderId("PAYOS-123")).thenReturn(Optional.of(payment(booking, "PAYOS-123", PaymentStatus.PENDING)));

            assertThatThrownBy(() -> paymentService.simulatePayosPayment(UUID.randomUUID(), "123"))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
            verify(paymentRepository, never()).save(any());
        }

        @Test
        void confirmsOwnPendingPaymentInDemoMode() {
            Booking booking = booking(BookingStatus.PENDING_PAYMENT);
            Payment pending = payment(booking, "PAYOS-123", PaymentStatus.PENDING);
            when(payosService.isDemoMode()).thenReturn(true);
            when(paymentRepository.findByOrderId("PAYOS-123")).thenReturn(Optional.of(pending));
            when(bookingRepository.findById(booking.getId())).thenReturn(Optional.of(booking));
            when(bookingRepository.findByIdWithLock(booking.getId())).thenReturn(Optional.of(booking));

            paymentService.simulatePayosPayment(userId, "123");

            assertThat(pending.getStatus()).isEqualTo(PaymentStatus.PAID);
            assertThat(booking.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
        }
    }

    @Nested
    class CreatePayments {

        @Test
        void cashPaymentIsPaidImmediatelyAndConfirmsBooking() {
            Booking booking = booking(BookingStatus.PENDING_PAYMENT);
            when(bookingRepository.findByIdWithLock(booking.getId())).thenReturn(Optional.of(booking));

            CashCreatePaymentResponse response = paymentService.createCashPayment(UUID.randomUUID(), booking.getId());

            ArgumentCaptor<Payment> captor = ArgumentCaptor.forClass(Payment.class);
            verify(paymentRepository).save(captor.capture());
            assertThat(captor.getValue().getUserId()).isEqualTo(userId);
            assertThat(captor.getValue().getAmount()).isEqualTo(150_000L);
            assertThat(response.getStatus()).isEqualTo(PaymentStatus.PAID);
            assertThat(booking.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
        }

        @Test
        void payosIdempotencyKeyReusesPendingPayment() {
            Booking booking = booking(BookingStatus.PENDING_PAYMENT);
            Payment existing = payment(booking, "PAYOS-111", PaymentStatus.PENDING);
            when(paymentRepository.findTopByBookingIdAndStatusInOrderByCreatedAtDesc(
                    eq(booking.getId()), eq(List.of(PaymentStatus.INITIATED, PaymentStatus.PENDING))))
                    .thenReturn(Optional.of(existing));

            PayosCreatePaymentResponse response = paymentService.createPayosPayment(userId, booking.getId(), "idem-1");

            assertThat(response.getPaymentId()).isEqualTo(existing.getId());
            verifyNoInteractions(payosService, bookingService);
            verify(paymentRepository, never()).save(any());
        }

        @Test
        void payosPaymentUsesServerSideBookingAmount() {
            UUID bookingId = UUID.randomUUID();
            when(bookingService.getMyBooking(userId, bookingId)).thenReturn(payableDto(bookingId, 275_000L));
            when(payosService.createPaymentLink(anyLong(), eq(275_000L), anyString(), any()))
                    .thenReturn(Map.of("checkoutUrl", "https://pay.example/x", "qrCode", "qr"));

            PayosCreatePaymentResponse response = paymentService.createPayosPayment(userId, bookingId, null);

            assertThat(response.getAmount()).isEqualTo(275_000L);
            assertThat(response.getStatus()).isEqualTo(PaymentStatus.PENDING);
            assertThat(response.getOrderId()).isEqualTo("PAYOS-" + response.getOrderCode());
            assertThat(response.getCheckoutUrl()).isEqualTo("https://pay.example/x");
        }

        @Test
        void cannotPayForAnotherUsersBooking() {
            UUID bookingId = UUID.randomUUID();
            when(bookingService.getMyBooking(userId, bookingId))
                    .thenThrow(new IllegalArgumentException("Booking not found"));

            assertThatThrownBy(() -> paymentService.createPayosPayment(userId, bookingId, null))
                    .isInstanceOf(IllegalArgumentException.class);
            verify(paymentRepository, never()).save(any());
        }

        @Test
        void cashPaymentRejectedForBookingNotAwaitingPayment() {
            for (BookingStatus status : List.of(BookingStatus.CANCELLED, BookingStatus.EXPIRED, BookingStatus.CONFIRMED)) {
                Booking booking = booking(status);
                when(bookingRepository.findByIdWithLock(booking.getId())).thenReturn(Optional.of(booking));

                assertThatThrownBy(() -> paymentService.createCashPayment(UUID.randomUUID(), booking.getId()))
                        .isInstanceOf(IllegalStateException.class);
            }
            verify(paymentRepository, never()).save(any());
        }

        @Test
        void cashPaymentRejectedWhenAlreadyPaid() {
            Booking booking = booking(BookingStatus.PENDING_PAYMENT);
            when(bookingRepository.findByIdWithLock(booking.getId())).thenReturn(Optional.of(booking));
            when(paymentRepository.existsByBookingIdAndStatusAndPurpose(booking.getId(), PaymentStatus.PAID, Payment.PURPOSE_BOOKING))
                    .thenReturn(true);

            assertThatThrownBy(() -> paymentService.createCashPayment(UUID.randomUUID(), booking.getId()))
                    .isInstanceOf(IllegalStateException.class);
            verify(paymentRepository, never()).save(any());
        }

        @Test
        void onlinePaymentRejectedForConfirmedBooking() {
            UUID bookingId = UUID.randomUUID();
            BookingDto confirmed = payableDto(bookingId, 100_000L);
            confirmed.setStatus(BookingStatus.CONFIRMED);
            when(bookingService.getMyBooking(userId, bookingId)).thenReturn(confirmed);

            assertThatThrownBy(() -> paymentService.createPayosPayment(userId, bookingId, null))
                    .isInstanceOf(IllegalStateException.class);
            verifyNoInteractions(payosService);
            verify(paymentRepository, never()).save(any());
        }

        @Test
        void onlinePaymentRejectedAfterHoldExpired() {
            UUID bookingId = UUID.randomUUID();
            BookingDto lapsed = payableDto(bookingId, 100_000L);
            lapsed.setPaymentDeadlineAt(OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(1).toString());
            when(bookingService.getMyBooking(userId, bookingId)).thenReturn(lapsed);

            assertThatThrownBy(() -> paymentService.createMomoPayment(userId, bookingId, null))
                    .isInstanceOf(IllegalStateException.class);
            verifyNoInteractions(momoService);
        }

        @Test
        void momoGatewayFailureMarksPaymentFailed() {
            UUID bookingId = UUID.randomUUID();
            when(bookingService.getMyBooking(userId, bookingId)).thenReturn(payableDto(bookingId, 100_000L));
            MomoResponse failure = new MomoResponse();
            failure.setResultCode(-1);
            failure.setMessage("gateway down");
            when(momoService.createPayment(anyString(), anyString(), eq(100_000L), anyString())).thenReturn(failure);

            ArgumentCaptor<Payment> captor = ArgumentCaptor.forClass(Payment.class);
            assertThatThrownBy(() -> paymentService.createMomoPayment(userId, bookingId, null))
                    .isInstanceOf(IllegalStateException.class);

            verify(paymentRepository, org.mockito.Mockito.atLeastOnce()).save(captor.capture());
            assertThat(captor.getValue().getStatus()).isEqualTo(PaymentStatus.FAILED);
        }
    }
}
