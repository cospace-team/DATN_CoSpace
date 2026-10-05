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
    private final com.cospace.app.service.StaffBookingOpsService opsService;
    private final jakarta.servlet.http.HttpServletRequest httpServletRequest;

    public StaffBookingController(BookingService bookingService, com.cospace.app.service.UserService userService,
                                  com.cospace.app.security.BranchAccessGuard branchAccessGuard,
                                  com.cospace.app.service.CancellationService cancellationService,
                                  com.cospace.app.service.BookingAddonService bookingAddonService,
                                  com.cospace.app.service.AuditLogService auditLogService,
                                  com.cospace.app.service.StaffBookingOpsService opsService,
                                  jakarta.servlet.http.HttpServletRequest httpServletRequest) {
        this.bookingService = bookingService;
        this.userService = userService;
        this.branchAccessGuard = branchAccessGuard;
        this.cancellationService = cancellationService;
        this.bookingAddonService = bookingAddonService;
        this.auditLogService = auditLogService;
        this.opsService = opsService;
        this.httpServletRequest = httpServletRequest;
    }

    /**
     * Cancels a booking on the customer's behalf. Since a customer cannot cancel once their booking
     * has started, this is the counter's way of handling the cases that reach it in person — and the
     * only way to waive the penalty when the fault is the branch's. Every call is audited.
     */
    @PostMapping("/{bookingId}/cancel")
    @PreAuthorize("hasAnyRole('staff', 'branch_admin', 'super_admin', 'admin', 'STAFF', 'BRANCH_ADMIN', 'SUPER_ADMIN', 'ADMIN')")
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

    private static final String STAFF_ROLES =
            "hasAnyRole('staff', 'branch_admin', 'super_admin', 'admin', 'STAFF', 'BRANCH_ADMIN', 'SUPER_ADMIN', 'ADMIN')";

    /** Marks a guest who never came as a no-show once the check-in deadline has passed, freeing the seat. */
    @PostMapping("/{bookingId}/no-show")
    @PreAuthorize(STAFF_ROLES)
    public BookingDto markNoShow(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID bookingId,
                                 @Valid @RequestBody com.cospace.app.dto.api.StaffReasonRequest req) {
        UUID staffId = requireSubject(jwt);
        branchAccessGuard.requireAccessToBranch(jwt, opsService.branchOf(bookingId));
        com.cospace.app.entity.Booking booking = opsService.markNoShow(staffId, bookingId, req.getReason());
        auditLogService.log(httpServletRequest, staffId, "MARK_NO_SHOW", "bookings", bookingId,
                com.cospace.app.service.AuditLogService.values("status", "CONFIRMED"),
                com.cospace.app.service.AuditLogService.values("status", "NO_SHOW", "bookingCode", booking.getBookingCode(),
                        "reason", req.getReason().trim()));
        return bookingService.toDto(booking);
    }

    /** Reopens a no-show while its booked time has not run out (the guest did come after all). */
    @PostMapping("/{bookingId}/undo-no-show")
    @PreAuthorize(STAFF_ROLES)
    public BookingDto undoNoShow(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID bookingId,
                                 @Valid @RequestBody com.cospace.app.dto.api.StaffReasonRequest req) {
        UUID staffId = requireSubject(jwt);
        branchAccessGuard.requireAccessToBranch(jwt, opsService.branchOf(bookingId));
        com.cospace.app.entity.Booking booking = opsService.undoNoShow(staffId, bookingId, req.getReason());
        auditLogService.log(httpServletRequest, staffId, "UNDO_NO_SHOW", "bookings", bookingId,
                com.cospace.app.service.AuditLogService.values("status", "NO_SHOW"),
                com.cospace.app.service.AuditLogService.values("status", "CONFIRMED", "bookingCode", booking.getBookingCode(),
                        "reason", req.getReason().trim()));
        return bookingService.toDto(booking);
    }

    /** Moves a paid booking to another seat and/or start time (same length, same price). */
    @PostMapping("/{bookingId}/move")
    @PreAuthorize(STAFF_ROLES)
    public BookingDto move(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID bookingId,
                           @Valid @RequestBody com.cospace.app.dto.api.StaffMoveRequest req) {
        UUID staffId = requireSubject(jwt);
        branchAccessGuard.requireAccessToBranch(jwt, opsService.branchOf(bookingId));
        com.cospace.app.service.StaffBookingOpsService.MoveResult result =
                opsService.moveBooking(staffId, bookingId, req.getWorkspaceId(), req.getStartAt(), req.getReason());
        com.cospace.app.entity.Booking b = result.booking();
        java.util.Map<String, Object> after = new java.util.HashMap<>(com.cospace.app.service.AuditLogService.values(
                "workspaceId", b.getWorkspaceId(), "workspaceName", result.toWorkspaceName(),
                "startAt", b.getStartAt(), "endAt", b.getEndAt(), "bookingCode", b.getBookingCode()));
        after.put("reason", req.getReason().trim());
        auditLogService.log(httpServletRequest, staffId, "MOVE_BOOKING", "bookings", bookingId, result.oldValues(), after);
        return bookingService.toDto(b);
    }

    /** Bookings of a branch overlapping a time range, for the booking management pages. */
    @GetMapping
    @PreAuthorize("hasAnyRole('staff', 'branch_admin', 'super_admin', 'admin', 'STAFF', 'BRANCH_ADMIN', 'SUPER_ADMIN', 'ADMIN')")
    public java.util.List<BookingDto> listBranchBookings(
            @AuthenticationPrincipal Jwt jwt,
            @org.springframework.web.bind.annotation.RequestParam(value = "branchId", required = false) UUID branchId,
            @org.springframework.web.bind.annotation.RequestParam("from") @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.OffsetDateTime from,
            @org.springframework.web.bind.annotation.RequestParam("to") @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.OffsetDateTime to) {
        return bookingService.listBranchBookings(branchAccessGuard.requireBranchAccess(jwt, branchId), from, to);
    }

    /** What can be refunded on a booking, for the staff cancel / end-early dialog. */
    @GetMapping("/{bookingId}/refund-preview")
    @PreAuthorize("hasAnyRole('staff', 'branch_admin', 'super_admin', 'admin', 'STAFF', 'BRANCH_ADMIN', 'SUPER_ADMIN', 'ADMIN')")
    public com.cospace.app.service.CancellationService.StaffRefundPreview refundPreview(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID bookingId) {
        com.cospace.app.entity.Booking booking = bookingAddonService.requireBooking(bookingId);
        branchAccessGuard.requireAccessToBranch(jwt, booking.getBranchId());
        return cancellationService.previewStaffRefund(bookingId);
    }

    /**
     * Ends a booking in use early (incident, outage, a guest asked to leave), checks the guest out and
     * queues a refund for the refunds page. Every call is audited.
     */
    @PostMapping("/{bookingId}/end-early")
    @PreAuthorize("hasAnyRole('staff', 'branch_admin', 'super_admin', 'admin', 'STAFF', 'BRANCH_ADMIN', 'SUPER_ADMIN', 'ADMIN')")
    public java.util.Map<String, Object> endEarly(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID bookingId,
            @Valid @RequestBody com.cospace.app.dto.api.StaffEndEarlyRequest req) {
        UUID staffId = requireSubject(jwt);
        com.cospace.app.entity.Booking booking = bookingAddonService.requireBooking(bookingId);
        branchAccessGuard.requireAccessToBranch(jwt, booking.getBranchId());

        long refunded = cancellationService.endEarlyByStaff(staffId, bookingId, req.getReason(), req.getRefundMode(), req.getAmount());

        java.util.Map<String, Object> values = new java.util.HashMap<>();
        values.put("bookingCode", booking.getBookingCode());
        values.put("reason", req.getReason().trim());
        values.put("refundMode", String.valueOf(req.getRefundMode()));
        values.put("refundAmount", refunded);
        auditLogService.log(httpServletRequest, staffId, "END_EARLY_FOR_CUSTOMER", "bookings", bookingId, null, values);

        return java.util.Map.of("bookingCode", booking.getBookingCode(), "refundAmount", refunded);
    }

    @PostMapping("/walkin")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('staff', 'branch_admin', 'super_admin', 'admin', 'STAFF', 'BRANCH_ADMIN', 'SUPER_ADMIN', 'ADMIN')")
    // One transaction for the guest account and the booking: when the booking is refused (seat
    // taken, outside opening hours…) the guest account created for it is rolled back too.
    @org.springframework.transaction.annotation.Transactional
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
    @PreAuthorize("hasAnyRole('staff', 'branch_admin', 'super_admin', 'admin', 'STAFF', 'BRANCH_ADMIN', 'SUPER_ADMIN', 'ADMIN')")
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
