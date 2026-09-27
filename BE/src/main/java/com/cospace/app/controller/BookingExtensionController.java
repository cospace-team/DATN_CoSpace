package com.cospace.app.controller;

import com.cospace.app.dto.api.BookingAddonDto;
import com.cospace.app.dto.api.BookingExtensionDto;
import com.cospace.app.entity.Booking;
import com.cospace.app.security.BranchAccessGuard;
import com.cospace.app.service.AuditLogService;
import com.cospace.app.service.BookingAddonService;
import com.cospace.app.service.BookingExtensionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/**
 * Extra hours (customer who owns the booking, or staff of its branch) and the late check-out
 * surcharge (staff only, at check-out). Both are charged on the booking's running tab.
 */
@RestController
@RequestMapping("/api/bookings/{bookingId}")
@RequiredArgsConstructor
public class BookingExtensionController {

    private final BookingExtensionService extensionService;
    private final BookingAddonService bookingAddonService;
    private final BranchAccessGuard branchAccessGuard;
    private final AuditLogService auditLogService;
    private final HttpServletRequest httpServletRequest;

    @GetMapping("/extension/quote")
    public BookingExtensionDto.QuoteResponse quote(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID bookingId,
            @RequestParam(value = "hours", defaultValue = "1") int hours) {
        requireOwnerOrBranchStaff(jwt, bookingId);
        return extensionService.quote(bookingId, hours);
    }

    @PostMapping("/extension")
    public BookingAddonDto.TabResponse extend(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID bookingId,
            @Valid @RequestBody BookingExtensionDto.ExtendRequest req) {
        requireOwnerOrBranchStaff(jwt, bookingId);
        extensionService.extend(callerId(jwt), bookingId, req.getHours());
        auditLogService.log(httpServletRequest, callerId(jwt), "EXTEND", "bookings", bookingId, null,
                Map.of("hours", req.getHours()));
        return bookingAddonService.getTab(bookingId);
    }

    @GetMapping("/late-fee")
    public BookingExtensionDto.LateFeeResponse lateFee(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID bookingId) {
        requireBranchStaff(jwt, bookingId);
        return extensionService.lateFee(bookingId);
    }

    @PostMapping("/late-fee")
    public BookingAddonDto.TabResponse chargeLateFee(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID bookingId) {
        requireBranchStaff(jwt, bookingId);
        long amount = extensionService.chargeLateFee(callerId(jwt), bookingId);
        if (amount > 0) {
            auditLogService.log(httpServletRequest, callerId(jwt), "LATE_FEE", "bookings", bookingId, null,
                    Map.of("amount", amount));
        }
        return bookingAddonService.getTab(bookingId);
    }

    private void requireOwnerOrBranchStaff(Jwt jwt, UUID bookingId) {
        Booking booking = bookingAddonService.requireBooking(bookingId);
        if (!booking.getUserId().equals(callerId(jwt))) {
            branchAccessGuard.requireAccessToBranch(jwt, booking.getBranchId());
        }
    }

    private void requireBranchStaff(Jwt jwt, UUID bookingId) {
        branchAccessGuard.requireAccessToBranch(jwt, bookingAddonService.requireBooking(bookingId).getBranchId());
    }

    private static UUID callerId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
