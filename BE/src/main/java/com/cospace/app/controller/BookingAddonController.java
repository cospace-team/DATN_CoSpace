package com.cospace.app.controller;

import com.cospace.app.dto.api.BookingAddonDto;
import com.cospace.app.entity.Booking;
import com.cospace.app.entity.BookingServiceItem;
import com.cospace.app.entity.Payment;
import com.cospace.app.security.BranchAccessGuard;
import com.cospace.app.service.AuditLogService;
import com.cospace.app.service.BookingAddonService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Running tab of a booking. The customer who owns the booking may view it and order services;
 * cancelling a line and collecting payment are counter operations for staff of the booking's branch.
 */
@RestController
@RequestMapping("/api/bookings/{bookingId}/addons")
@RequiredArgsConstructor
public class BookingAddonController {

    private final BookingAddonService bookingAddonService;
    private final BranchAccessGuard branchAccessGuard;
    private final AuditLogService auditLogService;
    private final HttpServletRequest httpServletRequest;

    @GetMapping
    public ResponseEntity<BookingAddonDto.TabResponse> getTab(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID bookingId) {
        requireOwnerOrBranchStaff(jwt, bookingId);
        return ResponseEntity.ok(bookingAddonService.getTab(bookingId));
    }

    @PostMapping
    public ResponseEntity<BookingAddonDto.TabResponse> addService(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID bookingId,
            @Valid @RequestBody BookingAddonDto.LineRequest req) {
        requireOwnerOrBranchStaff(jwt, bookingId);
        BookingServiceItem item = bookingAddonService.addServiceToBooking(callerId(jwt), bookingId, req.getServiceId(), req.getQuantity());
        auditLogService.log(httpServletRequest, callerId(jwt), "CREATE", "booking_services", item.getId(), null,
                Map.of("bookingId", bookingId, "serviceId", item.getServiceId(), "quantity", item.getQuantity(), "subtotal", item.getSubtotal()));
        return ResponseEntity.status(HttpStatus.CREATED).body(bookingAddonService.getTab(bookingId));
    }

    @DeleteMapping("/{itemId}")
    public ResponseEntity<BookingAddonDto.TabResponse> voidItem(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID bookingId,
            @PathVariable UUID itemId) {
        Booking booking = bookingAddonService.requireBooking(bookingId);
        branchAccessGuard.requireAccessToBranch(jwt, booking.getBranchId());
        bookingAddonService.voidItem(callerId(jwt), bookingId, itemId);
        auditLogService.log(httpServletRequest, callerId(jwt), "VOID", "booking_services", itemId,
                Map.of("status", BookingServiceItem.STATUS_UNPAID), Map.of("status", BookingServiceItem.STATUS_VOID));
        return ResponseEntity.ok(bookingAddonService.getTab(bookingId));
    }

    @PostMapping("/settle")
    public ResponseEntity<BookingAddonDto.TabResponse> settle(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID bookingId,
            @RequestBody(required = false) BookingAddonDto.SettleRequest req) {
        Booking booking = bookingAddonService.requireBooking(bookingId);
        branchAccessGuard.requireAccessToBranch(jwt, booking.getBranchId());
        Payment payment = bookingAddonService.settleTab(callerId(jwt), bookingId, req != null ? req.getMethod() : null);
        if (payment == null) {
            throw new IllegalStateException("Đơn không còn dịch vụ nào chưa thanh toán.");
        }
        Map<String, Object> values = new HashMap<>();
        values.put("bookingId", bookingId);
        values.put("amount", payment.getAmount());
        values.put("method", payment.getMethod());
        auditLogService.log(httpServletRequest, callerId(jwt), "SETTLE_TAB", "payments", payment.getId(), null, values);
        return ResponseEntity.ok(bookingAddonService.getTab(bookingId));
    }

    private void requireOwnerOrBranchStaff(Jwt jwt, UUID bookingId) {
        Booking booking = bookingAddonService.requireBooking(bookingId);
        if (!booking.getUserId().equals(callerId(jwt))) {
            branchAccessGuard.requireAccessToBranch(jwt, booking.getBranchId());
        }
    }

    private static UUID callerId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
