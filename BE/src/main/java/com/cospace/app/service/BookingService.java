package com.cospace.app.service;

import com.cospace.app.dto.api.BookingCreateRequest;
import com.cospace.app.dto.api.BookingDto;
import com.cospace.app.entity.Booking;
import com.cospace.app.entity.BookingStatus;
import com.cospace.app.entity.DurationUnit;
import com.cospace.app.entity.Payment;
import com.cospace.app.entity.WorkspaceEntity;
import com.cospace.app.repository.BookingRepository;
import com.cospace.app.repository.PaymentRepository;
import com.cospace.app.repository.WorkspaceEntityRepository;
import com.cospace.app.repository.BranchEntityRepository;
import com.cospace.app.entity.BranchEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import com.cospace.app.repository.UserRepository;
import com.cospace.app.repository.CheckinLogRepository;

import com.cospace.app.entity.BookingSource;

@Service
public class BookingService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final PricingService pricingService;
    private final WorkspaceEntityRepository workspaceEntityRepository;
    private final com.cospace.app.repository.FloorRepository floorRepository;
    private final BranchEntityRepository branchEntityRepository;
    private final UserRepository userRepository;
    private final CheckinLogRepository checkinLogRepository;
    private final jakarta.persistence.EntityManager entityManager;
    private final com.cospace.app.repository.WorkspaceMaintenanceRepository workspaceMaintenanceRepository;

    public BookingService(BookingRepository bookingRepository, PaymentRepository paymentRepository, PricingService pricingService, WorkspaceEntityRepository workspaceEntityRepository, com.cospace.app.repository.FloorRepository floorRepository, BranchEntityRepository branchEntityRepository, UserRepository userRepository, CheckinLogRepository checkinLogRepository, jakarta.persistence.EntityManager entityManager, com.cospace.app.repository.WorkspaceMaintenanceRepository workspaceMaintenanceRepository) {
        this.bookingRepository = bookingRepository;
        this.paymentRepository = paymentRepository;
        this.pricingService = pricingService;
        this.workspaceEntityRepository = workspaceEntityRepository;
        this.floorRepository = floorRepository;
        this.branchEntityRepository = branchEntityRepository;
        this.userRepository = userRepository;
        this.checkinLogRepository = checkinLogRepository;
        this.entityManager = entityManager;
        this.workspaceMaintenanceRepository = workspaceMaintenanceRepository;
    }

    @Transactional
    public BookingDto createBooking(UUID userId, BookingCreateRequest req) {
        return createBookingInternal(userId, req, BookingSource.web);
    }

    @Transactional
    public BookingDto createWalkinBooking(UUID staffId, UUID customerId, BookingCreateRequest req) {
        // Staff should check branch matching etc.
        // For now, assuming staff has permission.
        return createBookingInternal(customerId, req, BookingSource.counter);
    }

    private BookingDto createBookingInternal(UUID userId, BookingCreateRequest req, BookingSource source) {
        if (userId == null) {
            throw new IllegalArgumentException("Missing user id");
        }
        if (req.getStartAt() == null || req.getEndAt() == null) {
            throw new IllegalArgumentException("start_at/end_at is required");
        }
        if (!req.getEndAt().isAfter(req.getStartAt())) {
            throw new IllegalArgumentException("end_at must be after start_at");
        }
        if (req.getUnitCount() <= 0) {
            throw new IllegalArgumentException("unit_count must be >= 1");
        }

        // Rule #33: Rate limit - Tối đa 3 đơn chờ thanh toán cho mỗi người dùng
        int pendingCount = bookingRepository.countByUserIdAndStatus(userId, BookingStatus.PENDING_PAYMENT);
        if (pendingCount >= 3) {
            throw new IllegalStateException("Bạn đang có 3 đơn đặt chỗ chờ thanh toán. Vui lòng hoàn tất thanh toán hoặc hủy đơn cũ trước khi đặt tiếp.");
        }

        // Rule #42: Compute branchId server-side from Workspace -> Floor
        WorkspaceEntity ws = workspaceEntityRepository.findById(req.getWorkspaceId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy không gian làm việc."));
        com.cospace.app.entity.Floor floor = floorRepository.findById(ws.getFloorId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thông tin tầng của không gian làm việc."));
        UUID computedBranchId = floor.getBranchId();
        String computedWorkspaceTypeId = ws.getWorkspaceTypeId() != null 
                ? ws.getWorkspaceTypeId().toString() 
                : req.getWorkspaceTypeId();

        // Advisory Lock to prevent race condition
        String lockKeyStr = "booking:" + req.getWorkspaceId().toString();
        entityManager.createNativeQuery("SELECT pg_advisory_xact_lock(hashtext(:key))")
                .setParameter("key", lockKeyStr)
                .getSingleResult();

        // Overlap Booking Check
        OffsetDateTime startOffset = req.getStartAt().withOffsetSameInstant(ZoneOffset.UTC);
        OffsetDateTime endOffset = req.getEndAt().withOffsetSameInstant(ZoneOffset.UTC);

        List<BookingStatus> activeStatuses = java.util.Arrays.asList(
                BookingStatus.PENDING_PAYMENT, 
                BookingStatus.CONFIRMED, 
                BookingStatus.CHECKED_IN
        );
        
        List<Booking> overlappingBookings = bookingRepository.findOverlappingBookings(
                req.getWorkspaceId(), startOffset, endOffset, activeStatuses);
                
        if (!overlappingBookings.isEmpty()) {
            throw new IllegalArgumentException("Vị trí đã có người đặt trong khoảng thời gian này.");
        }
        
        List<com.cospace.app.entity.MaintenanceStatus> activeMaintenances = java.util.Arrays.asList(
                com.cospace.app.entity.MaintenanceStatus.active,
                com.cospace.app.entity.MaintenanceStatus.scheduled
        );
        
        List<com.cospace.app.entity.WorkspaceMaintenanceEntity> overlappingMaintenances = workspaceMaintenanceRepository.findOverlappingMaintenances(
                req.getWorkspaceId(), startOffset.toZonedDateTime(), endOffset.toZonedDateTime(), activeMaintenances);
                
        if (!overlappingMaintenances.isEmpty()) {
            throw new IllegalArgumentException("Vị trí đang được bảo trì trong khoảng thời gian này.");
        }

        DurationUnit unit = req.getUnit();
        if (unit == null) {
            throw new IllegalArgumentException("unit is required");
        }
        long unitPrice = pricingService.getUnitPriceVnd(computedBranchId, computedWorkspaceTypeId, unit.name());
        long subtotal = unitPrice * (long) req.getUnitCount();
        long taxAmount = 0;
        long serviceFeeAmount = 0;
        long totalAmount = subtotal + taxAmount + serviceFeeAmount;

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        boolean isContract = (unit == DurationUnit.week || unit == DurationUnit.month);

        Booking booking = Booking.builder()
                .id(UUID.randomUUID())
                .bookingCode(generateBookingCode())
                .userId(userId)
                .workspaceId(req.getWorkspaceId())
                .workspaceTypeId(computedWorkspaceTypeId)
                .branchId(computedBranchId)
                .status(BookingStatus.PENDING_PAYMENT)
                .source(source)
                .isContract(isContract)
                .startAt(req.getStartAt())
                .endAt(req.getEndAt())

                .unit(unit)
                .unitCount(req.getUnitCount())
                .pricePerUnit(unitPrice)
                .subtotalAmount(subtotal)
                .discountAmount(0)
                .addonAmount(0)
                .taxAmount(taxAmount)
                .serviceFeeAmount(serviceFeeAmount)
                .totalAmount(totalAmount)
                .paymentDeadlineAt(now.plusMinutes(15))
                .build();

        Booking savedBooking = bookingRepository.save(booking);
        return toDto(savedBooking);
    }

    @Transactional(readOnly = true)
    public List<BookingDto> listMyBookings(UUID userId) {
        if (userId == null) {
            throw new IllegalArgumentException("Missing user id");
        }
        return bookingRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public BookingDto getMyBooking(UUID userId, UUID bookingId) {
        return bookingRepository.findByIdAndUserId(bookingId, userId)
                .map(this::toDto)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));
    }

    @Transactional(readOnly = true)
    public com.cospace.app.dto.api.BookingWithDetailsDto getBookingByCode(String code, UUID branchId) {
        Booking booking = bookingRepository.findByBookingCode(code)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));

        if (!booking.getBranchId().equals(branchId)) {
            throw new IllegalArgumentException("Booking belongs to a different branch");
        }

        return toBookingWithDetailsDto(booking);
    }

    @Transactional(readOnly = true)
    public List<BookingDto> getBranchTodayBookings(UUID branchId) {
        java.time.ZoneId vnZone = java.time.ZoneId.of("Asia/Ho_Chi_Minh");
        java.time.ZonedDateTime todayVn = java.time.ZonedDateTime.now(vnZone).withHour(0).withMinute(0).withSecond(0).withNano(0);
        OffsetDateTime todayStart = todayVn.toOffsetDateTime().withOffsetSameInstant(ZoneOffset.UTC);
        OffsetDateTime todayEnd = todayVn.plusDays(1).toOffsetDateTime().withOffsetSameInstant(ZoneOffset.UTC);
        
        return bookingRepository.findByBranchIdAndStartAtBetweenOrderByStartAtAsc(branchId, todayStart, todayEnd)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }


    @Transactional(readOnly = true)
    public List<com.cospace.app.dto.api.WorkspaceBookingStatusDto> getWorkspaceBookingStatus(UUID branchId, String dateStr) {
        OffsetDateTime todayStart;
        if (dateStr == null || dateStr.isBlank()) {
            todayStart = OffsetDateTime.now(ZoneOffset.UTC).withHour(0).withMinute(0).withSecond(0).withNano(0);
        } else {
            // parse dateStr assuming format "yyyy-MM-dd"
            java.time.LocalDate date = java.time.LocalDate.parse(dateStr);
            todayStart = date.atStartOfDay(ZoneOffset.UTC).toOffsetDateTime();
        }
        OffsetDateTime todayEnd = todayStart.plusDays(1);

        // Fetch all workspaces in the branch
        List<WorkspaceEntity> workspaces = workspaceEntityRepository.findWorkspacesByBranchId(branchId);

        // Fetch all active/scheduled maintenances for this branch
        List<com.cospace.app.entity.WorkspaceMaintenanceEntity> activeMaintenances = workspaceMaintenanceRepository.findAllByBranchIdOrderByCreatedAtDesc(branchId).stream()
                .filter(m -> m.getStatus() == com.cospace.app.entity.MaintenanceStatus.active || m.getStatus() == com.cospace.app.entity.MaintenanceStatus.scheduled)
                .collect(Collectors.toList());

        // Fetch all bookings for this branch overlapping the requested date interval
        List<Booking> todayBookings = bookingRepository.findBookingsInInterval(branchId, todayStart, todayEnd);

        return workspaces.stream().map(ws -> {
            com.cospace.app.dto.api.WorkspaceBookingStatusDto dto = new com.cospace.app.dto.api.WorkspaceBookingStatusDto();
            dto.setWorkspaceId(ws.getId());
            dto.setName(ws.getName());
            dto.setCode(ws.getCode());
            dto.setWorkspaceStatus(ws.getStatus());
            dto.setWorkspaceTypeId(ws.getWorkspaceTypeId() != null ? ws.getWorkspaceTypeId().toString() : null);

            activeMaintenances.stream()
                    .filter(m -> m.getWorkspaceId().equals(ws.getId()))
                    .findFirst()
                    .ifPresent(m -> {
                        com.cospace.app.dto.api.MaintenanceResponseDto mDto = new com.cospace.app.dto.api.MaintenanceResponseDto();
                        mDto.setId(m.getId());
                        mDto.setWorkspaceId(m.getWorkspaceId());
                        mDto.setStartAt(m.getStartAt());
                        mDto.setEndAt(m.getEndAt());
                        mDto.setReason(m.getReason());
                        mDto.setStatus(m.getStatus());
                        dto.setActiveMaintenance(mDto);
                    });

            List<BookingDto> wsBookings = todayBookings.stream()
                    .filter(b -> b.getWorkspaceId().equals(ws.getId()))
                    .map(this::toDto)
                    .collect(Collectors.toList());
            dto.setTodayBookings(wsBookings);

            return dto;
        }).collect(Collectors.toList());
    }

    public com.cospace.app.dto.api.BookingWithDetailsDto toBookingWithDetailsDto(Booking b) {
        BookingDto bookingDto = toDto(b);
        
        com.cospace.app.dto.api.UserProfileDto customer = userRepository.findById(b.getUserId())
                .map(u -> com.cospace.app.dto.api.UserProfileDto.builder()
                        .id(u.getId())
                        .email(u.getEmail())
                        .fullName(u.getFullName())
                        .phone(u.getPhone())
                        .build())
                .orElse(null);

        com.cospace.app.dto.api.SpaceDto.WorkspaceResponse workspace = workspaceEntityRepository.findById(b.getWorkspaceId())
                .map(w -> com.cospace.app.dto.api.SpaceDto.WorkspaceResponse.builder()
                        .id(w.getId())
                        .code(w.getCode())
                        .name(w.getName())
                        .workspaceTypeId(w.getWorkspaceTypeId().toString())
                        .capacity(w.getCapacity())
                        .svgElementId(w.getSvgElementId())
                        .status(w.getStatus().name())
                        .build())
                .orElse(null);

        Optional<com.cospace.app.entity.CheckinLog> activeCheckinOpt = checkinLogRepository.findActiveCheckinByBookingId(b.getId());
        
        com.cospace.app.dto.api.CheckinLogDto checkinLogDto = activeCheckinOpt.map(c -> com.cospace.app.dto.api.CheckinLogDto.builder()
                .id(c.getId())
                .bookingId(c.getBookingId())
                .staffUserId(c.getStaffUserId())
                .checkinAt(c.getCheckinAt().toString())
                .checkoutAt(c.getCheckoutAt() != null ? c.getCheckoutAt().toString() : null)
                .note(c.getNote())
                .build()).orElse(null);

        return com.cospace.app.dto.api.BookingWithDetailsDto.builder()
                .booking(bookingDto)
                .customer(customer)
                .workspace(workspace)
                .alreadyCheckedIn(activeCheckinOpt.isPresent())
                .activeCheckin(checkinLogDto)
                .build();
    }

    public BookingDto toDto(Booking b) {
        Optional<Payment> latestPaymentOpt = paymentRepository.findTopByBookingIdOrderByCreatedAtDesc(b.getId());
        
        String workspaceName = workspaceEntityRepository.findById(b.getWorkspaceId())
                .map(WorkspaceEntity::getName)
                .orElse(null);

        String branchName = branchEntityRepository.findById(b.getBranchId())
                .map(BranchEntity::getName)
                .orElse(null);

        String customerName = userRepository.findById(b.getUserId())
                .map(com.cospace.app.entity.User::getFullName)
                .orElse(null);

        String customerPhone = userRepository.findById(b.getUserId())
                .map(com.cospace.app.entity.User::getPhone)
                .orElse(null);

        BookingDto.BookingDtoBuilder builder = BookingDto.builder()
                .id(b.getId())
                .bookingCode(b.getBookingCode())
                .userId(b.getUserId())
                .customerName(customerName)
                .customerPhone(customerPhone)
                .workspaceId(b.getWorkspaceId())
                .workspaceName(workspaceName)

                .workspaceTypeId(b.getWorkspaceTypeId())
                .branchId(b.getBranchId())
                .branchName(branchName)
                .status(b.getStatus())
                .startAt(b.getStartAt().toString())
                .endAt(b.getEndAt().toString())
                .unit(b.getUnit())
                .unitCount(b.getUnitCount())
                .isContract(b.isContract())
                .pricePerUnit(b.getPricePerUnit())
                .subtotalAmount(b.getSubtotalAmount())
                .discountAmount(b.getDiscountAmount())
                .addonAmount(b.getAddonAmount())
                .taxAmount(b.getTaxAmount())
                .serviceFeeAmount(b.getServiceFeeAmount())
                .totalAmount(b.getTotalAmount())
                .paymentDeadlineAt(b.getPaymentDeadlineAt() == null ? null : b.getPaymentDeadlineAt().toString())
                .createdAt(b.getCreatedAt().toString());

        latestPaymentOpt.ifPresent(p -> builder
                .paymentStatus(p.getStatus())
                .latestPaymentId(p.getId()));

        return builder.build();
    }


    @Transactional
    public BookingDto cancelBooking(UUID userId, UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));
        
        if (!booking.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Booking does not belong to user");
        }
        
        if (booking.getStatus() == BookingStatus.COMPLETED || booking.getStatus() == BookingStatus.CANCELLED) {
            throw new IllegalArgumentException("Booking cannot be cancelled in its current state");
        }
        
        booking.setStatus(BookingStatus.CANCELLED);
        booking = bookingRepository.save(booking);
        
        return toDto(booking);
    }

    private String generateBookingCode() {
        StringBuilder sb = new StringBuilder("WH-");
        for (int i = 0; i < 6; i++) {
            sb.append(CODE_CHARS.charAt(RANDOM.nextInt(CODE_CHARS.length())));
        }
        return sb.toString();
    }
}
