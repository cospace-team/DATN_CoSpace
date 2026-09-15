package com.cospace.app.service;

import com.cospace.app.dto.api.MaintenanceRequestDto;
import com.cospace.app.dto.api.MaintenanceResponseDto;
import com.cospace.app.entity.Booking;
import com.cospace.app.entity.BookingStatus;
import com.cospace.app.entity.MaintenanceStatus;
import com.cospace.app.entity.WorkspaceMaintenanceEntity;
import com.cospace.app.repository.BookingRepository;
import com.cospace.app.repository.WorkspaceMaintenanceRepository;
import com.cospace.app.repository.WorkspaceEntityRepository;
import com.cospace.app.entity.WorkspaceEntity;
import com.cospace.app.dto.api.WorkspaceMaintenanceStatusDto;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class StaffMaintenanceService {

    private final WorkspaceMaintenanceRepository maintenanceRepository;
    private final BookingRepository bookingRepository;
    private final EntityManager entityManager;
    private final WorkspaceEntityRepository workspaceEntityRepository;
    private final com.cospace.app.repository.CheckinLogRepository checkinLogRepository;
    private final CancellationService cancellationService;
    private final NotificationService notificationService;

    public StaffMaintenanceService(WorkspaceMaintenanceRepository maintenanceRepository,
                                   BookingRepository bookingRepository,
                                   EntityManager entityManager,
                                   WorkspaceEntityRepository workspaceEntityRepository,
                                   com.cospace.app.repository.CheckinLogRepository checkinLogRepository,
                                   CancellationService cancellationService,
                                   NotificationService notificationService) {
        this.maintenanceRepository = maintenanceRepository;
        this.bookingRepository = bookingRepository;
        this.entityManager = entityManager;
        this.workspaceEntityRepository = workspaceEntityRepository;
        this.checkinLogRepository = checkinLogRepository;
        this.cancellationService = cancellationService;
        this.notificationService = notificationService;
    }


    @Transactional
    public MaintenanceResponseDto createMaintenance(UUID staffId, MaintenanceRequestDto request) {
        if (request.getWorkspaceId() == null) {
            throw new IllegalArgumentException("workspaceId is required");
        }
        if (request.getStartAt() == null || request.getEndAt() == null || request.getStartAt().isAfter(request.getEndAt())) {
            throw new IllegalArgumentException("Invalid startAt and endAt");
        }

        // 1. Acquire Advisory Lock for this workspace (same mechanism as booking creation to prevent race condition)
        String lockKeyStr = "booking:" + request.getWorkspaceId().toString();
        entityManager.createNativeQuery("SELECT pg_advisory_xact_lock(hashtext(:key))")
                .setParameter("key", lockKeyStr)
                .getSingleResult();

        // 2. Check for Overlapping Active/Scheduled Maintenances
        List<MaintenanceStatus> activeMaintenanceStatuses = Arrays.asList(MaintenanceStatus.active, MaintenanceStatus.scheduled);
        List<WorkspaceMaintenanceEntity> overlappingMaintenances = maintenanceRepository.findOverlappingMaintenances(
                request.getWorkspaceId(), request.getStartAt(), request.getEndAt(), activeMaintenanceStatuses);
        if (!overlappingMaintenances.isEmpty()) {
            throw new IllegalArgumentException("Vị trí này đã có lịch bảo trì khác trong khoảng thời gian đã chọn.");
        }

        // 3. Auto-Cancel Overlapping Bookings (Rule 35)
        OffsetDateTime startOffset = request.getStartAt().withZoneSameInstant(ZoneOffset.UTC).toOffsetDateTime();
        OffsetDateTime endOffset = request.getEndAt().withZoneSameInstant(ZoneOffset.UTC).toOffsetDateTime();
        OffsetDateTime nowUtc = OffsetDateTime.now(ZoneOffset.UTC);
        
        List<BookingStatus> activeStatuses = Arrays.asList(
                BookingStatus.PENDING_PAYMENT, 
                BookingStatus.CONFIRMED, 
                BookingStatus.CHECKED_IN
        );
        
        List<Booking> overlappingBookings = bookingRepository.findOverlappingBookings(
                request.getWorkspaceId(), startOffset, endOffset, activeStatuses);

        for (Booking candidate : overlappingBookings) {
            // Lock and re-read: a payment or check-in may have changed the booking meanwhile.
            Booking b = bookingRepository.findByIdWithLock(candidate.getId()).orElse(candidate);
            if (b.getStatus() == BookingStatus.PENDING_PAYMENT || b.getStatus() == BookingStatus.CONFIRMED) {
                // Not used yet: cancel with a full refund of whatever was paid, and tell the customer.
                cancellationService.cancelForMaintenance(b, request.getReason());
            } else if (b.getStatus() == BookingStatus.CHECKED_IN) {
                handleBookingInUse(b, startOffset, nowUtc, request.getReason());
            }
        }

        // 4. Create Maintenance record
        WorkspaceMaintenanceEntity maintenance = new WorkspaceMaintenanceEntity();
        maintenance.setWorkspaceId(request.getWorkspaceId());
        maintenance.setStartAt(request.getStartAt());
        maintenance.setEndAt(request.getEndAt());
        maintenance.setReason(request.getReason());
        maintenance.setStatus(MaintenanceStatus.active); // Activate immediately for staff use case as per UI
        maintenance.setCreatedBy(staffId);
        
        maintenanceRepository.save(maintenance);

        return mapToDto(maintenance, overlappingBookings.size());
    }

    /**
     * A customer is sitting in the workspace. If maintenance starts now they are checked out on the
     * spot; if it starts later they keep the seat until then. Either way the lost time is refunded.
     */
    private void handleBookingInUse(Booking b, OffsetDateTime maintenanceStart, OffsetDateTime now, String reason) {
        OffsetDateTime cutAt = maintenanceStart.isAfter(now) ? maintenanceStart : now;
        long refunded = cancellationService.refundUnusedTimeForMaintenance(b, cutAt, reason);

        if (cutAt.isBefore(b.getEndAt())) {
            b.setEndAt(cutAt);
        }
        boolean checkoutNow = !maintenanceStart.isAfter(now);
        if (checkoutNow) {
            BookingStateMachine.transition(b, BookingStatus.COMPLETED);
            // Close active checkin log to prevent orphaned seated guest records
            checkinLogRepository.findActiveCheckinByBookingId(b.getId()).ifPresent(cl -> {
                cl.setCheckoutAt(now);
                cl.setNote((cl.getNote() != null ? cl.getNote() + " | " : "") + "Tự động check-out do bảo trì đột xuất");
                checkinLogRepository.save(cl);
            });
        }
        bookingRepository.save(b);

        notificationService.createNotification(b.getUserId(),
                checkoutNow ? "Kết thúc sớm do bảo trì" : "Thời gian sử dụng được rút ngắn do bảo trì",
                String.format("Đơn %s %s vì không gian cần bảo trì.%s", b.getBookingCode(),
                        checkoutNow ? "đã được check-out sớm" : "sẽ kết thúc sớm lúc " + cutAt.atZoneSameInstant(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).toLocalTime(),
                        refunded > 0 ? " Phần thời gian không sử dụng (" + RefundService.vnd(refunded) + ") sẽ được hoàn lại." : ""),
                "BOOKING", b.getId(), "BOOKING");
    }

    @Transactional(readOnly = true)
    public List<MaintenanceResponseDto> getAllMaintenanceForBranch(UUID branchId) {
        return maintenanceRepository.findAllByBranchIdOrderByCreatedAtDesc(branchId).stream()
                .map(m -> mapToDto(m, 0))
                .collect(Collectors.toList());
    }
    
    public List<WorkspaceMaintenanceStatusDto> getWorkspaceMaintenanceStatus(UUID branchId) {
        // Fetch all workspaces in the branch
        List<WorkspaceEntity> workspaces = workspaceEntityRepository.findWorkspacesByBranchId(branchId);
        
        // Fetch all ACTIVE/SCHEDULED maintenances for this branch
        List<WorkspaceMaintenanceEntity> activeMaintenances = maintenanceRepository.findAllByBranchIdOrderByCreatedAtDesc(branchId).stream()
                .filter(m -> m.getStatus() == MaintenanceStatus.active || m.getStatus() == MaintenanceStatus.scheduled)
                .collect(Collectors.toList());
                
        return workspaces.stream().map(ws -> {
            WorkspaceMaintenanceStatusDto dto = new WorkspaceMaintenanceStatusDto();
            dto.setWorkspaceId(ws.getId());
            dto.setName(ws.getName());
            dto.setCode(ws.getCode());
            dto.setWorkspaceStatus(ws.getStatus());
            
            // Find active maintenance for this workspace if any
            activeMaintenances.stream()
                .filter(m -> m.getWorkspaceId().equals(ws.getId()))
                .findFirst()
                .ifPresent(m -> dto.setActiveMaintenance(mapToDto(m, 0)));
                
            return dto;
        }).collect(Collectors.toList());
    }

    @Transactional
    public MaintenanceResponseDto completeMaintenance(UUID maintenanceId) {
        WorkspaceMaintenanceEntity maintenance = maintenanceRepository.findById(maintenanceId)
                .orElseThrow(() -> new IllegalArgumentException("Maintenance not found"));
        
        java.time.ZonedDateTime now = java.time.ZonedDateTime.now();
        if (now.isBefore(maintenance.getEndAt())) {
            maintenance.setEndAt(now);
        }
        maintenance.setStatus(MaintenanceStatus.done);
        maintenanceRepository.save(maintenance);
        return mapToDto(maintenance, 0);
    }
    
    @Transactional
    public void deleteMaintenance(UUID maintenanceId) {
        WorkspaceMaintenanceEntity maintenance = maintenanceRepository.findById(maintenanceId)
                .orElseThrow(() -> new IllegalArgumentException("Maintenance not found"));
                
        java.time.ZonedDateTime now = java.time.ZonedDateTime.now();
        if (now.isBefore(maintenance.getEndAt())) {
            maintenance.setEndAt(now);
        }
        // Instead of hard delete, we can set to canceled to unlock workspace if it was a mistake.
        maintenance.setStatus(MaintenanceStatus.canceled);
        maintenanceRepository.save(maintenance);
    }

    private MaintenanceResponseDto mapToDto(WorkspaceMaintenanceEntity entity, int impactedCount) {
        MaintenanceResponseDto dto = new MaintenanceResponseDto();
        dto.setId(entity.getId());
        dto.setWorkspaceId(entity.getWorkspaceId());
        dto.setStartAt(entity.getStartAt());
        dto.setEndAt(entity.getEndAt());
        dto.setReason(entity.getReason());
        dto.setStatus(entity.getStatus());
        dto.setImpactedBookingsCount(impactedCount);
        return dto;
    }
}
