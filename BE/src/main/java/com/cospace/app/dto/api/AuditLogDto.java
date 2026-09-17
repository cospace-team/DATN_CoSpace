package com.cospace.app.dto.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * DTO for audit log entries, enriched with actor information for display purposes.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLogDto {
    private UUID id;
    private UUID userId;
    private String actorName;
    private String actorRole;
    private String action;
    private String entityName;
    private UUID entityId;
    private Map<String, Object> oldValues;
    private Map<String, Object> newValues;
    private String ipAddress;
    private OffsetDateTime createdAt;
}
