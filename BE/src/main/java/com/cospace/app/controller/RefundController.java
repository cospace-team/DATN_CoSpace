package com.cospace.app.controller;

import com.cospace.app.dto.api.RefundDto.RefundResponse;
import com.cospace.app.dto.api.RefundDto.ResolveRequest;
import com.cospace.app.entity.Refund;
import com.cospace.app.security.BranchAccessGuard;
import com.cospace.app.service.AuditLogService;
import com.cospace.app.service.RefundService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Refund queue for branch admins (their own branch) and admins (any branch). Settling the money
 * happens outside the system; these endpoints record the outcome.
 */
@RestController
@RequestMapping("/api/refunds")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('super_admin', 'admin', 'branch_admin')")
public class RefundController {

    private final RefundService refundService;
    private final BranchAccessGuard branchAccessGuard;
    private final AuditLogService auditLogService;
    private final HttpServletRequest httpServletRequest;

    @GetMapping
    public List<RefundResponse> list(@AuthenticationPrincipal Jwt jwt,
                                     @RequestParam(required = false) String status,
                                     @RequestParam(required = false) UUID branchId) {
        return refundService.list(branchAccessGuard.resolveReportBranchId(jwt, branchId), status);
    }

    @PostMapping("/{id}/process")
    public Map<String, Object> process(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                                       @Valid @RequestBody(required = false) ResolveRequest req) {
        branchAccessGuard.requireAccessToBranch(jwt, refundService.getBranchId(id));
        Refund refund = refundService.markProcessed(id, UUID.fromString(jwt.getSubject()), req != null ? req.getNote() : null);
        audit(jwt, "PROCESS", refund);
        return Map.of("id", refund.getId(), "status", refund.getStatus(), "message", "Đã xác nhận hoàn tiền cho khách.");
    }

    @PostMapping("/{id}/reject")
    public Map<String, Object> reject(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                                      @Valid @RequestBody ResolveRequest req) {
        branchAccessGuard.requireAccessToBranch(jwt, refundService.getBranchId(id));
        Refund refund = refundService.reject(id, UUID.fromString(jwt.getSubject()), req.getNote());
        audit(jwt, "REJECT", refund);
        return Map.of("id", refund.getId(), "status", refund.getStatus(), "message", "Đã từ chối yêu cầu hoàn tiền.");
    }

    private void audit(Jwt jwt, String action, Refund refund) {
        Map<String, Object> values = new HashMap<>();
        values.put("status", refund.getStatus());
        values.put("amount", refund.getAmount());
        values.put("bookingId", refund.getBookingId().toString());
        values.put("note", refund.getResolutionNote());
        auditLogService.log(httpServletRequest, UUID.fromString(jwt.getSubject()), action, "refunds", refund.getId(),
                Map.of("status", Refund.STATUS_PENDING), values);
    }
}
