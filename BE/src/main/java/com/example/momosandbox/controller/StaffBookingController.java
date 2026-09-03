package com.example.momosandbox.controller;

import com.example.momosandbox.dto.api.BookingDto;
import com.example.momosandbox.dto.api.StaffBookingCreateRequest;
import com.example.momosandbox.service.BookingService;
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

    private final com.example.momosandbox.service.UserService userService;

    public StaffBookingController(BookingService bookingService, com.example.momosandbox.service.UserService userService) {
        this.bookingService = bookingService;
        this.userService = userService;
    }

    @PostMapping("/walkin")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('staff', 'branch_admin')")
    public BookingDto createWalkinBooking(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody StaffBookingCreateRequest req) {
        UUID staffId = requireSubject(jwt);
        
        UUID customerId = req.getCustomerId();
        if (customerId == null) {
            if (req.getCustomerName() == null || req.getCustomerPhone() == null) {
                throw new IllegalArgumentException("Vui lòng cung cấp customerId hoặc customerName và customerPhone");
            }
            com.example.momosandbox.dto.api.WalkinUserCreateRequest userReq = new com.example.momosandbox.dto.api.WalkinUserCreateRequest();
            userReq.setFullName(req.getCustomerName());
            userReq.setPhone(req.getCustomerPhone());
            com.example.momosandbox.dto.api.UserProfileDto newUser = userService.createWalkinUser(userReq);
            customerId = newUser.getId();
        }
        
        return bookingService.createWalkinBooking(staffId, customerId, req);
    }

    @GetMapping("/branches/{branchId}/workspaces-booking-status")
    @PreAuthorize("hasAnyRole('staff', 'branch_admin')")
    public org.springframework.http.ResponseEntity<java.util.List<com.example.momosandbox.dto.api.WorkspaceBookingStatusDto>> getWorkspaceBookingStatus(
            @PathVariable UUID branchId,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String date) {
        return org.springframework.http.ResponseEntity.ok(bookingService.getWorkspaceBookingStatus(branchId, date));
    }

    private UUID requireSubject(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            throw new IllegalArgumentException("Missing JWT subject");
        }
        return UUID.fromString(jwt.getSubject());
    }
}
