package com.cospace.app.controller;

import com.cospace.app.entity.BookingCancellation;
import com.cospace.app.entity.CancellationPolicy;
import com.cospace.app.repository.CancellationPolicyRepository;
import com.cospace.app.service.CancellationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CancellationPolicyController {

    private final CancellationPolicyRepository policyRepository;
    private final CancellationService cancellationService;

    @GetMapping("/cancellation-policies")
    public ResponseEntity<List<CancellationPolicy>> getPolicies(
            @RequestParam(name = "branchId", required = false) UUID branchId) {
        List<CancellationPolicy> policies = new ArrayList<>();
        if (branchId != null) {
            policies.addAll(policyRepository.findByBranchIdAndIsActiveTrueOrderByPriorityAsc(branchId));
        }
        policies.addAll(policyRepository.findByBranchIdIsNullAndIsActiveTrueOrderByPriorityAsc());
        return ResponseEntity.ok(policies);
    }

    @PostMapping("/cancellation-policies")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'super_admin', 'admin')")
    public ResponseEntity<CancellationPolicy> createPolicy(@RequestBody CancellationPolicy policy) {
        return ResponseEntity.status(HttpStatus.CREATED).body(policyRepository.save(policy));
    }

    @PutMapping("/cancellation-policies/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'super_admin', 'admin')")
    public ResponseEntity<CancellationPolicy> updatePolicy(
            @PathVariable UUID id,
            @RequestBody CancellationPolicy updated) {
        CancellationPolicy existing = policyRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Chính sách hủy không tồn tại"));
        existing.setName(updated.getName());
        existing.setRuleType(updated.getRuleType());
        existing.setMinValue(updated.getMinValue());
        existing.setMaxValue(updated.getMaxValue());
        existing.setRefundPercent(updated.getRefundPercent());
        existing.setPriority(updated.getPriority());
        existing.setActive(updated.isActive());
        return ResponseEntity.ok(policyRepository.save(existing));
    }

    @DeleteMapping("/cancellation-policies/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'super_admin', 'admin')")
    public ResponseEntity<?> deletePolicy(@PathVariable UUID id) {
        policyRepository.findById(id).ifPresent(p -> {
            p.setActive(false);
            policyRepository.save(p);
        });
        return ResponseEntity.ok(Map.of("success", true, "message", "Chính sách đã được vô hiệu hóa."));
    }

    @PostMapping("/bookings/{bookingId}/cancel-v2")
    public ResponseEntity<BookingCancellation> cancelBookingWithRefund(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID bookingId,
            @RequestBody(required = false) Map<String, String> body) {
        UUID userId = UUID.fromString(jwt.getSubject());
        String reason = body != null ? body.get("reason") : "Khách hàng yêu cầu hủy đơn";
        BookingCancellation cancellation = cancellationService.cancelBooking(userId, bookingId, reason);
        return ResponseEntity.ok(cancellation);
    }
}
