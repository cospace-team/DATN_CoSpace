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
    /** True when the revenue figures were left out because the caller may not see them for this period. */
    private boolean revenueHidden;

    /** The same counts with every revenue figure removed. */
    public StaffDashboardStatsDto withoutRevenue() {
        revenue = 0;
        revenueHidden = true;
        if (chartData != null) {
            chartData.forEach(p -> p.setRevenue(0));
        }
        return this;
    }

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
