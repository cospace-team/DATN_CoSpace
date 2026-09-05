package com.cospace.app.dto.api;

import com.cospace.app.entity.WorkspaceEntity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkspaceMaintenanceStatusDto {
    private UUID workspaceId;
    private String name;
    private String code;
    private WorkspaceEntity.Status workspaceStatus;
    
    // If there is an active maintenance, include its info
    private MaintenanceResponseDto activeMaintenance;
}
