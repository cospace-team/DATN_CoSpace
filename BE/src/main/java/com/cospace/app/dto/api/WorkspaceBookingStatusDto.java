package com.cospace.app.dto.api;

import com.cospace.app.entity.WorkspaceEntity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkspaceBookingStatusDto {
    private UUID workspaceId;
    private String name;
    private String code;
    /** Seats in the workspace. */
    private int capacity;
    private WorkspaceEntity.Status workspaceStatus;
    
    private String workspaceTypeId;
    
    // If there is an active maintenance, include its info
    private MaintenanceResponseDto activeMaintenance;
    
    // List of bookings for the requested day
    private List<BookingDto> todayBookings;
}
