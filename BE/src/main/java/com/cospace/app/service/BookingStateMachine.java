package com.cospace.app.service;

import com.cospace.app.entity.Booking;
import com.cospace.app.entity.BookingStatus;

import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

import static com.cospace.app.entity.BookingStatus.*;

/**
 * The single source of truth for how a booking's status may change. Every service that moves a
 * booking to a new status goes through {@link #transition}, so an illegal move — paying for an
 * expired booking, cancelling one that is already in use, completing one twice — fails loudly
 * instead of silently corrupting the booking.
 *
 * <pre>
 * PENDING_PAYMENT ─► CONFIRMED ─► CHECKED_IN ─► COMPLETED
 *       │               │  ▲            │
 *       │               │  └────────────┘  (multi-day pass checks out mid-period)
 *       ├─► EXPIRED     ├─► CANCELLED
 *       └─► CANCELLED   ├─► COMPLETED  (multi-day pass ended after being used)
 *                       └─► NO_SHOW    (ended without ever being checked in)
 * </pre>
 */
public final class BookingStateMachine {

    private static final Map<BookingStatus, Set<BookingStatus>> ALLOWED = new EnumMap<>(BookingStatus.class);

    static {
        ALLOWED.put(PENDING_PAYMENT, EnumSet.of(CONFIRMED, CANCELLED, EXPIRED));
        ALLOWED.put(CONFIRMED, EnumSet.of(CHECKED_IN, CANCELLED, COMPLETED, NO_SHOW));
        ALLOWED.put(CHECKED_IN, EnumSet.of(CONFIRMED, COMPLETED));
        ALLOWED.put(CHECKED_OUT, EnumSet.of(COMPLETED)); // legacy status, only ever closed out
        ALLOWED.put(COMPLETED, EnumSet.noneOf(BookingStatus.class));
        ALLOWED.put(CANCELLED, EnumSet.noneOf(BookingStatus.class));
        ALLOWED.put(EXPIRED, EnumSet.noneOf(BookingStatus.class));
        ALLOWED.put(NO_SHOW, EnumSet.noneOf(BookingStatus.class));
    }

    private BookingStateMachine() {
    }

    public static boolean canTransition(BookingStatus from, BookingStatus to) {
        return from != null && to != null && ALLOWED.getOrDefault(from, Set.of()).contains(to);
    }

    public static boolean isTerminal(BookingStatus status) {
        return status != null && ALLOWED.getOrDefault(status, Set.of()).isEmpty();
    }

    /** Moves the booking to {@code to}, or throws if that move is not allowed from its current status. */
    public static void transition(Booking booking, BookingStatus to) {
        BookingStatus from = booking.getStatus();
        if (!canTransition(from, to)) {
            throw new IllegalStateException("Không thể chuyển đơn " + booking.getBookingCode()
                    + " từ trạng thái \"" + label(from) + "\" sang \"" + label(to) + "\".");
        }
        booking.setStatus(to);
    }

    public static String label(BookingStatus status) {
        if (status == null) return "không xác định";
        return switch (status) {
            case PENDING_PAYMENT -> "Chờ thanh toán";
            case CONFIRMED -> "Đã xác nhận";
            case CHECKED_IN -> "Đang sử dụng";
            case CHECKED_OUT -> "Đã check-out";
            case COMPLETED -> "Hoàn tất";
            case CANCELLED -> "Đã hủy";
            case EXPIRED -> "Hết hạn thanh toán";
            case NO_SHOW -> "Không đến";
        };
    }
}
