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
}
