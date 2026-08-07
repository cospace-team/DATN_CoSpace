package com.example.momosandbox.controller;

import com.example.momosandbox.dto.api.BookingCreateRequest;
import com.example.momosandbox.dto.api.BookingDto;
import com.example.momosandbox.service.BookingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
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
    @ResponseStatus(HttpStatus.CREATED)
    public BookingDto create(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody BookingCreateRequest req) {
        UUID userId = requireSubject(jwt);
        return bookingService.createBooking(userId, req);
    }

    @GetMapping("/my")
    public List<BookingDto> myBookings(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = requireSubject(jwt);
        return bookingService.listMyBookings(userId);
    }

    @GetMapping("/{id}")
    public BookingDto getOne(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("id") UUID id) {
        UUID userId = requireSubject(jwt);
        return bookingService.getMyBooking(userId, id);
    }

    @PostMapping("/{id}/cancel")
    public BookingDto cancel(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("id") UUID id) {
        UUID userId = requireSubject(jwt);
        return bookingService.cancelBooking(userId, id);
    }

    @GetMapping("/code/{code}")
    public com.example.momosandbox.dto.api.BookingWithDetailsDto getByCode(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("code") String code,
            @org.springframework.web.bind.annotation.RequestParam("branchId") UUID branchId) {
        // Staff/Branch Admin auth validation can be done in security config or here.
        // Assuming branchId is passed as parameter to verify the booking belongs to their branch.
        return bookingService.getBookingByCode(code, branchId);
    }

    @GetMapping("/branch-today")
    public List<BookingDto> getBranchTodayBookings(
            @AuthenticationPrincipal Jwt jwt,
            @org.springframework.web.bind.annotation.RequestParam("branchId") UUID branchId) {
        return bookingService.getBranchTodayBookings(branchId);
    }

    private UUID requireSubject(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            throw new IllegalArgumentException("Missing JWT subject");
        }
        return UUID.fromString(jwt.getSubject());
    }
}
