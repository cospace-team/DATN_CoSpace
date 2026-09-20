package com.cospace.app.controller;

import com.cospace.app.dto.api.BookingDto;
import com.cospace.app.dto.api.StaffBookingCreateRequest;
import com.cospace.app.service.BookingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/staff/bookings")
public class StaffBookingController {

    private final BookingService bookingService;

    private final com.cospace.app.service.UserService userService;
    private final com.cospace.app.security.BranchAccessGuard branchAccessGuard;
    private final com.cospace.app.service.CancellationService cancellationService;
    private final com.cospace.app.service.BookingAddonService bookingAddonService;
    private final com.cospace.app.service.AuditLogService auditLogService;
    private final jakarta.servlet.http.HttpServletRequest httpServletRequest;

    public StaffBookingController(BookingService bookingService, com.cospace.app.service.UserService userService,
                                  com.cospace.app.security.BranchAccessGuard branchAccessGuard,
                                  com.cospace.app.service.CancellationService cancellationService,
                                  com.cospace.app.service.BookingAddonService bookingAddonService,
                                  com.cospace.app.service.AuditLogService auditLogService,
                                  jakarta.servlet.http.HttpServletRequest httpServletRequest) {
        this.bookingService = bookingService;
        this.userService = userService;
        this.branchAccessGuard = branchAccessGuard;
        this.cancellationService = cancellationService;
        this.bookingAddonService = bookingAddonService;
        this.auditLogService = auditLogService;
        this.httpServletRequest = httpServletRequest;
    }

    /**
     * Cancels a booking on the customer's behalf. Since a customer cannot cancel once their booking
     * has started, this is the counter's way of handling the cases that reach it in person — and the
     * only way to waive the penalty when the fault is the branch's. Every call is audited.
     */
    @PostMapping("/{bookingId}/cancel")
    @PreAuthorize("hasAnyRole('staff', 'branch_admin')")
    public com.cospace.app.entity.BookingCancellation cancelForCustomer(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID bookingId,
            @Valid @RequestBody com.cospace.app.dto.api.StaffCancelRequest req) {
        UUID staffId = requireSubject(jwt);
        com.cospace.app.entity.Booking booking = bookingAddonService.requireBooking(bookingId);
        branchAccessGuard.requireAccessToBranch(jwt, booking.getBranchId());

        com.cospace.app.entity.BookingCancellation cancellation =
                cancellationService.cancelByStaff(staffId, bookingId, req.getReason(), req.isWaivePenalty());

        java.util.Map<String, Object> values = new java.util.HashMap<>();
        values.put("bookingCode", booking.getBookingCode());
        values.put("reason", cancellation.getReason());
        values.put("waivePenalty", req.isWaivePenalty());
        values.put("refundPercent", cancellation.getRefundPercent());
        values.put("refundAmount", cancellation.getRefundAmount());
        auditLogService.log(httpServletRequest, staffId, "CANCEL_FOR_CUSTOMER", "bookings", bookingId, null, values);

        return cancellation;
    }

    @PostMapping("/walkin")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('staff', 'branch_admin')")
    public BookingDto createWalkinBooking(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody StaffBookingCreateRequest req) {
        UUID staffId = requireSubject(jwt);
        // Checked before anything is written, so a rejected request never leaves a walk-in user behind.
        branchAccessGuard.requireAccessToBranch(jwt, bookingService.resolveBranchIdForWorkspace(req.getWorkspaceId()));

        UUID customerId = req.getCustomerId();
        if (customerId == null) {
            if (req.getCustomerName() == null || req.getCustomerPhone() == null) {
                throw new IllegalArgumentException("Vui lòng cung cấp customerId hoặc customerName và customerPhone");
            }
            com.cospace.app.dto.api.WalkinUserCreateRequest userReq = new com.cospace.app.dto.api.WalkinUserCreateRequest();
            userReq.setFullName(req.getCustomerName());
            userReq.setPhone(req.getCustomerPhone());
            com.cospace.app.dto.api.UserProfileDto newUser = userService.createWalkinUser(userReq);
            customerId = newUser.getId();
        }
        
        return bookingService.createWalkinBooking(staffId, customerId, req);
    }

    @GetMapping("/branches/{branchId}/workspaces-booking-status")
    @PreAuthorize("hasAnyRole('staff', 'branch_admin')")
    public org.springframework.http.ResponseEntity<java.util.List<com.cospace.app.dto.api.WorkspaceBookingStatusDto>> getWorkspaceBookingStatus(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID branchId,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String date) {
        UUID verifiedBranchId = branchAccessGuard.requireBranchAccess(jwt, branchId);
        return org.springframework.http.ResponseEntity.ok(bookingService.getWorkspaceBookingStatus(verifiedBranchId, date));
    }

    private UUID requireSubject(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            throw new IllegalArgumentException("Missing JWT subject");
        }
        return UUID.fromString(jwt.getSubject());
    }
}
