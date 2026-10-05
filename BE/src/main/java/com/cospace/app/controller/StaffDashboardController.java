package com.cospace.app.controller;

import com.cospace.app.dto.api.StaffDashboardStatsDto;
import com.cospace.app.security.BranchAccessGuard;
import com.cospace.app.service.StaffDashboardService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/staff/dashboard")
public class StaffDashboardController {

    private final StaffDashboardService staffDashboardService;
    private final BranchAccessGuard branchAccessGuard;

    public StaffDashboardController(StaffDashboardService staffDashboardService, BranchAccessGuard branchAccessGuard) {
        this.staffDashboardService = staffDashboardService;
        this.branchAccessGuard = branchAccessGuard;
    }

    @GetMapping("/stats")
    public StaffDashboardStatsDto getStats(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam("branchId") UUID branchId,
            @RequestParam(value = "filter", defaultValue = "day") String filter) {
        UUID verifiedBranchId = branchAccessGuard.requireBranchAccess(jwt, branchId);
        StaffDashboardStatsDto stats = staffDashboardService.getDashboardStats(verifiedBranchId, filter);
        // Front-desk staff see today's takings (an estimate: bookings of the day, paid or not yet used),
        // not the week, month or year: those are the branch manager's figures.
        boolean today = filter == null || "day".equalsIgnoreCase(filter);
        return branchAccessGuard.isStaffRole(jwt) && !today ? stats.withoutRevenue() : stats;
    }
}
