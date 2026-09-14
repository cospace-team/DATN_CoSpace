package com.cospace.app.dto.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Customer-facing workspace availability: exposes only the time ranges a
 * workspace is unavailable, with no booking owner identity or pricing —
 * unlike {@link WorkspaceBookingStatusDto}, which is staff-only.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PublicWorkspaceAvailabilityDto {

    private UUID workspaceId;
    private String status;
    private List<BusySlot> busySlots;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BusySlot {
        private OffsetDateTime startAt;
        private OffsetDateTime endAt;
        /** "booking" or "maintenance" — lets the UI distinguish reasons without exposing who booked it. */
        private String reason;
    }
}
