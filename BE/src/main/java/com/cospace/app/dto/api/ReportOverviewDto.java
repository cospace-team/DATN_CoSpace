package com.cospace.app.dto.api;

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
public class ReportOverviewDto {

    private long totalRevenue;
    private int totalBookings;
    private int completedBookings;
    private int canceledBookings;

    private List<String> months;
    private List<Long> monthlyRevenue;
    private List<Integer> monthlyBookings;

    private List<WorkspaceTypeStatDto> byType;
    private List<BranchComparisonDto> branchComparison;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class WorkspaceTypeStatDto {
        private String type;
        private int count;
        private long revenue;
        private String color;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BranchComparisonDto {
        private UUID id;
        private String name;
        private String code;
        private int bookingCount;
        private long revenue;
        private int rate;
    }
}
