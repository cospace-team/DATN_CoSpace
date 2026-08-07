package com.example.momosandbox.service;

import com.example.momosandbox.dto.api.BookingCreateRequest;
import com.example.momosandbox.dto.api.BookingDto;
import com.example.momosandbox.entity.Booking;
import com.example.momosandbox.entity.BookingStatus;
import com.example.momosandbox.entity.DurationUnit;
import com.example.momosandbox.entity.Payment;
import com.example.momosandbox.entity.WorkspaceEntity;
import com.example.momosandbox.repository.BookingRepository;
import com.example.momosandbox.repository.PaymentRepository;
import com.example.momosandbox.repository.WorkspaceEntityRepository;
import com.example.momosandbox.repository.BranchEntityRepository;
import com.example.momosandbox.entity.BranchEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import com.example.momosandbox.repository.UserRepository;
import com.example.momosandbox.repository.CheckinLogRepository;

@Service
public class BookingService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final PricingService pricingService;
    private final WorkspaceEntityRepository workspaceEntityRepository;
    private final BranchEntityRepository branchEntityRepository;
    private final UserRepository userRepository;
    private final CheckinLogRepository checkinLogRepository;

    public BookingService(BookingRepository bookingRepository, PaymentRepository paymentRepository, PricingService pricingService, WorkspaceEntityRepository workspaceEntityRepository, BranchEntityRepository branchEntityRepository, UserRepository userRepository, CheckinLogRepository checkinLogRepository) {
        this.bookingRepository = bookingRepository;
        this.paymentRepository = paymentRepository;
        this.pricingService = pricingService;
        this.workspaceEntityRepository = workspaceEntityRepository;
        this.branchEntityRepository = branchEntityRepository;
        this.userRepository = userRepository;
        this.checkinLogRepository = checkinLogRepository;
    }

    @Transactional
    public BookingDto createBooking(UUID userId, BookingCreateRequest req) {
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

        DurationUnit unit = req.getUnit();
        if (unit == null) {
            throw new IllegalArgumentException("unit is required");
        }
        long unitPrice = pricingService.getUnitPriceVnd(req.getBranchId(), req.getWorkspaceTypeId(), unit.name());
        long subtotal = unitPrice * (long) req.getUnitCount();
        long taxAmount = 0; // TODO: Implement tax calculation
        long serviceFeeAmount = 0; // TODO: Implement service fee calculation
        long totalAmount = subtotal + taxAmount + serviceFeeAmount;

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        Booking booking = Booking.builder()
                .id(UUID.randomUUID())
                .bookingCode(generateBookingCode())
                .userId(userId)
                .workspaceId(req.getWorkspaceId())
                .workspaceTypeId(req.getWorkspaceTypeId())
                .branchId(req.getBranchId())
                .status(BookingStatus.PENDING_PAYMENT)
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
    public com.example.momosandbox.dto.api.BookingWithDetailsDto getBookingByCode(String code, UUID branchId) {
        Booking booking = bookingRepository.findByBookingCode(code)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));

        if (!booking.getBranchId().equals(branchId)) {
            throw new IllegalArgumentException("Booking belongs to a different branch");
        }

        return toBookingWithDetailsDto(booking);
    }

    @Transactional(readOnly = true)
    public List<BookingDto> getBranchTodayBookings(UUID branchId) {
        OffsetDateTime todayStart = OffsetDateTime.now(ZoneOffset.UTC).withHour(0).withMinute(0).withSecond(0).withNano(0);
        OffsetDateTime todayEnd = todayStart.plusDays(1);
        
        return bookingRepository.findByBranchIdAndStartAtBetweenOrderByStartAtAsc(branchId, todayStart, todayEnd)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    private com.example.momosandbox.dto.api.BookingWithDetailsDto toBookingWithDetailsDto(Booking b) {
        BookingDto bookingDto = toDto(b);
        
        com.example.momosandbox.dto.api.UserProfileDto customer = userRepository.findById(b.getUserId())
                .map(u -> com.example.momosandbox.dto.api.UserProfileDto.builder()
                        .id(u.getId())
                        .email(u.getEmail())
                        .fullName(u.getFullName())
                        .phone(u.getPhone())
                        .build())
                .orElse(null);

        com.example.momosandbox.dto.api.SpaceDto.WorkspaceResponse workspace = workspaceEntityRepository.findById(b.getWorkspaceId())
                .map(w -> com.example.momosandbox.dto.api.SpaceDto.WorkspaceResponse.builder()
                        .id(w.getId())
                        .code(w.getCode())
                        .name(w.getName())
                        .workspaceTypeId(w.getWorkspaceTypeId().toString())
                        .capacity(w.getCapacity())
                        .svgElementId(w.getSvgElementId())
                        .status(w.getStatus().name())
                        .build())
                .orElse(null);

        Optional<com.example.momosandbox.entity.CheckinLog> activeCheckinOpt = checkinLogRepository.findActiveCheckinByBookingId(b.getId());
        
        com.example.momosandbox.dto.api.CheckinLogDto checkinLogDto = activeCheckinOpt.map(c -> com.example.momosandbox.dto.api.CheckinLogDto.builder()
                .id(c.getId())
                .bookingId(c.getBookingId())
                .staffUserId(c.getStaffUserId())
                .checkinAt(c.getCheckinAt().toString())
                .checkoutAt(c.getCheckoutAt() != null ? c.getCheckoutAt().toString() : null)
                .note(c.getNote())
                .build()).orElse(null);

        return com.example.momosandbox.dto.api.BookingWithDetailsDto.builder()
                .booking(bookingDto)
                .customer(customer)
                .workspace(workspace)
                .alreadyCheckedIn(activeCheckinOpt.isPresent())
                .activeCheckin(checkinLogDto)
                .build();
    }

    private BookingDto toDto(Booking b) {
        Optional<Payment> latestPaymentOpt = paymentRepository.findTopByBookingIdOrderByCreatedAtDesc(b.getId());
        
        String workspaceName = workspaceEntityRepository.findById(b.getWorkspaceId())
                .map(WorkspaceEntity::getName)
                .orElse(null);

        String branchName = branchEntityRepository.findById(b.getBranchId())
                .map(BranchEntity::getName)
                .orElse(null);

        BookingDto.BookingDtoBuilder builder = BookingDto.builder()
                .id(b.getId())
                .bookingCode(b.getBookingCode())
                .userId(b.getUserId())
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
