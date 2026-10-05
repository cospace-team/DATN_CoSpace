package com.cospace.app.dto.api;

import com.cospace.app.entity.MaintenanceStatus;
import lombok.Data;

import java.time.ZonedDateTime;
import java.util.UUID;

@Data
public class MaintenanceResponseDto {
    private UUID id;
    private UUID workspaceId;
    private ZonedDateTime startAt;
    private ZonedDateTime endAt;
    private String reason;
    private String priority;
    private String photoUrl;
    private ZonedDateTime createdAt;
    private String createdByName;
    private MaintenanceStatus status;
    private int impactedBookingsCount;
}
