package com.cospace.app.controller;

import com.cospace.app.dto.api.StaffDashboardStatsDto;
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

    public StaffDashboardController(StaffDashboardService staffDashboardService) {
        this.staffDashboardService = staffDashboardService;
    }

    @GetMapping("/stats")
    public StaffDashboardStatsDto getStats(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam("branchId") UUID branchId,
            @RequestParam(value = "filter", defaultValue = "day") String filter) {
        return staffDashboardService.getDashboardStats(branchId, filter);
    }
}
