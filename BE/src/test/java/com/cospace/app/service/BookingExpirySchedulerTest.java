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
class BookingExpirySchedulerTest {

    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private PaymentRepository paymentRepository;
    @Mock
    private BookingAddonService bookingAddonService;

    @InjectMocks
    private BookingExpiryScheduler scheduler;

    @Test
    void doesNothingWhenNoBookingIsOverdue() {
        when(bookingRepository.findAllByStatusAndPaymentDeadlineAtBefore(eq(BookingStatus.PENDING_PAYMENT), any()))
                .thenReturn(List.of());

        scheduler.expirePendingBookings();

        verify(paymentRepository, never()).save(any());
    }

    @Test
    void expiresOverdueBookingsAndTheirPendingPayments() {
        Booking withPayment = Booking.builder().id(UUID.randomUUID()).status(BookingStatus.PENDING_PAYMENT).build();
        Booking withoutPayment = Booking.builder().id(UUID.randomUUID()).status(BookingStatus.PENDING_PAYMENT).build();
        Payment pending = Payment.builder().id(UUID.randomUUID()).bookingId(withPayment.getId())
                .status(PaymentStatus.PENDING).build();

        when(bookingRepository.findAllByStatusAndPaymentDeadlineAtBefore(eq(BookingStatus.PENDING_PAYMENT), any()))
                .thenReturn(List.of(withPayment, withoutPayment));
        when(paymentRepository.findTopByBookingIdAndStatusInOrderByCreatedAtDesc(
                eq(withPayment.getId()), eq(List.of(PaymentStatus.INITIATED, PaymentStatus.PENDING))))
                .thenReturn(Optional.of(pending));
        when(paymentRepository.findTopByBookingIdAndStatusInOrderByCreatedAtDesc(eq(withoutPayment.getId()), any()))
                .thenReturn(Optional.empty());

        scheduler.expirePendingBookings();

        assertThat(withPayment.getStatus()).isEqualTo(BookingStatus.EXPIRED);
        assertThat(withoutPayment.getStatus()).isEqualTo(BookingStatus.EXPIRED);
        assertThat(pending.getStatus()).isEqualTo(PaymentStatus.EXPIRED);
        verify(paymentRepository).save(pending);
    }
}
