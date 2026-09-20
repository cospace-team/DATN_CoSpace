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
        if (request.getStartAt() == null || request.getEndAt() == null
                || !request.getEndAt().isAfter(request.getStartAt())) {
            throw new IllegalArgumentException("Thời gian bảo trì không hợp lệ: giờ kết thúc phải sau giờ bắt đầu.");
        }
        // A window in the past would be read as "the seat is unusable from now on" further down and
        // would cut short bookings that had already run their course untouched.
        if (request.getStartAt().toInstant().isBefore(java.time.Instant.now().minusSeconds(60))) {
            throw new IllegalArgumentException(
                    "Không thể tạo lịch bảo trì cho thời gian đã qua. Vui lòng chọn thời điểm từ hiện tại trở đi.");
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

            // A booking is only cancelled when the maintenance window swallows it whole. Anything
            // else — a two-hour repair inside a monthly contract, say — keeps its seat and is
            // refunded for the overlapping time alone, instead of losing the entire contract.
            boolean coversWholeBooking = !startOffset.isAfter(b.getStartAt()) && !endOffset.isBefore(b.getEndAt());
            if (!coversWholeBooking) {
                refundOverlappingTime(b, startOffset, endOffset, request.getReason());
            } else if (b.getStatus() == BookingStatus.CHECKED_IN) {
                endBookingInUse(b, startOffset, endOffset, nowUtc, request.getReason());
            } else {
                // Not used yet: cancel with a full refund of whatever was paid, and tell the customer.
                cancellationService.cancelForMaintenance(b, request.getReason());
            }
        }

        // 4. Create Maintenance record
        WorkspaceMaintenanceEntity maintenance = new WorkspaceMaintenanceEntity();
        maintenance.setWorkspaceId(request.getWorkspaceId());
        maintenance.setStartAt(request.getStartAt());
        maintenance.setEndAt(request.getEndAt());
        maintenance.setReason(request.getReason());
        // A window that has not started yet is scheduled, not active: marking it active would make
        // the floor plan show a seat as under repair days before anyone touches it.
        maintenance.setStatus(!request.getStartAt().toInstant().isAfter(java.time.Instant.now())
                ? MaintenanceStatus.active
                : MaintenanceStatus.scheduled);
        maintenance.setCreatedBy(staffId);
        
        maintenanceRepository.save(maintenance);

        return mapToDto(maintenance, overlappingBookings.size());
    }

    /**
     * A guest is sitting in a workspace that maintenance takes over for the rest of their booking:
     * they are checked out on the spot and refunded the time they lose.
     */
    private void endBookingInUse(Booking b, OffsetDateTime maintenanceStart, OffsetDateTime maintenanceEnd,
                                 OffsetDateTime now, String reason) {
        long refunded = cancellationService.refundTimeLostToMaintenance(b, maintenanceStart, maintenanceEnd, reason);

        if (now.isAfter(b.getStartAt()) && now.isBefore(b.getEndAt())) {
            b.setEndAt(now);
        }
        BookingStateMachine.transition(b, BookingStatus.COMPLETED);
        // Close active checkin log to prevent orphaned seated guest records
        checkinLogRepository.findActiveCheckinByBookingId(b.getId()).ifPresent(cl -> {
            cl.setCheckoutAt(now);
            cl.setNote((cl.getNote() != null ? cl.getNote() + " | " : "") + "Tự động check-out do bảo trì đột xuất");
            checkinLogRepository.save(cl);
        });
        bookingRepository.save(b);

        notificationService.createNotification(b.getUserId(),
                "Kết thúc sớm do bảo trì",
                String.format("Đơn %s đã được check-out sớm vì không gian cần bảo trì.%s", b.getBookingCode(),
                        refunded > 0 ? " Phần thời gian không sử dụng (" + RefundService.vnd(refunded) + ") sẽ được hoàn lại." : ""),
                "BOOKING", b.getId(), "BOOKING");
    }

    /**
     * Maintenance clips part of a booking: the booking stands, and the customer is refunded for the
     * overlapping time. Nothing is refunded when nothing was paid yet — the notice still goes out so
     * the customer knows the seat is unavailable for that stretch.
     */
    private void refundOverlappingTime(Booking b, OffsetDateTime maintenanceStart, OffsetDateTime maintenanceEnd,
                                       String reason) {
        long refunded = cancellationService.refundTimeLostToMaintenance(b, maintenanceStart, maintenanceEnd, reason);

        java.time.ZoneId vn = java.time.ZoneId.of("Asia/Ho_Chi_Minh");
        notificationService.createNotification(b.getUserId(),
                "Không gian tạm bảo trì trong một phần thời gian đặt chỗ",
                String.format("Đơn %s bị ảnh hưởng bởi lịch bảo trì từ %s đến %s.%s Vui lòng liên hệ quầy lễ tân để được hỗ trợ.",
                        b.getBookingCode(),
                        maintenanceStart.atZoneSameInstant(vn).toLocalDateTime(),
                        maintenanceEnd.atZoneSameInstant(vn).toLocalDateTime(),
                        refunded > 0 ? " Phần thời gian này (" + RefundService.vnd(refunded) + ") sẽ được hoàn lại." : ""),
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
        
        // Closing a window that is under way ends it now; one that has not started keeps its dates,
        // because an end before the start breaks check_maintenance_time and used to fail with a 500.
        truncateIfRunning(maintenance);
        maintenance.setStatus(MaintenanceStatus.done);
        maintenanceRepository.save(maintenance);
        return mapToDto(maintenance, 0);
    }
    
    @Transactional
    public void deleteMaintenance(UUID maintenanceId) {
        WorkspaceMaintenanceEntity maintenance = maintenanceRepository.findById(maintenanceId)
                .orElseThrow(() -> new IllegalArgumentException("Maintenance not found"));
                
        truncateIfRunning(maintenance);
        // Instead of hard delete, we can set to canceled to unlock workspace if it was a mistake.
        maintenance.setStatus(MaintenanceStatus.canceled);
        maintenanceRepository.save(maintenance);
    }

    /** Ends a window that has already started at this moment; leaves a future one untouched. */
    private static void truncateIfRunning(WorkspaceMaintenanceEntity maintenance) {
        java.time.ZonedDateTime now = java.time.ZonedDateTime.now(java.time.ZoneOffset.UTC);
        if (now.isAfter(maintenance.getStartAt()) && now.isBefore(maintenance.getEndAt())) {
            maintenance.setEndAt(now);
        }
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
