package com.example.momosandbox.controller;

import com.example.momosandbox.dto.api.BookingCreateRequest;
import com.example.momosandbox.dto.api.BookingDto;
import com.example.momosandbox.entity.Booking;
import com.example.momosandbox.service.BookingService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @PostMapping
    public ResponseEntity<BookingDto> create(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody BookingCreateRequest req) {
        String userId = requireSubject(jwt);
        Booking booking = bookingService.createBooking(userId, req);
        return ResponseEntity.ok(toDto(booking));
    }

    @GetMapping("/my")
    public ResponseEntity<List<BookingDto>> myBookings(@AuthenticationPrincipal Jwt jwt) {
        String userId = requireSubject(jwt);
        List<BookingDto> items = bookingService.listMyBookings(userId).stream().map(this::toDto).toList();
        return ResponseEntity.ok(items);
    }

    @GetMapping("/{id}")
    public ResponseEntity<BookingDto> getOne(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("id") UUID id) {
        String userId = requireSubject(jwt);
        Booking booking = bookingService.getMyBooking(userId, id);
        return ResponseEntity.ok(toDto(booking));
    }

    private String requireSubject(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            throw new IllegalArgumentException("Missing JWT subject");
        }
        return jwt.getSubject();
    }

    private BookingDto toDto(Booking b) {
        return BookingDto.builder()
                .id(b.getId().toString())
                .bookingCode(b.getBookingCode())
                .userId(b.getUserId())
                .workspaceId(b.getWorkspaceId())
                .workspaceTypeId(b.getWorkspaceTypeId())
                .branchId(b.getBranchId())
                .startAt(b.getStartAt().toString())
                .endAt(b.getEndAt().toString())
                .unit(b.getUnit())
                .unitCount(b.getUnitCount())
                .status(b.getStatus())
                .subtotalAmount(b.getSubtotalAmount())
                .discountAmount(b.getDiscountAmount())
                .addonAmount(b.getAddonAmount())
                .totalAmount(b.getTotalAmount())
                .paymentDeadlineAt(b.getPaymentDeadlineAt() == null ? null : b.getPaymentDeadlineAt().toString())
                .source(b.getSource())
                .createdAt(b.getCreatedAt().toString())
                .build();
    }
}
