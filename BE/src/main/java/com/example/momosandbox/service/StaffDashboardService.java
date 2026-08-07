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
    public StaffDashboardStatsDto getDashboardStats(UUID branchId) {
        OffsetDateTime todayStart = OffsetDateTime.now(ZoneOffset.UTC).withHour(0).withMinute(0).withSecond(0).withNano(0);
        OffsetDateTime todayEnd = todayStart.plusDays(1);

        List<Booking> todayBookings = bookingRepository.findByBranchIdAndStartAtBetweenOrderByStartAtAsc(branchId, todayStart, todayEnd);

        long revenue = todayBookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.CONFIRMED || b.getStatus() == BookingStatus.CHECKED_IN || b.getStatus() == BookingStatus.COMPLETED)
                .mapToLong(Booking::getTotalAmount)
                .sum();

        int activeCheckinsCount = checkinLogRepository.findActiveCheckinsByBranchId(branchId).size();

        // Get workspace counts for the branch
        // For MVP, we need to join through floors or use a custom query.
        // Let's assume we can fetch workspaces by branch if we add a method, but WorkspaceEntity only has floorId.
        // For simplicity, we can fetch all and filter or add a query. Let's use a query to WorkspaceEntityRepository.
        
        int totalWs = workspaceEntityRepository.countByFloorBranchId(branchId);
        int maintenanceWs = workspaceEntityRepository.countByFloorBranchIdAndStatus(branchId, WorkspaceEntity.Status.maintenance);
        
        int availableWs = totalWs - maintenanceWs - activeCheckinsCount;
        int occupancyRate = (totalWs - maintenanceWs) > 0 ? Math.round(((float) activeCheckinsCount / (totalWs - maintenanceWs)) * 100) : 0;

        return StaffDashboardStatsDto.builder()
                .revenue(revenue)
                .activeCheckinsCount(activeCheckinsCount)
                .availableWs(availableWs)
                .maintenanceWs(maintenanceWs)
                .occupancyRate(occupancyRate)
                .build();
    }
}
