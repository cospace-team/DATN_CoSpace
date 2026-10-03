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
        /** For a missed check-in penalty: whether staff already gave the points back. */
        private boolean reverted;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RevertRequest {
        private String reason;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MyReputationResponse {
        private UUID userId;
        private String fullName;
        private int score;
        private int maxScore;
        /** Minutes after the booked start within which a guest must check in to avoid the penalty. */
        private long checkinDeadlineMinutes;
        /** Points deducted for each booking not checked in on time. */
        private int missedCheckinPenalty;
        /** Points given back for each booking checked in on time. */
        private int onTimeCheckinReward;
        /** Below this score only one upcoming booking may be held online. */
        private int limitedBelow;
        /** Below this score online booking is refused. */
        private int blockedBelow;
        /** none | limited | blocked */
        private String restriction;
        private long missedCheckinCount;
        private List<EventResponse> recentEvents;
    }
}
