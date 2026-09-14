package com.cospace.app.controller;

import com.cospace.app.dto.api.MaintenanceRequestDto;
import com.cospace.app.dto.api.MaintenanceResponseDto;
import com.cospace.app.dto.api.WorkspaceMaintenanceStatusDto;
import com.cospace.app.repository.WorkspaceEntityRepository;
import com.cospace.app.repository.WorkspaceMaintenanceRepository;
import com.cospace.app.security.BranchAccessGuard;
import com.cospace.app.service.StaffMaintenanceService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/staff")
public class StaffMaintenanceController {

    private final StaffMaintenanceService maintenanceService;
    private final BranchAccessGuard branchAccessGuard;
    private final WorkspaceEntityRepository workspaceEntityRepository;
    private final WorkspaceMaintenanceRepository maintenanceRepository;

    public StaffMaintenanceController(StaffMaintenanceService maintenanceService,
                                       BranchAccessGuard branchAccessGuard,
                                       WorkspaceEntityRepository workspaceEntityRepository,
                                       WorkspaceMaintenanceRepository maintenanceRepository) {
        this.maintenanceService = maintenanceService;
        this.branchAccessGuard = branchAccessGuard;
        this.workspaceEntityRepository = workspaceEntityRepository;
        this.maintenanceRepository = maintenanceRepository;
    }

    @GetMapping("/branches/{branchId}/maintenance")
    public ResponseEntity<List<MaintenanceResponseDto>> getAllMaintenanceForBranch(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID branchId) {
        UUID verifiedBranchId = branchAccessGuard.requireBranchAccess(jwt, branchId);
        return ResponseEntity.ok(maintenanceService.getAllMaintenanceForBranch(verifiedBranchId));
    }

    @GetMapping("/branches/{branchId}/workspaces-maintenance")
    public ResponseEntity<List<WorkspaceMaintenanceStatusDto>> getWorkspaceMaintenanceStatus(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID branchId) {
        UUID verifiedBranchId = branchAccessGuard.requireBranchAccess(jwt, branchId);
        return ResponseEntity.ok(maintenanceService.getWorkspaceMaintenanceStatus(verifiedBranchId));
    }

    @PostMapping("/workspaces/{workspaceId}/maintenance")
    public ResponseEntity<MaintenanceResponseDto> createMaintenance(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID workspaceId,
            @RequestBody MaintenanceRequestDto request) {

        UUID staffId = requireSubject(jwt);
        UUID workspaceBranchId = workspaceEntityRepository.findBranchIdByWorkspaceId(workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy workspace."));
        branchAccessGuard.requireAccessToBranch(jwt, workspaceBranchId);

        request.setWorkspaceId(workspaceId);
        MaintenanceResponseDto created = maintenanceService.createMaintenance(staffId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/maintenance/{maintenanceId}/complete")
    public ResponseEntity<MaintenanceResponseDto> completeMaintenance(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID maintenanceId) {
        UUID maintenanceBranchId = maintenanceRepository.findBranchIdByMaintenanceId(maintenanceId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy lịch bảo trì."));
        branchAccessGuard.requireAccessToBranch(jwt, maintenanceBranchId);
        return ResponseEntity.ok(maintenanceService.completeMaintenance(maintenanceId));
    }

    @DeleteMapping("/maintenance/{maintenanceId}")
    public ResponseEntity<Void> deleteMaintenance(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID maintenanceId) {
        UUID maintenanceBranchId = maintenanceRepository.findBranchIdByMaintenanceId(maintenanceId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy lịch bảo trì."));
        branchAccessGuard.requireAccessToBranch(jwt, maintenanceBranchId);
        maintenanceService.deleteMaintenance(maintenanceId);
        return ResponseEntity.noContent().build();
    }

    private UUID requireSubject(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            throw new IllegalArgumentException("Missing JWT subject");
        }
        return UUID.fromString(jwt.getSubject());
    }
}
