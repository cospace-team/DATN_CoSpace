package com.cospace.app.controller;

import com.cospace.app.entity.BookingServiceItem;
import com.cospace.app.entity.ExtraServiceEntity;
import com.cospace.app.service.BookingAddonService;
import com.cospace.app.service.ExtraServiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ExtraServiceController {

    private final ExtraServiceService extraServiceService;
    private final BookingAddonService bookingAddonService;

    @GetMapping("/extra-services")
    public ResponseEntity<List<ExtraServiceEntity>> getAvailableServices(
            @RequestParam(name = "branchId", required = false) UUID branchId) {
        return ResponseEntity.ok(extraServiceService.getAvailableServices(branchId));
    }

    @PostMapping("/extra-services")
    @PreAuthorize("hasAnyRole('BRANCH_ADMIN', 'SUPER_ADMIN', 'ADMIN', 'branch_admin', 'admin')")
    public ResponseEntity<ExtraServiceEntity> createService(@RequestBody ExtraServiceEntity service) {
        return ResponseEntity.status(HttpStatus.CREATED).body(extraServiceService.createService(service));
    }

    @PutMapping("/extra-services/{id}")
    @PreAuthorize("hasAnyRole('BRANCH_ADMIN', 'SUPER_ADMIN', 'ADMIN', 'branch_admin', 'admin')")
    public ResponseEntity<ExtraServiceEntity> updateService(
            @PathVariable UUID id,
            @RequestBody ExtraServiceEntity service) {
        return ResponseEntity.ok(extraServiceService.updateService(id, service));
    }

    @DeleteMapping("/extra-services/{id}")
    @PreAuthorize("hasAnyRole('BRANCH_ADMIN', 'SUPER_ADMIN', 'ADMIN', 'branch_admin', 'admin')")
    public ResponseEntity<?> deleteService(@PathVariable UUID id) {
        extraServiceService.deactivateService(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Dịch vụ đã được vô hiệu hóa."));
    }

    @PostMapping("/bookings/{bookingId}/addons")
    public ResponseEntity<BookingServiceItem> addServiceToBooking(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID bookingId,
            @RequestBody Map<String, Object> req) {
        UUID staffId = UUID.fromString(jwt.getSubject());
        UUID serviceId = UUID.fromString(req.get("serviceId").toString());
        int quantity = req.get("quantity") != null ? Integer.parseInt(req.get("quantity").toString()) : 1;

        BookingServiceItem item = bookingAddonService.addServiceToBooking(staffId, bookingId, serviceId, quantity);
        return ResponseEntity.status(HttpStatus.CREATED).body(item);
    }

    @GetMapping("/bookings/{bookingId}/addons")
    public ResponseEntity<List<BookingServiceItem>> getBookingAddons(@PathVariable UUID bookingId) {
        return ResponseEntity.ok(bookingAddonService.getBookingServices(bookingId));
    }
}
