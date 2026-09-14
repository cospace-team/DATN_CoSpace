package com.cospace.app.controller;

import com.cospace.app.dto.api.ReportOverviewDto;
import com.cospace.app.security.BranchAccessGuard;
import com.cospace.app.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;
    private final BranchAccessGuard branchAccessGuard;

    @GetMapping("/overview")
    @PreAuthorize("hasAnyRole('super_admin', 'branch_admin', 'admin')")
    public ResponseEntity<ReportOverviewDto> getOverview(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(value = "branchId", required = false) UUID branchId,
            @RequestParam(value = "dateFrom", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(value = "dateTo", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(value = "groupBy", required = false) String groupBy) {
        UUID effectiveBranchId = branchAccessGuard.resolveReportBranchId(jwt, branchId);
        return ResponseEntity.ok(reportService.getOverview(effectiveBranchId, dateFrom, dateTo, groupBy));
    }

    @GetMapping("/export/csv")
    @PreAuthorize("hasAnyRole('super_admin', 'branch_admin', 'admin')")
    public ResponseEntity<byte[]> exportCsv(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(value = "branchId", required = false) UUID branchId,
            @RequestParam(value = "dateFrom", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(value = "dateTo", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo) {
        UUID effectiveBranchId = branchAccessGuard.resolveReportBranchId(jwt, branchId);
        byte[] csvData = reportService.exportBookingsCsv(effectiveBranchId, dateFrom, dateTo);

        String filename = "cospace_bookings_" + LocalDate.now() + ".csv";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csvData);
    }
}
