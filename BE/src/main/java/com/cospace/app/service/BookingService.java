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
    private final com.cospace.app.repository.BookingCancellationRepository bookingCancellationRepository;
    private final MembershipService membershipService;
    private final PromotionService promotionService;
    private final BookingAddonService bookingAddonService;
    private final BookingExpiryService bookingExpiryService;

    /** Business time zone: opening hours and "today" are always Vietnam local time, whatever the server runs in. */
    public static final java.time.ZoneId BUSINESS_ZONE = java.time.ZoneId.of("Asia/Ho_Chi_Minh");

    public BookingService(BookingRepository bookingRepository, PaymentRepository paymentRepository, PricingService pricingService, WorkspaceEntityRepository workspaceEntityRepository, com.cospace.app.repository.FloorRepository floorRepository, BranchEntityRepository branchEntityRepository, UserRepository userRepository, CheckinLogRepository checkinLogRepository, jakarta.persistence.EntityManager entityManager, com.cospace.app.repository.WorkspaceMaintenanceRepository workspaceMaintenanceRepository, com.cospace.app.repository.BookingCancellationRepository bookingCancellationRepository, MembershipService membershipService, PromotionService promotionService, BookingAddonService bookingAddonService, BookingExpiryService bookingExpiryService) {
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
        this.bookingCancellationRepository = bookingCancellationRepository;
        this.membershipService = membershipService;
        this.promotionService = promotionService;
        this.bookingAddonService = bookingAddonService;
        this.bookingExpiryService = bookingExpiryService;
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
        // Advisory Lock on user to prevent race condition: 2 concurrent requests both reading count=2
        entityManager.createNativeQuery("SELECT pg_advisory_xact_lock(hashtext(:key))")
                .setParameter("key", "rate_limit:" + userId.toString())
                .getSingleResult();
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

        if (req.getUnit() == null) {
            throw new IllegalArgumentException("unit is required");
        }
        validateSchedule(computedBranchId, req.getUnit(), req.getStartAt(), req.getEndAt(), OffsetDateTime.now(ZoneOffset.UTC));

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
        // An unpaid hold frees its slot the moment its 15 minutes run out, not at the scheduler's next run.
        OffsetDateTime checkedAt = OffsetDateTime.now(ZoneOffset.UTC);
        overlappingBookings = overlappingBookings.stream()
                .filter(b -> {
                    if (!BookingExpiryService.isExpiredHold(b, checkedAt)) return true;
                    // Releasing it re-reads the booking under a row lock: if a payment confirmed it
                    // in the meantime the hold stands and keeps blocking this slot.
                    return !bookingExpiryService.expire(b.getId(), checkedAt);
                })
                .collect(Collectors.toList());
        entityManager.flush();

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
        // The unit count is derived from the booked time span, never trusted from the client: a
        // request for 09:00-18:00 with unit=hour, unitCount=1 must still be charged 9 hours.
        int unitCount = computeUnitCount(unit, req.getStartAt(), req.getEndAt());
        long unitPrice = pricingService.getUnitPriceVnd(computedBranchId, computedWorkspaceTypeId, unit.name());
        long subtotal = unitPrice * (long) unitCount;
        DiscountBreakdown discounts = computeDiscounts(userId, computedBranchId, computedWorkspaceTypeId,
                subtotal, req.getPromotionCode(), true);
        // Add-ons ordered at checkout are priced from the catalogue and paid together with the booking.
        List<com.cospace.app.entity.BookingServiceItem> addonLines = bookingAddonService.priceLines(computedBranchId, req.getAddons());
        long addonAmount = BookingAddonService.total(addonLines);
        long taxAmount = 0;
        long serviceFeeAmount = 0;
        long totalAmount = Math.max(0, subtotal - discounts.totalDiscount()) + addonAmount + taxAmount + serviceFeeAmount;

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        boolean isContract = (unit == DurationUnit.week || unit == DurationUnit.month);
        // A booking fully covered by discounts has nothing to pay, so it is confirmed right away
        // instead of waiting on a payment that can never be made (gateways reject 0đ orders).
        boolean nothingToPay = totalAmount <= 0;

        Booking booking = Booking.builder()
                .id(UUID.randomUUID())
                .bookingCode(generateBookingCode())
                .userId(userId)
                .workspaceId(req.getWorkspaceId())
                .workspaceTypeId(computedWorkspaceTypeId)
                .branchId(computedBranchId)
                .status(nothingToPay ? BookingStatus.CONFIRMED : BookingStatus.PENDING_PAYMENT)
                .source(source)
                .isContract(isContract)
                .startAt(req.getStartAt())
                .endAt(req.getEndAt())

                .unit(unit)
                .unitCount(unitCount)
                .pricePerUnit(unitPrice)
                .subtotalAmount(subtotal)
                .discountAmount(discounts.totalDiscount())
                .membershipTierCode(discounts.tierCode())
                .membershipDiscountAmount(discounts.membershipDiscount())
                .promotionId(discounts.promotion() != null ? discounts.promotion().getId() : null)
                .promotionCode(discounts.promotion() != null ? discounts.promotion().getCode() : null)
                .promotionDiscountAmount(discounts.promotionDiscount())
                .addonAmount(addonAmount)
                .taxAmount(taxAmount)
                .serviceFeeAmount(serviceFeeAmount)
                .totalAmount(totalAmount)
                .paymentDeadlineAt(nothingToPay ? null : now.plusMinutes(15))
                .build();

        Booking savedBooking = bookingRepository.save(booking);
        bookingAddonService.attachToNewBooking(savedBooking, userId, addonLines);
        return toDto(savedBooking);
    }

    /** Discounts applied to a booking: membership tier first, then the promotion on what remains. */
    public record DiscountBreakdown(String tierCode, String tierName, int tierPercent, long membershipDiscount,
                                    com.cospace.app.entity.Promotion promotion, long promotionDiscount) {
        public long totalDiscount() {
            return membershipDiscount + promotionDiscount;
        }
    }

    private DiscountBreakdown computeDiscounts(UUID userId, UUID branchId, String workspaceTypeId, long subtotal,
                                               String promotionCode, boolean lockPromotion) {
        MembershipService.Standing standing = membershipService.refreshTier(userId);
        long membershipDiscount = subtotal * standing.discountPercent() / 100;
        long afterTier = subtotal - membershipDiscount;

        com.cospace.app.entity.Promotion promotion = null;
        long promotionDiscount = 0;
        if (promotionCode != null && !promotionCode.isBlank()) {
            PromotionService.AppliedPromotion applied = promotionService.apply(promotionCode, userId,
                    standing.tierCode(), branchId, parseUuidOrNull(workspaceTypeId), subtotal, afterTier, lockPromotion);
            promotion = applied.promotion();
            promotionDiscount = applied.discountAmount();
        }
        return new DiscountBreakdown(
                standing.currentTier() != null ? standing.tierCode() : null,
                standing.currentTier() != null ? standing.currentTier().getName() : null,
                standing.discountPercent(), membershipDiscount, promotion, promotionDiscount);
    }

    /**
     * Number of billable units covering [start, end): a started unit is charged in full, so
     * 2h30 by the hour is 3 hours and 25 hours by the day is 2 days. Months are calendar months.
     */
    public static int computeUnitCount(DurationUnit unit, OffsetDateTime start, OffsetDateTime end) {
        if (unit == null || start == null || end == null || !end.isAfter(start)) {
            throw new IllegalArgumentException("Khoảng thời gian đặt chỗ không hợp lệ.");
        }
        long seconds = java.time.Duration.between(start, end).getSeconds();
        long units = switch (unit) {
            case hour -> ceilDiv(seconds, 3_600);
            case day -> ceilDiv(seconds, 86_400);
            case week -> ceilDiv(seconds, 604_800);
            case month -> {
                long months = 0;
                while (start.plusMonths(months).isBefore(end)) months++;
                yield months;
            }
        };
        // Caps from UC-BOOK-01 and UC-BOOK-02 R8. Without them a single order could hold a seat
        // for years: the old ceiling of 10,000 units allowed a booking of 10,000 months.
        long max = switch (unit) {
            case hour -> 24;
            case day -> 30;
            case week -> 52;
            case month -> 12;
        };
        if (units < 1) {
            throw new IllegalArgumentException("Thời lượng đặt chỗ không hợp lệ.");
        }
        if (units > max) {
            throw new IllegalArgumentException("Mỗi đơn đặt chỗ tối đa " + max + " " + unitLabel(unit)
                    + ". Vui lòng chia thành nhiều đơn hoặc chọn đơn vị thời gian dài hơn.");
        }
        return (int) units;
    }

    private static String unitLabel(DurationUnit unit) {
        return switch (unit) {
            case hour -> "giờ";
            case day -> "ngày";
            case week -> "tuần";
            case month -> "tháng";
        };
    }

    private static long ceilDiv(long value, long divisor) {
        return (value + divisor - 1) / divisor;
    }

    /**
     * A booking must not start in the past (the current hour is still bookable, matching the hourly
     * slots the booking screens offer) and must respect the branch's opening hours, in Vietnam time:
     * an hourly booking lies within one opening day, a daily or longer one starts while the branch is open.
     */
    void validateSchedule(UUID branchId, DurationUnit unit, OffsetDateTime startAt, OffsetDateTime endAt, OffsetDateTime now) {
        if (startAt.isBefore(now.truncatedTo(java.time.temporal.ChronoUnit.HOURS))) {
            throw new IllegalArgumentException("Không thể đặt chỗ cho thời gian đã qua. Vui lòng chọn thời gian khác.");
        }
        BranchEntity branch = branchId != null ? branchEntityRepository.findById(branchId).orElse(null) : null;
        if (branch == null) {
            return;
        }
        if (branch.getStatus() != null && branch.getStatus() != BranchEntity.BranchStatus.active) {
            throw new IllegalArgumentException("Chi nhánh hiện không nhận đặt chỗ.");
        }
        java.time.LocalTime open = branch.getOpenTime();
        java.time.LocalTime close = branch.getCloseTime();
        // No hours configured, open around the clock, or opening past midnight: nothing to enforce here.
        if (open == null || close == null || !close.isAfter(open)) {
            return;
        }
        java.time.LocalDateTime start = startAt.atZoneSameInstant(BUSINESS_ZONE).toLocalDateTime();
        java.time.LocalDateTime end = endAt.atZoneSameInstant(BUSINESS_ZONE).toLocalDateTime();
        String hours = String.format("Chi nhánh mở cửa từ %s đến %s.", open, close);

        if (start.toLocalTime().isBefore(open) || !start.toLocalTime().isBefore(close)) {
            throw new IllegalArgumentException(hours + " Vui lòng chọn giờ bắt đầu trong giờ mở cửa.");
        }
        if (unit == DurationUnit.hour
                && (!end.toLocalDate().equals(start.toLocalDate()) || end.toLocalTime().isAfter(close))) {
            throw new IllegalArgumentException(hours + " Đặt theo giờ phải kết thúc trước giờ đóng cửa trong cùng ngày.");
        }
    }

    /** Branch a workspace belongs to (workspace → floor → branch), for access checks. */
    @Transactional(readOnly = true)
    public UUID resolveBranchIdForWorkspace(UUID workspaceId) {
        WorkspaceEntity ws = workspaceEntityRepository.findById(workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy không gian làm việc."));
        return floorRepository.findById(ws.getFloorId())
                .map(com.cospace.app.entity.Floor::getBranchId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thông tin tầng của không gian làm việc."));
    }

    /** Price preview for the checkout page — same pricing and discount rules as createBooking. */
    @Transactional
    public com.cospace.app.dto.api.PromotionDto.QuoteResponse quote(UUID userId, com.cospace.app.dto.api.PromotionDto.QuoteRequest req) {
        if (userId == null) {
            throw new IllegalArgumentException("Missing user id");
        }
        WorkspaceEntity ws = workspaceEntityRepository.findById(req.getWorkspaceId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy không gian làm việc."));
        com.cospace.app.entity.Floor floor = floorRepository.findById(ws.getFloorId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thông tin tầng của không gian làm việc."));
        String workspaceTypeId = ws.getWorkspaceTypeId() != null ? ws.getWorkspaceTypeId().toString() : null;

        DurationUnit unit;
        try {
            unit = DurationUnit.valueOf(req.getUnit().trim().toLowerCase(java.util.Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("unit không hợp lệ: " + req.getUnit());
        }
        int unitCount = computeUnitCount(unit, req.getStartAt(), req.getEndAt());
        validateSchedule(floor.getBranchId(), unit, req.getStartAt(), req.getEndAt(), OffsetDateTime.now(ZoneOffset.UTC));
        long unitPrice = pricingService.getUnitPriceVnd(floor.getBranchId(), workspaceTypeId, unit.name());
        long subtotal = unitPrice * (long) unitCount;
        DiscountBreakdown d = computeDiscounts(userId, floor.getBranchId(), workspaceTypeId, subtotal,
                req.getPromotionCode(), false);
        long addonAmount = BookingAddonService.total(bookingAddonService.priceLines(floor.getBranchId(), req.getAddons()));

        return com.cospace.app.dto.api.PromotionDto.QuoteResponse.builder()
                .pricePerUnit(unitPrice)
                .unitCount(unitCount)
                .subtotalAmount(subtotal)
                .membershipTierCode(d.tierCode())
                .membershipTierName(d.tierName())
                .membershipDiscountPercent(d.tierPercent())
                .membershipDiscountAmount(d.membershipDiscount())
                .promotionCode(d.promotion() != null ? d.promotion().getCode() : null)
                .promotionName(d.promotion() != null ? d.promotion().getName() : null)
                .promotionDiscountAmount(d.promotionDiscount())
                .discountAmount(d.totalDiscount())
                .addonAmount(addonAmount)
                .totalAmount(Math.max(0, subtotal - d.totalDiscount()) + addonAmount)
                .build();
    }

    private static UUID parseUuidOrNull(String value) {
        if (value == null) return null;
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    @Transactional(readOnly = true)
    public List<BookingDto> listMyBookings(UUID userId) {
        if (userId == null) {
            throw new IllegalArgumentException("Missing user id");
        }
        return toDtoList(bookingRepository.findByUserIdOrderByCreatedAtDesc(userId));
    }

    /** Paginated version for FE — avoids loading all bookings into memory. */
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<BookingDto> listMyBookings(UUID userId, org.springframework.data.domain.Pageable pageable) {
        if (userId == null) {
            throw new IllegalArgumentException("Missing user id");
        }
        org.springframework.data.domain.Page<Booking> page = bookingRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        List<BookingDto> dtos = toDtoList(page.getContent());
        return new org.springframework.data.domain.PageImpl<>(dtos, pageable, page.getTotalElements());
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
        
        // Use overlap logic to include bookings spanning across today (contracts, overnight stays)
        return toDtoList(bookingRepository.findBookingsInInterval(branchId, todayStart, todayEnd));
    }


    @Transactional(readOnly = true)
    public List<com.cospace.app.dto.api.WorkspaceBookingStatusDto> getWorkspaceBookingStatus(UUID branchId, String dateStr) {
        OffsetDateTime todayStart;
        java.time.LocalDate date = (dateStr == null || dateStr.isBlank())
                ? java.time.LocalDate.now(BUSINESS_ZONE)
                : java.time.LocalDate.parse(dateStr); // "yyyy-MM-dd", a Vietnam calendar day
        todayStart = date.atStartOfDay(BUSINESS_ZONE).toOffsetDateTime().withOffsetSameInstant(ZoneOffset.UTC);
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

    /**
     * Customer-facing availability: which time ranges a workspace is busy in, with no booking
     * owner identity or pricing exposed (unlike {@link #getWorkspaceBookingStatus}, which is
     * staff-only and carries customer PII).
     */
    @Transactional(readOnly = true)
    public List<com.cospace.app.dto.api.PublicWorkspaceAvailabilityDto> getPublicWorkspaceAvailability(
            UUID branchId, OffsetDateTime from, OffsetDateTime to) {
        List<WorkspaceEntity> workspaces = workspaceEntityRepository.findWorkspacesByBranchId(branchId);

        List<com.cospace.app.entity.WorkspaceMaintenanceEntity> maintenances =
                workspaceMaintenanceRepository.findAllByBranchIdOrderByCreatedAtDesc(branchId).stream()
                        .filter(m -> m.getStatus() == com.cospace.app.entity.MaintenanceStatus.active
                                || m.getStatus() == com.cospace.app.entity.MaintenanceStatus.scheduled)
                        .filter(m -> m.getStartAt().toOffsetDateTime().isBefore(to)
                                && m.getEndAt().toOffsetDateTime().isAfter(from))
                        .collect(Collectors.toList());

        List<BookingStatus> activeStatuses = java.util.Arrays.asList(
                BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN);

        List<Booking> intervalBookings = bookingRepository.findBookingsInInterval(branchId, from, to).stream()
                .filter(b -> activeStatuses.contains(b.getStatus()))
                .filter(b -> !BookingExpiryService.isExpiredHold(b, OffsetDateTime.now(ZoneOffset.UTC)))
                .collect(Collectors.toList());

        return workspaces.stream().map(ws -> {
            List<com.cospace.app.dto.api.PublicWorkspaceAvailabilityDto.BusySlot> slots = new java.util.ArrayList<>();

            intervalBookings.stream()
                    .filter(b -> b.getWorkspaceId().equals(ws.getId()))
                    .forEach(b -> slots.add(com.cospace.app.dto.api.PublicWorkspaceAvailabilityDto.BusySlot.builder()
                            .startAt(b.getStartAt())
                            .endAt(b.getEndAt())
                            .reason("booking")
                            .build()));

            maintenances.stream()
                    .filter(m -> m.getWorkspaceId().equals(ws.getId()))
                    .forEach(m -> slots.add(com.cospace.app.dto.api.PublicWorkspaceAvailabilityDto.BusySlot.builder()
                            .startAt(m.getStartAt().toOffsetDateTime())
                            .endAt(m.getEndAt().toOffsetDateTime())
                            .reason("maintenance")
                            .build()));

            return com.cospace.app.dto.api.PublicWorkspaceAvailabilityDto.builder()
                    .workspaceId(ws.getId())
                    .status(ws.getStatus() != null ? ws.getStatus().name() : null)
                    .busySlots(slots)
                    .build();
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

        // F-02/F-05 fix: single findById instead of two separate calls for name and phone
        com.cospace.app.entity.User customer = userRepository.findById(b.getUserId()).orElse(null);
        String customerName = customer != null ? customer.getFullName() : null;
        String customerPhone = customer != null ? customer.getPhone() : null;

        return buildDto(b, workspaceName, branchName, customerName, customerPhone, latestPaymentOpt);
    }

    /**
     * Batch-optimized conversion: prefetches all related entities in bulk to avoid N+1 queries.
     * Use this for list APIs (listMyBookings, getBranchTodayBookings) instead of stream().map(toDto).
     */
    public List<BookingDto> toDtoList(List<Booking> bookings) {
        if (bookings.isEmpty()) return List.of();

        // Collect all unique IDs
        java.util.Set<UUID> workspaceIds = new java.util.HashSet<>();
        java.util.Set<UUID> branchIds = new java.util.HashSet<>();
        java.util.Set<UUID> userIds = new java.util.HashSet<>();
        java.util.Set<UUID> bookingIds = new java.util.HashSet<>();
        for (Booking b : bookings) {
            workspaceIds.add(b.getWorkspaceId());
            branchIds.add(b.getBranchId());
            userIds.add(b.getUserId());
            bookingIds.add(b.getId());
        }

        // Batch fetch all related entities (1 query each instead of N)
        java.util.Map<UUID, String> workspaceNames = workspaceEntityRepository.findAllById(workspaceIds)
                .stream().collect(java.util.stream.Collectors.toMap(WorkspaceEntity::getId, WorkspaceEntity::getName));
        java.util.Map<UUID, String> branchNames = branchEntityRepository.findAllById(branchIds)
                .stream().collect(java.util.stream.Collectors.toMap(BranchEntity::getId, BranchEntity::getName));
        java.util.Map<UUID, com.cospace.app.entity.User> users = userRepository.findAllById(userIds)
                .stream().collect(java.util.stream.Collectors.toMap(com.cospace.app.entity.User::getId, u -> u));

        // Batch fetch latest payments per booking
        java.util.Map<UUID, Payment> latestPayments = new java.util.HashMap<>();
        for (UUID bid : bookingIds) {
            paymentRepository.findTopByBookingIdOrderByCreatedAtDesc(bid).ifPresent(p -> latestPayments.put(bid, p));
        }

        // Batch fetch cancellations for cancelled bookings
        java.util.Map<UUID, com.cospace.app.entity.BookingCancellation> cancellations = new java.util.HashMap<>();
        for (Booking b : bookings) {
            if (b.getStatus() == BookingStatus.CANCELLED) {
                bookingCancellationRepository.findByBookingId(b.getId()).ifPresent(c -> cancellations.put(b.getId(), c));
            }
        }

        List<BookingDto> result = new java.util.ArrayList<>(bookings.size());
        for (Booking b : bookings) {
            com.cospace.app.entity.User customer = users.get(b.getUserId());
            BookingDto dto = buildDto(b,
                    workspaceNames.get(b.getWorkspaceId()),
                    branchNames.get(b.getBranchId()),
                    customer != null ? customer.getFullName() : null,
                    customer != null ? customer.getPhone() : null,
                    Optional.ofNullable(latestPayments.get(b.getId())));

            // Attach cancellation info if present
            if (b.getStatus() == BookingStatus.CANCELLED) {
                com.cospace.app.entity.BookingCancellation c = cancellations.get(b.getId());
                if (c != null) {
                    dto = dto.toBuilder()
                            .cancellationReason(c.getReason())
                            .refundPercent(c.getRefundPercent())
                            .refundAmount(c.getRefundAmount())
                            .penaltyAmount(c.getPenaltyAmount())
                            .refundStatus(c.getRefundStatus())
                            .cancelledAt(c.getCreatedAt() != null ? c.getCreatedAt().toString() : null)
                            .policyName(c.getAppliedRuleJson() != null && c.getAppliedRuleJson().get("policy_name") != null
                                    ? c.getAppliedRuleJson().get("policy_name").toString() : null)
                            .build();
                }
            }
            result.add(dto);
        }
        return result;
    }

    private BookingDto buildDto(Booking b, String workspaceName, String branchName,
                                String customerName, String customerPhone, Optional<Payment> latestPaymentOpt) {
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
                .membershipTierCode(b.getMembershipTierCode())
                .membershipDiscountAmount(b.getMembershipDiscountAmount())
                .promotionCode(b.getPromotionCode())
                .promotionDiscountAmount(b.getPromotionDiscountAmount())
                .addonAmount(b.getAddonAmount())
                .taxAmount(b.getTaxAmount())
                .serviceFeeAmount(b.getServiceFeeAmount())
                .totalAmount(b.getTotalAmount())
                .paymentDeadlineAt(b.getPaymentDeadlineAt() == null ? null : b.getPaymentDeadlineAt().toString())
                .createdAt(b.getCreatedAt().toString());

        latestPaymentOpt.ifPresent(p -> builder
                .paymentStatus(p.getStatus())
                .latestPaymentId(p.getId()));

        if (b.getStatus() == BookingStatus.CANCELLED) {
            bookingCancellationRepository.findByBookingId(b.getId()).ifPresent(c -> {
                builder.cancellationReason(c.getReason());
                builder.refundPercent(c.getRefundPercent());
                builder.refundAmount(c.getRefundAmount());
                builder.penaltyAmount(c.getPenaltyAmount());
                builder.refundStatus(c.getRefundStatus());
                builder.cancelledAt(c.getCreatedAt() != null ? c.getCreatedAt().toString() : null);
                if (c.getAppliedRuleJson() != null && c.getAppliedRuleJson().get("policy_name") != null) {
                    builder.policyName(c.getAppliedRuleJson().get("policy_name").toString());
                }
            });
        }

        return builder.build();
    }


    private String generateBookingCode() {
        StringBuilder sb = new StringBuilder("WH-");
        for (int i = 0; i < 6; i++) {
            sb.append(CODE_CHARS.charAt(RANDOM.nextInt(CODE_CHARS.length())));
        }
        return sb.toString();
    }
}
