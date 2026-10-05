package com.cospace.app.controller;

import com.cospace.app.dto.api.RefundDto.RefundResponse;
import com.cospace.app.security.BranchAccessGuard;
import com.cospace.app.service.RefundService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Read-only view of a branch's refunds for the counter, so staff can tell a customer whether and
 * how their refund was paid. Processing a refund stays with branch admins ({@code /api/refunds}).
 */
@RestController
@RequestMapping("/api/staff/refunds")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('staff', 'branch_admin', 'super_admin', 'admin', 'STAFF', 'BRANCH_ADMIN', 'SUPER_ADMIN', 'ADMIN')")
public class StaffRefundController {

    private final RefundService refundService;
    private final BranchAccessGuard branchAccessGuard;

    @GetMapping
    public List<RefundResponse> list(@AuthenticationPrincipal Jwt jwt,
                                     @RequestParam(required = false) String status,
                                     @RequestParam(required = false) UUID branchId) {
        return refundService.listForStaff(branchAccessGuard.requireBranchAccess(jwt, branchId), status);
    }
}
