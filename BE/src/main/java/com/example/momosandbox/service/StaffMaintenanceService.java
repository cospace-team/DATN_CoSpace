package com.example.momosandbox.service;

import com.example.momosandbox.dto.api.MaintenanceRequestDto;
import com.example.momosandbox.dto.api.MaintenanceResponseDto;
import com.example.momosandbox.entity.Booking;
import com.example.momosandbox.entity.BookingStatus;
import com.example.momosandbox.entity.MaintenanceStatus;
import com.example.momosandbox.entity.WorkspaceMaintenanceEntity;
import com.example.momosandbox.repository.BookingRepository;
import com.example.momosandbox.repository.WorkspaceMaintenanceRepository;
import com.example.momosandbox.repository.WorkspaceEntityRepository;
import com.example.momosandbox.entity.WorkspaceEntity;
import com.example.momosandbox.dto.api.WorkspaceMaintenanceStatusDto;
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

    public StaffMaintenanceService(WorkspaceMaintenanceRepository maintenanceRepository,
                                   BookingRepository bookingRepository,
                                   EntityManager entityManager,
                                   WorkspaceEntityRepository workspaceEntityRepository) {
        this.maintenanceRepository = maintenanceRepository;
        this.bookingRepository = bookingRepository;
        this.entityManager = entityManager;
        this.workspaceEntityRepository = workspaceEntityRepository;
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

        // 2. Auto-Cancel Overlapping Bookings (Rule 35)
        OffsetDateTime startOffset = request.getStartAt().withZoneSameInstant(ZoneOffset.UTC).toOffsetDateTime();
        OffsetDateTime endOffset = request.getEndAt().withZoneSameInstant(ZoneOffset.UTC).toOffsetDateTime();
        
        List<BookingStatus> activeStatuses = Arrays.asList(
                BookingStatus.PENDING_PAYMENT, 
                BookingStatus.CONFIRMED, 
                BookingStatus.CHECKED_IN
        );
        
        List<Booking> overlappingBookings = bookingRepository.findOverlappingBookings(
                request.getWorkspaceId(), startOffset, endOffset, activeStatuses);

        for (Booking b : overlappingBookings) {
            if (b.getStatus() == BookingStatus.PENDING_PAYMENT || b.getStatus() == BookingStatus.CONFIRMED) {
                b.setStatus(BookingStatus.CANCELLED);
                // Note: For confirmed bookings, refund logic should ideally be triggered here.
            } else if (b.getStatus() == BookingStatus.CHECKED_IN) {
                b.setStatus(BookingStatus.COMPLETED); // Early checkout
                // Note: Early checkout refund logic should ideally be triggered here.
            }
        }
        bookingRepository.saveAll(overlappingBookings);

        // 3. Create Maintenance record
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
        
        maintenance.setStatus(MaintenanceStatus.done);
        maintenanceRepository.save(maintenance);
        return mapToDto(maintenance, 0);
    }
    
    @Transactional
    public void deleteMaintenance(UUID maintenanceId) {
        WorkspaceMaintenanceEntity maintenance = maintenanceRepository.findById(maintenanceId)
                .orElseThrow(() -> new IllegalArgumentException("Maintenance not found"));
                
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
