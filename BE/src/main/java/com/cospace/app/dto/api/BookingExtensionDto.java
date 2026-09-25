package com.cospace.app.dto.api;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Extra hours bought on a booking, and the late check-out surcharge. */
public final class BookingExtensionDto {

    private BookingExtensionDto() {
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExtendRequest {
        @Min(value = 1, message = "Số giờ gia hạn tối thiểu là 1")
        @Max(value = 8, message = "Mỗi lần gia hạn tối đa 8 giờ")
        private int hours = 1;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class QuoteResponse {
        private UUID bookingId;
        private int hours;
        private long pricePerHour;
        private long amount;
        private OffsetDateTime currentEndAt;
        private OffsetDateTime newEndAt;
        private boolean available;
        /** Why the extension is not possible (or how far it can go). */
        private String reason;
        /** Most hours that can be added right now. */
        private int maxHours;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class LateFeeResponse {
        private UUID bookingId;
        private OffsetDateTime endAt;
        private long lateMinutes;
        private long graceMinutes;
        /** Started hours of overstay being billed. */
        private long billableHours;
        private long pricePerHour;
        private long multiplierPercent;
        private long amount;
        /** Checking out now is beyond the grace period. */
        private boolean due;
        /** A late fee was already put on the tab (or waived) for this booking. */
        private boolean alreadyCharged;
    }
}
