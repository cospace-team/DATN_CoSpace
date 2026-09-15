package com.cospace.app.controller;

import com.cospace.app.entity.BookingServiceItem;
import com.cospace.app.entity.ExtraServiceEntity;
import com.cospace.app.repository.ExtraServiceRepository;
import com.cospace.app.security.BranchAccessGuard;
import com.cospace.app.service.AuditLogService;
import com.cospace.app.service.BookingAddonService;
import com.cospace.app.service.ExtraServiceService;
import jakarta.servlet.http.HttpServletRequest;
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
    private final ExtraServiceRepository extraServiceRepository;
    private final BranchAccessGuard branchAccessGuard;
    private final AuditLogService auditLogService;
    private final HttpServletRequest httpServletRequest;

    @GetMapping("/extra-services")
    public ResponseEntity<List<ExtraServiceEntity>> getAvailableServices(
            @RequestParam(name = "branchId", required = false) UUID branchId) {
        return ResponseEntity.ok(extraServiceService.getAvailableServices(branchId));
    }

    @GetMapping("/extra-services/all")
    @PreAuthorize("hasAnyRole('BRANCH_ADMIN', 'SUPER_ADMIN', 'ADMIN', 'branch_admin', 'admin')")
    public ResponseEntity<List<ExtraServiceEntity>> getAllServices(
            @RequestParam(name = "branchId", required = false) UUID branchId) {
        return ResponseEntity.ok(extraServiceService.getAllServices(branchId));
    }

    @PostMapping("/extra-services")
    @PreAuthorize("hasAnyRole('BRANCH_ADMIN', 'SUPER_ADMIN', 'ADMIN', 'branch_admin', 'admin')")
    public ResponseEntity<ExtraServiceEntity> createService(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody ExtraServiceEntity service) {
        // Never trust a client-supplied id (would silently overwrite an existing row via save()),
        // and a branch admin may only create a service scoped to their own branch — never a
        // global one (branchId null) or one for another branch. super_admin may create either.
        service.setId(null);
        if (!branchAccessGuard.isSuperAdmin(jwt)) {
            service.setBranchId(branchAccessGuard.requireOwnBranch(jwt));
        }
        ExtraServiceEntity created = extraServiceService.createService(service);
        auditLogService.log(httpServletRequest, UUID.fromString(jwt.getSubject()), "CREATE", "extra_services", created.getId(),
                null, Map.of("code", created.getCode(), "name", created.getName(), "price", created.getPrice()));
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/extra-services/{id}")
    @PreAuthorize("hasAnyRole('BRANCH_ADMIN', 'SUPER_ADMIN', 'ADMIN', 'branch_admin', 'admin')")
    public ResponseEntity<ExtraServiceEntity> updateService(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID id,
            @RequestBody Map<String, Object> updates) {
        ExtraServiceEntity existing = extraServiceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Dịch vụ không tồn tại"));
        // A branch admin may only edit a service already scoped to their own branch — never a
        // global service or another branch's.
        branchAccessGuard.requireAccessToBranch(jwt, existing.getBranchId());
        Map<String, Object> oldValues = Map.of(
                "name", existing.getName(), "price", existing.getPrice(), "isActive", existing.isActive());
        ExtraServiceEntity updatedEntity = extraServiceService.updateService(id, updates);
        auditLogService.log(httpServletRequest, UUID.fromString(jwt.getSubject()), "UPDATE", "extra_services", updatedEntity.getId(),
                oldValues, Map.of("name", updatedEntity.getName(), "price", updatedEntity.getPrice(), "isActive", updatedEntity.isActive()));
        return ResponseEntity.ok(updatedEntity);
    }

    @DeleteMapping("/extra-services/{id}")
    @PreAuthorize("hasAnyRole('BRANCH_ADMIN', 'SUPER_ADMIN', 'ADMIN', 'branch_admin', 'admin')")
    public ResponseEntity<?> deleteService(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        ExtraServiceEntity existing = extraServiceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Dịch vụ không tồn tại"));
        branchAccessGuard.requireAccessToBranch(jwt, existing.getBranchId());
        extraServiceService.deleteService(id);
        auditLogService.log(httpServletRequest, UUID.fromString(jwt.getSubject()), "DELETE", "extra_services", existing.getId(),
                Map.of("name", existing.getName(), "code", existing.getCode()), null);
        return ResponseEntity.ok(Map.of("success", true, "message", "Đã xóa vĩnh viễn dịch vụ."));
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
