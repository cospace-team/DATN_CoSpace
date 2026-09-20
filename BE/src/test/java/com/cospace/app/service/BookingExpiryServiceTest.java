package com.cospace.app.service;

import com.cospace.app.entity.Booking;
import com.cospace.app.entity.BookingStatus;
import com.cospace.app.entity.Payment;
import com.cospace.app.entity.PaymentStatus;
import com.cospace.app.repository.BookingRepository;
import com.cospace.app.repository.PaymentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookingExpiryServiceTest {

    private static final OffsetDateTime NOW = OffsetDateTime.parse("2026-09-20T10:00:00Z");

    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private PaymentRepository paymentRepository;
    @Mock
    private BookingAddonService bookingAddonService;

    @InjectMocks
    private BookingExpiryService service;

    @Test
    void expiresAnOverdueHoldAndItsPendingPayment() {
        Booking booking = hold(NOW.minusMinutes(1));
        Payment pending = Payment.builder().id(UUID.randomUUID()).bookingId(booking.getId())
                .status(PaymentStatus.PENDING).build();
        when(bookingRepository.findByIdWithLock(booking.getId())).thenReturn(Optional.of(booking));
        when(paymentRepository.findTopByBookingIdAndStatusInOrderByCreatedAtDesc(
                eq(booking.getId()), eq(List.of(PaymentStatus.INITIATED, PaymentStatus.PENDING))))
                .thenReturn(Optional.of(pending));

        boolean expired = service.expire(booking.getId(), NOW);

        assertThat(expired).isTrue();
        assertThat(booking.getStatus()).isEqualTo(BookingStatus.EXPIRED);
        assertThat(pending.getStatus()).isEqualTo(PaymentStatus.EXPIRED);
        verify(bookingRepository).save(booking);
        verify(bookingAddonService).voidUnpaid(booking, null);
    }

    @Test
    void expiresAnOverdueHoldThatNeverStartedAPayment() {
        Booking booking = hold(NOW.minusMinutes(1));
        when(bookingRepository.findByIdWithLock(booking.getId())).thenReturn(Optional.of(booking));
        when(paymentRepository.findTopByBookingIdAndStatusInOrderByCreatedAtDesc(eq(booking.getId()), any()))
                .thenReturn(Optional.empty());

        assertThat(service.expire(booking.getId(), NOW)).isTrue();
        assertThat(booking.getStatus()).isEqualTo(BookingStatus.EXPIRED);
        verify(paymentRepository, never()).save(any());
    }

    /** The race this whole class exists for: a webhook confirmed the booking first. */
    @Test
    void leavesABookingAloneOnceAPaymentHasConfirmedIt() {
        Booking confirmed = hold(NOW.minusMinutes(1));
        confirmed.setStatus(BookingStatus.CONFIRMED);
        when(bookingRepository.findByIdWithLock(confirmed.getId())).thenReturn(Optional.of(confirmed));

        boolean expired = service.expire(confirmed.getId(), NOW);

        assertThat(expired).isFalse();
        assertThat(confirmed.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
        verify(bookingRepository, never()).save(any());
        verify(paymentRepository, never()).save(any());
    }

    @Test
    void leavesAHoldWhoseDeadlineHasNotPassedAlone() {
        Booking stillHeld = hold(NOW.plusMinutes(5));
        when(bookingRepository.findByIdWithLock(stillHeld.getId())).thenReturn(Optional.of(stillHeld));

        assertThat(service.expire(stillHeld.getId(), NOW)).isFalse();
        assertThat(stillHeld.getStatus()).isEqualTo(BookingStatus.PENDING_PAYMENT);
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void missingBookingIsIgnored() {
        UUID gone = UUID.randomUUID();
        when(bookingRepository.findByIdWithLock(gone)).thenReturn(Optional.empty());

        assertThat(service.expire(gone, NOW)).isFalse();
    }

    @Test
    void isExpiredHoldOnlyCoversUnpaidBookingsPastTheirDeadline() {
        assertThat(BookingExpiryService.isExpiredHold(hold(NOW.minusSeconds(1)), NOW)).isTrue();
        assertThat(BookingExpiryService.isExpiredHold(hold(NOW), NOW)).isTrue();
        assertThat(BookingExpiryService.isExpiredHold(hold(NOW.plusSeconds(1)), NOW)).isFalse();
        assertThat(BookingExpiryService.isExpiredHold(null, NOW)).isFalse();

        Booking withoutDeadline = hold(null);
        assertThat(BookingExpiryService.isExpiredHold(withoutDeadline, NOW)).isFalse();
    }

    private static Booking hold(OffsetDateTime deadline) {
        return Booking.builder()
                .id(UUID.randomUUID())
                .bookingCode("WH-TEST01")
                .status(BookingStatus.PENDING_PAYMENT)
                .paymentDeadlineAt(deadline)
                .build();
    }
}
