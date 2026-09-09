package com.cospace.app.controller;

import com.cospace.app.dto.api.SpaceDto.CreateFloorRequest;
import com.cospace.app.dto.api.SpaceDto.CreateWorkspaceRequest;
import com.cospace.app.dto.api.SpaceDto.FloorResponse;
import com.cospace.app.dto.api.SpaceDto.UpdateFloorRequest;
import com.cospace.app.dto.api.SpaceDto.UpdateWorkspaceRequest;
import com.cospace.app.dto.api.SpaceDto.WorkspaceResponse;
import com.cospace.app.dto.api.SpaceDto.WorkspaceTypeResponse;
import com.cospace.app.entity.User;
import com.cospace.app.repository.UserRepository;
import com.cospace.app.service.SpaceManagementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/branch-admin")
@RequiredArgsConstructor
public class BranchAdminSpaceController {

    private final SpaceManagementService spaceService;
    private final UserRepository userRepository;
    private final JdbcTemplate jdbcTemplate;

    /* ═══════════════════════ Branch ═══════════════════════ */

    @GetMapping("/branches/{branchId}/name")
    public ResponseEntity<?> getBranchName(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID branchId) {
        try {
            requireBranchId(jwt); // verify access
            String name = jdbcTemplate.queryForObject(
                "SELECT name FROM branches WHERE id = ?",
                String.class,
                branchId
            );
            return ResponseEntity.ok(Map.of("name", name));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Branch not found"));
        }
    }

    /* ═══════════════════════ Workspace Types ═══════════════════════ */

    @GetMapping("/workspace-types")
    public ResponseEntity<?> listWorkspaceTypes(@AuthenticationPrincipal Jwt jwt) {
        try {
            requireBranchId(jwt); // just verify access
            List<WorkspaceTypeResponse> types = spaceService.listWorkspaceTypes();
            return ResponseEntity.ok(types);
        } catch (IllegalArgumentException | AccessDeniedException e) {
            return errorResponse(e);
        }
    }

    /* ═══════════════════════ Floors ═══════════════════════ */

    @GetMapping("/floors")
    public ResponseEntity<?> listFloors(@AuthenticationPrincipal Jwt jwt) {
        try {
            UUID branchId = requireBranchId(jwt);
            List<FloorResponse> floors = spaceService.listFloors(branchId);
            return ResponseEntity.ok(floors);
        } catch (IllegalArgumentException | AccessDeniedException e) {
            return errorResponse(e);
        }
    }

    @PostMapping("/floors")
    public ResponseEntity<?> createFloor(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateFloorRequest req) {
        try {
            UUID branchId = requireBranchId(jwt);
            FloorResponse floor = spaceService.createFloor(branchId, req);
            return ResponseEntity.status(HttpStatus.CREATED).body(floor);
        } catch (IllegalArgumentException | AccessDeniedException e) {
            return errorResponse(e);
        }
    }

    @PutMapping("/floors/{id}")
    public ResponseEntity<?> updateFloor(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID id,
            @RequestBody UpdateFloorRequest req) {
        try {
            UUID branchId = requireBranchId(jwt);
            FloorResponse floor = spaceService.updateFloor(branchId, id, req);
            return ResponseEntity.ok(floor);
        } catch (IllegalArgumentException | AccessDeniedException e) {
            return errorResponse(e);
        }
    }

    @DeleteMapping("/floors/{id}")
    public ResponseEntity<?> deleteFloor(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID id) {
        try {
            UUID branchId = requireBranchId(jwt);
            spaceService.deleteFloor(branchId, id);
            return ResponseEntity.ok(Map.of("message", "Đã xóa tầng thành công."));
        } catch (IllegalArgumentException | AccessDeniedException e) {
            return errorResponse(e);
        }
    }

    /* ═══════════════════════ Workspaces ═══════════════════════ */

    @GetMapping("/floors/{floorId}/workspaces")
    public ResponseEntity<?> listWorkspaces(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID floorId) {
        try {
            UUID branchId = requireBranchId(jwt);
            List<WorkspaceResponse> workspaces = spaceService.listWorkspaces(branchId, floorId);
            return ResponseEntity.ok(workspaces);
        } catch (IllegalArgumentException | AccessDeniedException e) {
            return errorResponse(e);
        }
    }

    @PostMapping("/workspaces")
    public ResponseEntity<?> createWorkspace(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateWorkspaceRequest req) {
        try {
            UUID branchId = requireBranchId(jwt);
            WorkspaceResponse ws = spaceService.createWorkspace(branchId, req);
            return ResponseEntity.status(HttpStatus.CREATED).body(ws);
        } catch (IllegalArgumentException | AccessDeniedException e) {
            return errorResponse(e);
        }
    }

    @PutMapping("/workspaces/{id}")
    public ResponseEntity<?> updateWorkspace(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID id,
            @RequestBody UpdateWorkspaceRequest req) {
        try {
            UUID branchId = requireBranchId(jwt);
            WorkspaceResponse ws = spaceService.updateWorkspace(branchId, id, req);
            return ResponseEntity.ok(ws);
        } catch (IllegalArgumentException | AccessDeniedException e) {
            return errorResponse(e);
        }
    }

    @DeleteMapping("/workspaces/{id}")
    public ResponseEntity<?> deleteWorkspace(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID id) {
        try {
            UUID branchId = requireBranchId(jwt);
            spaceService.deleteWorkspace(branchId, id);
            return ResponseEntity.ok(Map.of("message", "Đã xóa workspace thành công."));
        } catch (IllegalArgumentException | AccessDeniedException e) {
            return errorResponse(e);
        }
    }

    /* ═══════════════════════ Auth Helper ═══════════════════════ */

    /**
     * Extract branchId from JWT subject → lookup User → verify role=admin + branchId != null
     */
    private UUID requireBranchId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            throw new IllegalArgumentException("Người dùng chưa được xác thực.");
        }

        UUID userId = UUID.fromString(jwt.getSubject());
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng."));

        boolean isAuthorized = user.getRole() == User.Role.branch_admin 
                || user.getRole() == User.Role.admin 
                || user.getRole() == User.Role.super_admin;
        if (!isAuthorized || user.getBranchId() == null) {
            throw new AccessDeniedException("Bạn không có quyền quản lý chi nhánh.");
        }

        return user.getBranchId();
    }

    private ResponseEntity<?> errorResponse(Exception e) {
        HttpStatus status = (e instanceof AccessDeniedException)
                ? HttpStatus.FORBIDDEN
                : HttpStatus.BAD_REQUEST;

        return ResponseEntity.status(status).body(Map.of(
                "error", status == HttpStatus.FORBIDDEN ? "forbidden" : "bad_request",
                "message", e.getMessage()
        ));
    }
}
