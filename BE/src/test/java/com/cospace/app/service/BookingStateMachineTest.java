package com.cospace.app.service;

import com.cospace.app.entity.Booking;
import com.cospace.app.entity.BookingStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static com.cospace.app.entity.BookingStatus.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class BookingStateMachineTest {

    @ParameterizedTest
    @CsvSource({
            "PENDING_PAYMENT, CONFIRMED",
            "PENDING_PAYMENT, EXPIRED",
            "PENDING_PAYMENT, CANCELLED",
            "CONFIRMED, CHECKED_IN",
            "CONFIRMED, CANCELLED",
            "CONFIRMED, NO_SHOW",
            "CONFIRMED, COMPLETED",
            "CHECKED_IN, COMPLETED",
            "CHECKED_IN, CONFIRMED",
    })
    void allowsLegitimateMoves(BookingStatus from, BookingStatus to) {
        assertThat(BookingStateMachine.canTransition(from, to)).isTrue();
    }

    @ParameterizedTest
    @CsvSource({
            "EXPIRED, CONFIRMED",       // a late payment must not resurrect an expired hold
            "CANCELLED, CONFIRMED",
            "CHECKED_IN, CANCELLED",    // a booking in use can't be cancelled
            "COMPLETED, CHECKED_IN",
            "PENDING_PAYMENT, CHECKED_IN", // unpaid bookings can't be used
            "NO_SHOW, COMPLETED",
            "CONFIRMED, CONFIRMED",
    })
    void rejectsIllegalMoves(BookingStatus from, BookingStatus to) {
        assertThat(BookingStateMachine.canTransition(from, to)).isFalse();
    }

    @Test
    void transitionThrowsWithReadableMessageAndLeavesStatusUnchanged() {
        Booking booking = Booking.builder().bookingCode("WH-ABC234").status(EXPIRED).build();

        assertThatThrownBy(() -> BookingStateMachine.transition(booking, CONFIRMED))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("WH-ABC234")
                .hasMessageContaining("Hết hạn thanh toán");
        assertThat(booking.getStatus()).isEqualTo(EXPIRED);
    }

    @Test
    void terminalStatusesHaveNoWayOut() {
        assertThat(BookingStateMachine.isTerminal(COMPLETED)).isTrue();
        assertThat(BookingStateMachine.isTerminal(CANCELLED)).isTrue();
        assertThat(BookingStateMachine.isTerminal(EXPIRED)).isTrue();
        assertThat(BookingStateMachine.isTerminal(NO_SHOW)).isTrue();
        assertThat(BookingStateMachine.isTerminal(CONFIRMED)).isFalse();
    }
}
