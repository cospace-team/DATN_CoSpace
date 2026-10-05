package com.cospace.app.dto.api;

import lombok.Data;

import java.time.ZonedDateTime;
import java.util.UUID;

@Data
public class MaintenanceRequestDto {
    private UUID workspaceId; // Only used for create if path param isn't used
    private ZonedDateTime startAt;
    private ZonedDateTime endAt;
    private String reason;
    /** low, normal (default), high or urgent. */
    private String priority;
    /** URL of a photo uploaded through /api/staff/photos. */
    private String photoUrl;
    /**
     * Set once the person has seen which bookings the window cancels or cuts short. Without it the
     * request is refused with the list (409 affected_bookings), so nobody's paid booking is cancelled
     * by a click whose consequences were never shown.
     */
    private boolean confirmAffectedBookings;
}
