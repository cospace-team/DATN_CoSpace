package com.cospace.app.controller;

import com.cospace.app.entity.BookingCancellation;
import com.cospace.app.entity.CancellationPolicy;
import com.cospace.app.repository.CancellationPolicyRepository;
import com.cospace.app.security.BranchAccessGuard;
import com.cospace.app.service.AuditLogService;
import com.cospace.app.service.CancellationService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
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
    private final BranchAccessGuard branchAccessGuard;
    private final AuditLogService auditLogService;
    private final HttpServletRequest httpServletRequest;

    @GetMapping("/cancellation-policies")
    @Cacheable(com.cospace.app.config.CacheConfig.CANCELLATION_POLICIES)
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
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'BRANCH_ADMIN', 'super_admin', 'admin', 'branch_admin')")
    @CacheEvict(value = com.cospace.app.config.CacheConfig.CANCELLATION_POLICIES, allEntries = true)
    public ResponseEntity<CancellationPolicy> createPolicy(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody CancellationPolicy policy) {
        // A branch admin may only create a policy scoped to their own branch — never a global
        // one (branchId null) or one for another branch. super_admin may create either.
        if (!branchAccessGuard.isSuperAdmin(jwt)) {
            policy.setBranchId(branchAccessGuard.requireOwnBranch(jwt));
        }
        validatePolicy(policy);
        CancellationPolicy savedPolicy = policyRepository.save(policy);
        auditLogService.log(httpServletRequest, UUID.fromString(jwt.getSubject()), "CREATE", "cancellation_policies", savedPolicy.getId(),
                null, Map.of("name", savedPolicy.getName(), "ruleType", savedPolicy.getRuleType(), "refundPercent", savedPolicy.getRefundPercent()));
        return ResponseEntity.status(HttpStatus.CREATED).body(savedPolicy);
    }

    @PutMapping("/cancellation-policies/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'BRANCH_ADMIN', 'super_admin', 'admin', 'branch_admin')")
    @CacheEvict(value = com.cospace.app.config.CacheConfig.CANCELLATION_POLICIES, allEntries = true)
    public ResponseEntity<CancellationPolicy> updatePolicy(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID id,
            @RequestBody CancellationPolicy updated) {
        CancellationPolicy existing = policyRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Chính sách hủy không tồn tại"));
        // A branch admin may only edit a policy already scoped to their own branch — never the
        // global defaults or another branch's override.
        branchAccessGuard.requireAccessToBranch(jwt, existing.getBranchId());
        Map<String, Object> oldValues = Map.of(
                "name", existing.getName(), "refundPercent", existing.getRefundPercent(), "isActive", existing.isActive());
        existing.setName(updated.getName());
        existing.setRuleType(updated.getRuleType());
        existing.setMinValue(updated.getMinValue());
        existing.setMaxValue(updated.getMaxValue());
        existing.setRefundPercent(updated.getRefundPercent());
        existing.setPriority(updated.getPriority());
        existing.setActive(updated.isActive());
        validatePolicy(existing);
        CancellationPolicy saved = policyRepository.save(existing);
        auditLogService.log(httpServletRequest, UUID.fromString(jwt.getSubject()), "UPDATE", "cancellation_policies", saved.getId(),
                oldValues, Map.of("name", saved.getName(), "refundPercent", saved.getRefundPercent(), "isActive", saved.isActive()));
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/cancellation-policies/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'BRANCH_ADMIN', 'super_admin', 'admin', 'branch_admin')")
    @CacheEvict(value = com.cospace.app.config.CacheConfig.CANCELLATION_POLICIES, allEntries = true)
    public ResponseEntity<?> deletePolicy(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        CancellationPolicy existing = policyRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Chính sách hủy không tồn tại"));
        branchAccessGuard.requireAccessToBranch(jwt, existing.getBranchId());
        existing.setActive(false);
        policyRepository.save(existing);
        auditLogService.log(httpServletRequest, UUID.fromString(jwt.getSubject()), "DELETE", "cancellation_policies", existing.getId(),
                Map.of("isActive", true), Map.of("isActive", false));
        return ResponseEntity.ok(Map.of("success", true, "message", "Chính sách đã được vô hiệu hóa."));
    }

    private static final java.util.Set<String> RULE_TYPES =
            // HOURS_BEFORE_CHECKIN exists in seeded data; accepted so those rows stay editable.
            java.util.Set.of("GRACE_HOURS", "BEFORE_START_DAYS", "BEFORE_START_HOURS", "HOURS_BEFORE", "HOURS_BEFORE_CHECKIN");

    /**
     * Checked here so a bad form gets a message saying what is wrong, instead of the database's
     * check constraint surfacing as a generic "dữ liệu xung đột".
     */
    private static void validatePolicy(CancellationPolicy policy) {
        if (policy.getName() == null || policy.getName().isBlank()) {
            throw new IllegalArgumentException("Tên chính sách không được để trống.");
        }
        String ruleType = policy.getRuleType() != null ? policy.getRuleType().trim().toUpperCase(java.util.Locale.ROOT) : "";
        if (!RULE_TYPES.contains(ruleType)) {
            throw new IllegalArgumentException("Loại quy tắc không hợp lệ: " + policy.getRuleType());
        }
        policy.setRuleType(ruleType);
        if (policy.getMinValue() < 0 || policy.getMaxValue() <= policy.getMinValue()) {
            throw new IllegalArgumentException("Khoảng thời gian không hợp lệ: giá trị tối đa phải lớn hơn giá trị tối thiểu (và không âm).");
        }
        java.math.BigDecimal percent = policy.getRefundPercent();
        if (percent == null || percent.signum() < 0 || percent.compareTo(java.math.BigDecimal.valueOf(100)) > 0) {
            throw new IllegalArgumentException("Tỷ lệ hoàn tiền phải từ 0 đến 100%.");
        }
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
