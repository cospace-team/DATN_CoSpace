package com.example.momosandbox.service;

import com.example.momosandbox.dto.api.StaffDashboardStatsDto;
import com.example.momosandbox.entity.Booking;
import com.example.momosandbox.entity.BookingStatus;
import com.example.momosandbox.entity.WorkspaceEntity;

import com.example.momosandbox.repository.BookingRepository;
import com.example.momosandbox.repository.CheckinLogRepository;
import com.example.momosandbox.repository.WorkspaceEntityRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

@Service
public class StaffDashboardService {

    private final BookingRepository bookingRepository;
    private final CheckinLogRepository checkinLogRepository;
    private final WorkspaceEntityRepository workspaceEntityRepository;

    public StaffDashboardService(BookingRepository bookingRepository, CheckinLogRepository checkinLogRepository, WorkspaceEntityRepository workspaceEntityRepository) {
        this.bookingRepository = bookingRepository;
        this.checkinLogRepository = checkinLogRepository;
        this.workspaceEntityRepository = workspaceEntityRepository;
    }

    @Transactional(readOnly = true)
    public StaffDashboardStatsDto getDashboardStats(UUID branchId, String filter) {
        java.time.ZoneId vnZone = java.time.ZoneId.of("Asia/Ho_Chi_Minh");
        java.time.ZonedDateTime nowVn = java.time.ZonedDateTime.now(vnZone);
        
        java.time.ZonedDateTime startVn = nowVn.withHour(0).withMinute(0).withSecond(0).withNano(0);
        java.time.ZonedDateTime endVn = startVn.plusDays(1);
        
        switch (filter != null ? filter.toLowerCase() : "day") {
            case "week":
                startVn = startVn.minusDays(startVn.getDayOfWeek().getValue() - 1);
                endVn = startVn.plusWeeks(1);
                break;
            case "month":
                startVn = startVn.withDayOfMonth(1);
                endVn = startVn.plusMonths(1);
                break;
            case "year":
                startVn = startVn.withDayOfYear(1);
                endVn = startVn.plusYears(1);
                break;
            case "day":
            default:
                break;
        }

        OffsetDateTime start = startVn.toOffsetDateTime().withOffsetSameInstant(ZoneOffset.UTC);
        OffsetDateTime end = endVn.toOffsetDateTime().withOffsetSameInstant(ZoneOffset.UTC);

        List<Booking> filteredBookings = bookingRepository.findByBranchIdAndStartAtBetweenOrderByStartAtAsc(branchId, start, end);

        long revenue = filteredBookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.CONFIRMED || b.getStatus() == BookingStatus.CHECKED_IN || b.getStatus() == BookingStatus.COMPLETED)
                .mapToLong(Booking::getTotalAmount)
                .sum();

        int activeCheckinsCount = bookingRepository.countByBranchIdAndStatus(branchId, BookingStatus.CHECKED_IN);
        
        List<Booking> activeBookings = bookingRepository.findByBranchIdAndStatus(branchId, BookingStatus.CHECKED_IN);
        List<WorkspaceEntity> allWorkspaces = workspaceEntityRepository.findWorkspacesByBranchId(branchId);
        
        int activeGuests = activeBookings.stream()
            .mapToInt(b -> {
                return allWorkspaces.stream()
                    .filter(w -> w.getId().equals(b.getWorkspaceId()))
                    .findFirst()
                    .map(WorkspaceEntity::getCapacity)
                    .orElse(0);
            })
            .sum();

        Integer totalCapacityObj = workspaceEntityRepository.sumCapacityByFloorBranchId(branchId);
        int totalCapacity = totalCapacityObj != null ? totalCapacityObj : 0;

        int totalWs = workspaceEntityRepository.countByFloorBranchId(branchId);
        int maintenanceWs = workspaceEntityRepository.countByFloorBranchIdAndStatus(branchId, WorkspaceEntity.Status.maintenance);
        
        int availableWs = totalWs - maintenanceWs - activeCheckinsCount;
        int occupancyRate = (totalWs - maintenanceWs) > 0 ? Math.round(((float) activeCheckinsCount / (totalWs - maintenanceWs)) * 100) : 0;

        // Generate Chart Data
        java.util.Map<String, StaffDashboardStatsDto.ChartDataPoint> chartMap = new java.util.LinkedHashMap<>();
        
        if ("year".equalsIgnoreCase(filter)) {
            for (int i = 1; i <= 12; i++) {
                chartMap.put("T" + i, new StaffDashboardStatsDto.ChartDataPoint("T" + i, 0, 0));
            }
        } else if ("month".equalsIgnoreCase(filter)) {
            int daysInMonth = java.time.YearMonth.from(startVn).lengthOfMonth();
            for (int i = 1; i <= daysInMonth; i++) {
                chartMap.put(String.valueOf(i), new StaffDashboardStatsDto.ChartDataPoint(String.valueOf(i), 0, 0));
            }
        } else if ("week".equalsIgnoreCase(filter)) {
            String[] days = {"T2", "T3", "T4", "T5", "T6", "T7", "CN"};
            for (String day : days) {
                chartMap.put(day, new StaffDashboardStatsDto.ChartDataPoint(day, 0, 0));
            }
        } else {
            // Day filter (default)
            for (int i = 8; i <= 22; i += 2) {
                String label = String.format("%02d:00", i);
                chartMap.put(label, new StaffDashboardStatsDto.ChartDataPoint(label, 0, 0));
            }
        }

        for (Booking b : filteredBookings) {
            if (b.getStatus() == BookingStatus.CANCELLED) continue;
            
            java.time.ZonedDateTime bStartVn = b.getStartAt().atZoneSameInstant(vnZone);
            String key = "";
            if ("year".equalsIgnoreCase(filter)) {
                key = "T" + bStartVn.getMonthValue();
            } else if ("month".equalsIgnoreCase(filter)) {
                key = String.valueOf(bStartVn.getDayOfMonth());
            } else if ("week".equalsIgnoreCase(filter)) {
                String[] days = {"T2", "T3", "T4", "T5", "T6", "T7", "CN"};
                key = days[bStartVn.getDayOfWeek().getValue() - 1];
            } else {
                int hour = bStartVn.getHour();
                if (hour < 8) hour = 8;
                if (hour > 22) hour = 22;
                hour = (hour % 2 != 0) ? hour - 1 : hour; // Group into 08:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00, 22:00
                key = String.format("%02d:00", hour);
            }


            StaffDashboardStatsDto.ChartDataPoint point = chartMap.get(key);
            if (point != null) {
                point.setGuests(point.getGuests() + 1);
                if (b.getStatus() == BookingStatus.CONFIRMED || b.getStatus() == BookingStatus.CHECKED_IN || b.getStatus() == BookingStatus.COMPLETED) {
                    point.setRevenue(point.getRevenue() + b.getTotalAmount());
                }
            }
        }

        return StaffDashboardStatsDto.builder()
                .revenue(revenue)
                .activeCheckinsCount(activeCheckinsCount)
                .availableWs(availableWs)
                .maintenanceWs(maintenanceWs)
                .occupancyRate(occupancyRate)
                .totalCapacity(totalCapacity)
                .totalWs(totalWs)
                .activeGuests(activeGuests)
                .chartData(new java.util.ArrayList<>(chartMap.values()))
                .build();
    }
}
