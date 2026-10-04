package com.cospace.app.dto.api;

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
    private int totalCapacity;
    /** Guests inside right now (open check-ins). */
    private int activeGuests;
    /** Seats the workspaces those guests are in hold, out of totalCapacity. */
    private int occupiedSeats;
    private int totalWs;
    private java.util.List<ChartDataPoint> chartData;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChartDataPoint {
        private String label;
        private int guests;
        private long revenue;
    }
}
