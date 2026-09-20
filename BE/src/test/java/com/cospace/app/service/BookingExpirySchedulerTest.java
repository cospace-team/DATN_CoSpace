package com.cospace.app.service;

import com.cospace.app.entity.Booking;
import com.cospace.app.entity.BookingStatus;
import com.cospace.app.repository.BookingRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookingExpirySchedulerTest {

    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private BookingExpiryService bookingExpiryService;

    @InjectMocks
    private BookingExpiryScheduler scheduler;

    @Test
    void doesNothingWhenNoBookingIsOverdue() {
        when(bookingRepository.findAllByStatusAndPaymentDeadlineAtBefore(eq(BookingStatus.PENDING_PAYMENT), any()))
                .thenReturn(List.of());

        scheduler.expirePendingBookings();

        verifyNoInteractions(bookingExpiryService);
    }

    @Test
    void handsEveryOverdueBookingToTheLockedExpiryService() {
        Booking first = overdue();
        Booking second = overdue();
        when(bookingRepository.findAllByStatusAndPaymentDeadlineAtBefore(eq(BookingStatus.PENDING_PAYMENT), any()))
                .thenReturn(List.of(first, second));

        scheduler.expirePendingBookings();

        // Only ids are handed over: the service re-reads each booking under a row lock, so the
        // scheduler's own (unlocked) copy can never be written back over a confirmed booking.
        verify(bookingExpiryService).expire(eq(first.getId()), any());
        verify(bookingExpiryService).expire(eq(second.getId()), any());
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void oneFailingBookingDoesNotStopTheRest() {
        Booking failing = overdue();
        Booking healthy = overdue();
        when(bookingRepository.findAllByStatusAndPaymentDeadlineAtBefore(eq(BookingStatus.PENDING_PAYMENT), any()))
                .thenReturn(List.of(failing, healthy));
        when(bookingExpiryService.expire(eq(failing.getId()), any()))
                .thenThrow(new IllegalStateException("row locked"));

        scheduler.expirePendingBookings();

        verify(bookingExpiryService).expire(eq(healthy.getId()), any());
    }

    private static Booking overdue() {
        return Booking.builder().id(UUID.randomUUID()).status(BookingStatus.PENDING_PAYMENT).build();
    }
}
