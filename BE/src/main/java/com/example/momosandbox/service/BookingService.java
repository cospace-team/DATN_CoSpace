package com.example.momosandbox.service;

import com.example.momosandbox.dto.api.BookingCreateRequest;
import com.example.momosandbox.entity.Booking;
import com.example.momosandbox.repository.BookingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class BookingService {

    private static final String[] ALLOWED_STATUSES = {
            "pending_payment",
            "confirmed",
            "checked_in",
            "completed",
            "canceled",
            "expired"
    };

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private final BookingRepository bookingRepository;
    private final PricingService pricingService;

    public BookingService(BookingRepository bookingRepository, PricingService pricingService) {
        this.bookingRepository = bookingRepository;
        this.pricingService = pricingService;
    }

    @Transactional
    public Booking createBooking(String userId, BookingCreateRequest req) {
        if (userId == null || userId.isBlank()) {
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

        String unit = normalizeUnit(req.getUnit());
        long unitPrice = pricingService.getUnitPriceVnd(req.getBranchId(), req.getWorkspaceTypeId(), unit);
        long subtotal = unitPrice * (long) req.getUnitCount();

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        Booking booking = Booking.builder()
                .id(UUID.randomUUID())
                .bookingCode(generateBookingCode())
                .userId(userId)
                .workspaceId(req.getWorkspaceId())
                .workspaceTypeId(req.getWorkspaceTypeId())
                .branchId(req.getBranchId())
                .startAt(req.getStartAt())
                .endAt(req.getEndAt())
                .unit(unit)
                .unitCount(req.getUnitCount())
                .status("pending_payment")
                .subtotalAmount(subtotal)
                .discountAmount(0)
                .addonAmount(0)
                .totalAmount(subtotal)
                .paymentDeadlineAt(now.plusMinutes(15))
                .source("web")
                .build();

        return bookingRepository.save(booking);
    }

    @Transactional(readOnly = true)
    public List<Booking> listMyBookings(String userId) {
        if (userId == null || userId.isBlank()) {
            throw new IllegalArgumentException("Missing user id");
        }
        return bookingRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional(readOnly = true)
    public Booking getMyBooking(String userId, UUID bookingId) {
        return bookingRepository.findByIdAndUserId(bookingId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));
    }

    @Transactional
    public Booking updateStatus(UUID bookingId, String newStatus) {
        String normalized = normalizeStatus(newStatus);
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));
        booking.setStatus(normalized);
        return bookingRepository.save(booking);
    }

    private String normalizeUnit(String unit) {
        if (unit == null) {
            throw new IllegalArgumentException("unit is required");
        }
        String normalized = unit.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "hour", "day", "week", "month" -> normalized;
            default -> throw new IllegalArgumentException("unit không hợp lệ: " + unit);
        };
    }

    private String normalizeStatus(String status) {
        if (status == null) {
            throw new IllegalArgumentException("status is required");
        }
        String normalized = status.trim().toLowerCase(Locale.ROOT);
        for (String allowed : ALLOWED_STATUSES) {
            if (allowed.equals(normalized)) {
                return normalized;
            }
        }
        throw new IllegalArgumentException("status không hợp lệ: " + status);
    }

    private String generateBookingCode() {
        StringBuilder sb = new StringBuilder("WH-");
        for (int i = 0; i < 6; i++) {
            sb.append(CODE_CHARS.charAt(RANDOM.nextInt(CODE_CHARS.length())));
        }
        return sb.toString();
    }
}
