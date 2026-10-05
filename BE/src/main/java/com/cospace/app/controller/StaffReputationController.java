package com.cospace.app.controller;

import com.cospace.app.dto.api.ReputationDto.MyReputationResponse;
import com.cospace.app.dto.api.ReputationDto.RevertRequest;
import com.cospace.app.security.BranchAccessGuard;
import com.cospace.app.service.ReputationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Counter / admin view of a customer's reputation, and reverting a penalty given by mistake. */
@RestController
@RequestMapping("/api/staff/reputation")
@RequiredArgsConstructor
public class StaffReputationController {

    private final ReputationService reputationService;
    private final BranchAccessGuard branchAccessGuard;

    @GetMapping("/customers/{userId}")
    public MyReputationResponse customerReputation(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID userId) {
        // null = a super admin, who may look anyone up; everyone else only customers of their own branch.
        UUID branchId = branchAccessGuard.resolveReportBranchId(jwt, null);
        if (branchId != null) {
            reputationService.requireCustomerOfBranch(branchId, userId);
        }
        return reputationService.getReputation(userId);
    }

    /** Only staff of the booking's branch (or a super admin) may give the points back. */
    @PostMapping("/bookings/{bookingId}/revert")
    public MyReputationResponse revertPenalty(@AuthenticationPrincipal Jwt jwt,
                                              @PathVariable UUID bookingId,
                                              @RequestBody RevertRequest req) {
        UUID staffId = requireSubject(jwt);
        branchAccessGuard.requireAccessToBranch(jwt, reputationService.bookingBranchId(bookingId));
        UUID customerId = reputationService.revertMissedCheckinPenalty(staffId, bookingId, req != null ? req.getReason() : null);
        return reputationService.getReputation(customerId);
    }

    private UUID requireSubject(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            throw new IllegalArgumentException("Missing JWT subject");
        }
        return UUID.fromString(jwt.getSubject());
    }
}
