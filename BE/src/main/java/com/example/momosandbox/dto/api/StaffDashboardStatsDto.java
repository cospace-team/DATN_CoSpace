package com.example.momosandbox.dto.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffDashboardStatsDto {
    private long revenue;
    private int activeCheckinsCount;
    private int availableWs;
    private int maintenanceWs;
    private int occupancyRate;
}
