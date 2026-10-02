package com.cospace.app.dto.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/** DTOs for the customer reputation score (điểm uy tín). */
public class ReputationDto {

    private ReputationDto() {
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class EventResponse {
        private UUID id;
        private UUID bookingId;
        private String reason;
        private int delta;
        private int scoreAfter;
        private String note;
        private OffsetDateTime createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MyReputationResponse {
        private int score;
        private int maxScore;
        /** Minutes after the booked start within which a guest must check in to avoid the penalty. */
        private long checkinDeadlineMinutes;
        /** Points deducted for each booking not checked in on time. */
        private int missedCheckinPenalty;
        private List<EventResponse> recentEvents;
    }
}
