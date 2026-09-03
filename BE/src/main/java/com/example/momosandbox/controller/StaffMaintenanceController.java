package com.example.momosandbox.controller;

import com.example.momosandbox.dto.api.MaintenanceRequestDto;
import com.example.momosandbox.dto.api.MaintenanceResponseDto;
import com.example.momosandbox.dto.api.WorkspaceMaintenanceStatusDto;
import com.example.momosandbox.service.StaffMaintenanceService;
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

    public StaffMaintenanceController(StaffMaintenanceService maintenanceService) {
        this.maintenanceService = maintenanceService;
    }

    @GetMapping("/branches/{branchId}/maintenance")
    public ResponseEntity<List<MaintenanceResponseDto>> getAllMaintenanceForBranch(@PathVariable UUID branchId) {
        return ResponseEntity.ok(maintenanceService.getAllMaintenanceForBranch(branchId));
    }

    @GetMapping("/branches/{branchId}/workspaces-maintenance")
    public ResponseEntity<List<WorkspaceMaintenanceStatusDto>> getWorkspaceMaintenanceStatus(@PathVariable UUID branchId) {
        return ResponseEntity.ok(maintenanceService.getWorkspaceMaintenanceStatus(branchId));
    }

    @PostMapping("/workspaces/{workspaceId}/maintenance")
    public ResponseEntity<MaintenanceResponseDto> createMaintenance(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID workspaceId,
            @RequestBody MaintenanceRequestDto request) {
        
        UUID staffId = requireSubject(jwt);
        request.setWorkspaceId(workspaceId);
        MaintenanceResponseDto created = maintenanceService.createMaintenance(staffId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/maintenance/{maintenanceId}/complete")
    public ResponseEntity<MaintenanceResponseDto> completeMaintenance(@PathVariable UUID maintenanceId) {
        return ResponseEntity.ok(maintenanceService.completeMaintenance(maintenanceId));
    }
    
    @DeleteMapping("/maintenance/{maintenanceId}")
    public ResponseEntity<Void> deleteMaintenance(@PathVariable UUID maintenanceId) {
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
