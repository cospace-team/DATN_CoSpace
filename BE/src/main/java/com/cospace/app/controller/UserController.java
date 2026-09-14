package com.cospace.app.controller;

import com.cospace.app.dto.api.ChangePasswordRequest;
import com.cospace.app.dto.api.UserProfileDto;
import com.cospace.app.dto.api.WalkinUserCreateRequest;
import com.cospace.app.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(@AuthenticationPrincipal Jwt jwt) {
        try {
            UUID userId = requireUserId(jwt);
            UserProfileDto profile = userService.getUserProfile(userId);
            return ResponseEntity.ok(profile);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "bad_request",
                    "message", e.getMessage()
            ));
        }
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@AuthenticationPrincipal Jwt jwt, @RequestBody UserProfileDto dto) {
        try {
            UUID userId = requireUserId(jwt);
            UserProfileDto updated = userService.updateUserProfile(userId, dto);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "bad_request",
                    "message", e.getMessage()
            ));
        }
    }

    @PutMapping("/change-password")
    public ResponseEntity<?> changePassword(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ChangePasswordRequest req) {
        try {
            UUID userId = requireUserId(jwt);
            userService.changePassword(userId, req);
            return ResponseEntity.ok(Map.of(
                    "message", "Đổi mật khẩu thành công"
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "bad_request",
                    "message", e.getMessage()
            ));
        }
    }

    @GetMapping("/search")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('staff', 'branch_admin', 'super_admin')")
    public ResponseEntity<List<UserProfileDto>> searchUsers(@RequestParam("q") String query) {
        return ResponseEntity.ok(userService.searchUsers(query));
    }

    @GetMapping
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('staff', 'branch_admin', 'super_admin', 'admin')")
    public ResponseEntity<List<UserProfileDto>> getUsers(
            @RequestParam(name = "role", required = false) String role,
            @RequestParam(name = "branchId", required = false) UUID branchId,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "search", required = false) String search) {
        return ResponseEntity.ok(userService.getUsers(role, branchId, status, search));
    }

    @PutMapping("/{id}/status")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('super_admin', 'admin')")
    public ResponseEntity<?> updateUserStatus(
            @AuthenticationPrincipal Jwt jwt,
            @org.springframework.web.bind.annotation.PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        try {
            UUID currentAdminUserId = requireUserId(jwt);
            String status = body.get("status");
            if (status == null || status.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "bad_request", "message", "Trạng thái không được để trống"));
            }
            UserProfileDto updated = userService.updateUserStatus(id, status, currentAdminUserId);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "bad_request", "message", e.getMessage()));
        }
    }

    @PutMapping("/{id}/role")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('super_admin', 'admin')")
    public ResponseEntity<?> updateUserRole(
            @AuthenticationPrincipal Jwt jwt,
            @org.springframework.web.bind.annotation.PathVariable UUID id,
            @RequestBody Map<String, Object> body) {
        try {
            UUID currentAdminUserId = requireUserId(jwt);
            String role = (String) body.get("role");
            String branchIdStr = (String) body.get("branchId");
            UUID branchId = (branchIdStr != null && !branchIdStr.isBlank()) ? UUID.fromString(branchIdStr) : null;
            UserProfileDto updated = userService.updateUserRoleAndBranch(id, role, branchId, currentAdminUserId);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "bad_request", "message", e.getMessage()));
        }
    }

    @PostMapping("/walkin")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('staff', 'branch_admin')")
    public ResponseEntity<UserProfileDto> createWalkinUser(@Valid @RequestBody WalkinUserCreateRequest req) {
        return ResponseEntity.ok(userService.createWalkinUser(req));
    }

    private UUID requireUserId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            throw new IllegalArgumentException("Người dùng chưa được xác thực");
        }
        return UUID.fromString(jwt.getSubject());
    }
}
