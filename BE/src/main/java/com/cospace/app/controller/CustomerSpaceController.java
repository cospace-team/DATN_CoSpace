package com.cospace.app.controller;

import com.cospace.app.dto.api.SpaceDto.FloorResponse;
import com.cospace.app.dto.api.SpaceDto.WorkspaceResponse;
import com.cospace.app.entity.BranchEntity;
import com.cospace.app.entity.BranchEntity.BranchStatus;
import com.cospace.app.repository.BranchEntityRepository;
import com.cospace.app.service.SpaceManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/customer/spaces")
@RequiredArgsConstructor
public class CustomerSpaceController {

    private final SpaceManagementService spaceService;
    private final BranchEntityRepository branchRepo;

    /** Lightweight branch summary for customer UI (public listing) */
    public record BranchSummaryDto(
            UUID id,
            String code,
            String name,
            String address,
            String city,
            String status
    ) {}

    @GetMapping("/branches")
    public List<BranchSummaryDto> listActiveBranches() {
        return branchRepo.findByStatusOrderByNameAsc(BranchStatus.active)
                .stream()
                .map(b -> new BranchSummaryDto(
                        b.getId(),
                        b.getCode(),
                        b.getName(),
                        b.getAddress(),
                        b.getCity(),
                        b.getStatus().name()
                ))
                .toList();
    }

    @GetMapping("/branches/{branchId}/floors")
    public ResponseEntity<?> listFloors(@PathVariable UUID branchId) {
        try {
            List<FloorResponse> floors = spaceService.listFloors(branchId);
            return ResponseEntity.ok(floors);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "bad_request",
                    "message", e.getMessage()
            ));
        }
    }

    @GetMapping("/branches/{branchId}/floors/{floorId}/workspaces")
    public ResponseEntity<?> listWorkspaces(@PathVariable UUID branchId, @PathVariable UUID floorId) {
        try {
            List<WorkspaceResponse> workspaces = spaceService.listWorkspaces(branchId, floorId);
            return ResponseEntity.ok(workspaces);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "bad_request",
                    "message", e.getMessage()
            ));
        }
    }
}
