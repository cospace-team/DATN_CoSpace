package com.cospace.app.dto.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/** DTOs for per-branch limits on extra services (how many a branch can lend at once). */
public class ServiceLimitDto {

    private ServiceLimitDto() {
    }

    /** A service offered at a branch with its limit there (null = unlimited). */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class LimitResponse {
        private UUID serviceId;
        private String serviceKey;
        private String name;
        private String serviceType;
        private String unit;
        private long price;
        /** Whether the service row is the branch's own (false: inherited global service). */
        private boolean branchOwned;
        private Integer maxConcurrent;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LimitRequest {
        private UUID branchId;
        private String serviceKey;
        /** Null or empty removes the limit. */
        private Integer maxConcurrent;
    }

    /** Availability of a limited service for a time window. */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AvailabilityResponse {
        private UUID serviceId;
        private String serviceKey;
        private String name;
        private int maxConcurrent;
        private long inUse;
        private long remaining;
    }
}
