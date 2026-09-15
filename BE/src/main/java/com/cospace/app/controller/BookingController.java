package com.cospace.app.controller;

import com.cospace.app.dto.api.BookingCreateRequest;
import com.cospace.app.dto.api.BookingDto;
import com.cospace.app.security.BranchAccessGuard;
import com.cospace.app.service.BookingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
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
    private final BranchAccessGuard branchAccessGuard;

    public BookingController(BookingService bookingService, BranchAccessGuard branchAccessGuard) {
        this.bookingService = bookingService;
        this.branchAccessGuard = branchAccessGuard;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BookingDto create(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody BookingCreateRequest req) {
        UUID userId = requireSubject(jwt);
        return bookingService.createBooking(userId, req);
    }

    /** Price breakdown (membership + promotion discounts) before the booking is created. */
    @PostMapping("/quote")
    public com.cospace.app.dto.api.PromotionDto.QuoteResponse quote(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody com.cospace.app.dto.api.PromotionDto.QuoteRequest req) {
        return bookingService.quote(requireSubject(jwt), req);
    }

    @GetMapping("/my")
    public Object myBookings(
            @AuthenticationPrincipal Jwt jwt,
            @org.springframework.web.bind.annotation.RequestParam(value = "page", required = false) Integer page,
            @org.springframework.web.bind.annotation.RequestParam(value = "size", required = false, defaultValue = "10") Integer size) {
        UUID userId = requireSubject(jwt);
        if (page != null) {
            // Paginated: FE sends ?page=0&size=10
            return bookingService.listMyBookings(userId,
                    org.springframework.data.domain.PageRequest.of(page, Math.min(size, 50)));
        }
        // Backward compatible: return full list (chatbot, legacy)
        return bookingService.listMyBookings(userId);
    }

    @GetMapping("/{id}")
    public BookingDto getOne(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("id") UUID id) {
        UUID userId = requireSubject(jwt);
        return bookingService.getMyBooking(userId, id);
    }

    @GetMapping("/code/{code}")
    public com.cospace.app.dto.api.BookingWithDetailsDto getByCode(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("code") String code,
            @org.springframework.web.bind.annotation.RequestParam("branchId") UUID branchId) {
        UUID verifiedBranchId = branchAccessGuard.requireBranchAccess(jwt, branchId);
        return bookingService.getBookingByCode(code, verifiedBranchId);
    }

    @GetMapping("/branch-today")
    public List<BookingDto> getBranchTodayBookings(
            @AuthenticationPrincipal Jwt jwt,
            @org.springframework.web.bind.annotation.RequestParam("branchId") UUID branchId) {
        UUID verifiedBranchId = branchAccessGuard.requireBranchAccess(jwt, branchId);
        return bookingService.getBranchTodayBookings(verifiedBranchId);
    }

    private UUID requireSubject(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            throw new IllegalArgumentException("Missing JWT subject");
        }
        return UUID.fromString(jwt.getSubject());
    }
}
