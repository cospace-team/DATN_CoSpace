package com.cospace.app.controller;

import com.cospace.app.dto.api.SpaceDto.CreateFloorRequest;
import com.cospace.app.dto.api.SpaceDto.CreateWorkspaceRequest;
import com.cospace.app.dto.api.SpaceDto.FloorResponse;
import com.cospace.app.dto.api.SpaceDto.UpdateFloorRequest;
import com.cospace.app.dto.api.SpaceDto.UpdateWorkspaceRequest;
import com.cospace.app.dto.api.SpaceDto.WorkspaceResponse;
import com.cospace.app.dto.api.SpaceDto.WorkspaceTypeResponse;
import com.cospace.app.dto.api.UserProfileDto;
import com.cospace.app.entity.DurationUnit;
import com.cospace.app.entity.PricePolicy;
import com.cospace.app.entity.User;
import com.cospace.app.repository.PricePolicyRepository;
import com.cospace.app.repository.UserRepository;
import com.cospace.app.service.AuditLogService;
import com.cospace.app.service.SpaceManagementService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/branch-admin")
@RequiredArgsConstructor
public class BranchAdminSpaceController {

    private final SpaceManagementService spaceService;
    private final com.cospace.app.service.WorkspaceImageService workspaceImageService;
    private final UserRepository userRepository;
    private final PricePolicyRepository pricePolicyRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;
    private final AuditLogService auditLogService;
    private final HttpServletRequest httpServletRequest;

    /* ═══════════════════════ Branch ═══════════════════════ */

    @GetMapping("/branches/{branchId}/name")
    public ResponseEntity<?> getBranchName(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID branchId) {
        try {
            UUID ownBranchId = requireBranchId(jwt);
            if (!ownBranchId.equals(branchId)) {
                throw new AccessDeniedException("Bạn không có quyền xem thông tin chi nhánh khác.");
            }
        } catch (IllegalArgumentException | AccessDeniedException e) {
            return errorResponse(e);
        }
        try {
            String name = jdbcTemplate.queryForObject(
                "SELECT name FROM branches WHERE id = ?",
                String.class,
                branchId
            );
            return ResponseEntity.ok(Map.of("name", name));
        } catch (Exception e) {
            // Only a genuinely missing branch row reaches here now — an auth failure was already
            // returned above as 400/403 instead of being folded into this 404.
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Branch not found"));
        }
    }

    /* ═══════════════════════ Workspace Types ═══════════════════════ */

    @GetMapping("/workspace-types")
    public ResponseEntity<?> listWorkspaceTypes(@AuthenticationPrincipal Jwt jwt) {
        try {
            if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
                throw new IllegalArgumentException("Người dùng chưa được xác thực.");
            }
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
            UUID branchId = resolveBranchId(jwt, true);
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
            UUID branchId = resolveBranchId(jwt, true);
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
            UUID branchId = resolveBranchId(jwt, true);
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
            UUID branchId = resolveBranchId(jwt, true);
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
            UUID branchId = resolveBranchId(jwt, true);
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
            UUID branchId = resolveBranchId(jwt, true);
            spaceService.deleteWorkspace(branchId, id);
            return ResponseEntity.ok(Map.of("message", "Đã xóa workspace thành công."));
        } catch (IllegalArgumentException | AccessDeniedException e) {
            return errorResponse(e);
        }
    }

    /* ═══════════════════════ Workspace photos ═══════════════════════ */

    @PostMapping(value = "/workspaces/{id}/images", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadWorkspaceImage(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID id,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        UUID branchId = resolveBranchId(jwt, true);
        return ResponseEntity.status(HttpStatus.CREATED).body(workspaceImageService.add(branchId, id, file));
    }

    @DeleteMapping("/workspaces/{id}/images/{imageId}")
    public ResponseEntity<?> deleteWorkspaceImage(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID id,
            @PathVariable UUID imageId) {
        UUID branchId = resolveBranchId(jwt, true);
        workspaceImageService.delete(branchId, id, imageId);
        return ResponseEntity.ok(Map.of("message", "Đã xóa ảnh."));
    }

    /* ═══════════════════════ Staff Management ═══════════════════════ */

    @GetMapping("/staff")
    public ResponseEntity<?> listStaff(@AuthenticationPrincipal Jwt jwt) {
        try {
            UUID branchId = requireBranchId(jwt);
            List<User> staffList = userRepository.findByBranchIdAndRole(branchId, User.Role.staff);
            List<Map<String, String>> result = staffList.stream().map(u -> Map.of(
                "id", u.getId().toString(),
                "email", u.getEmail(),
                "fullName", u.getFullName() != null ? u.getFullName() : "",
                "phone", u.getPhone() != null ? u.getPhone() : "",
                "status", u.getStatus().name(),
                "role", u.getRole().name(),
                "createdAt", u.getCreatedAt() != null ? u.getCreatedAt().toString() : ""
            )).collect(Collectors.toList());
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException | AccessDeniedException e) {
            return errorResponse(e);
        }
    }

    @PostMapping("/staff")
    public ResponseEntity<?> createStaff(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody Map<String, String> req) {
        try {
            UUID branchId = requireBranchId(jwt);
            String email = req.get("email");
            String fullName = req.get("fullName");
            String password = req.get("password");
            if (email == null || email.isBlank() || fullName == null || fullName.isBlank() || password == null || password.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "bad_request", "message", "email, fullName và password là bắt buộc."));
            }
            if (userRepository.existsByEmail(email)) {
                return ResponseEntity.badRequest().body(Map.of("error", "conflict", "message", "Email này đã được sử dụng."));
            }
            User staff = User.builder()
                .email(email)
                .fullName(fullName)
                .phone(req.getOrDefault("phone", ""))
                .password(passwordEncoder.encode(password))
                .role(User.Role.staff)
                .status(User.Status.active)
                .branchId(branchId)
                .build();
            userRepository.save(staff);
            auditLogService.log(httpServletRequest, UUID.fromString(jwt.getSubject()), "CREATE", "users", staff.getId(),
                    null, Map.of("email", staff.getEmail(), "fullName", staff.getFullName(), "role", staff.getRole().name()));
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "id", staff.getId().toString(),
                "email", staff.getEmail(),
                "fullName", staff.getFullName(),
                "phone", staff.getPhone() != null ? staff.getPhone() : "",
                "status", staff.getStatus().name(),
                "role", staff.getRole().name()
            ));
        } catch (IllegalArgumentException | AccessDeniedException e) {
            return errorResponse(e);
        }
    }

    @PutMapping("/staff/{staffId}")
    public ResponseEntity<?> updateStaff(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID staffId,
            @RequestBody Map<String, String> req) {
        try {
            UUID branchId = requireBranchId(jwt);
            User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy nhân viên."));
            if (!branchId.equals(staff.getBranchId())) {
                throw new AccessDeniedException("Nhân viên không thuộc chi nhánh của bạn.");
            }
            if (staff.getRole() != User.Role.staff) {
                throw new AccessDeniedException("Chỉ có thể quản lý tài khoản nhân viên (staff).");
            }
            Map<String, Object> oldValues = Map.of(
                    "fullName", staff.getFullName() != null ? staff.getFullName() : "",
                    "email", staff.getEmail(),
                    "phone", staff.getPhone() != null ? staff.getPhone() : "");
            boolean passwordChanged = req.containsKey("password") && !req.get("password").isBlank();
            if (req.containsKey("fullName") && !req.get("fullName").isBlank()) {
                staff.setFullName(req.get("fullName"));
            }
            if (req.containsKey("phone")) {
                staff.setPhone(req.get("phone"));
            }
            if (req.containsKey("email") && !req.get("email").isBlank()) {
                String newEmail = req.get("email");
                if (!newEmail.equalsIgnoreCase(staff.getEmail()) && userRepository.existsByEmail(newEmail)) {
                    return ResponseEntity.badRequest().body(Map.of("error", "conflict", "message", "Email này đã được sử dụng."));
                }
                staff.setEmail(newEmail);
            }
            if (passwordChanged) {
                staff.setPassword(passwordEncoder.encode(req.get("password")));
            }
            userRepository.save(staff);
            // Never write the password itself to the audit trail — only whether it changed.
            Map<String, Object> newValues = Map.of(
                    "fullName", staff.getFullName() != null ? staff.getFullName() : "",
                    "email", staff.getEmail(),
                    "phone", staff.getPhone() != null ? staff.getPhone() : "",
                    "passwordChanged", passwordChanged);
            auditLogService.log(httpServletRequest, UUID.fromString(jwt.getSubject()), "UPDATE", "users", staff.getId(),
                    oldValues, newValues);
            return ResponseEntity.ok(Map.of(
                "id", staff.getId().toString(),
                "email", staff.getEmail(),
                "fullName", staff.getFullName(),
                "phone", staff.getPhone() != null ? staff.getPhone() : "",
                "status", staff.getStatus().name(),
                "role", staff.getRole().name()
            ));
        } catch (IllegalArgumentException | AccessDeniedException e) {
            return errorResponse(e);
        }
    }

    @PutMapping("/staff/{staffId}/status")
    public ResponseEntity<?> updateStaffStatus(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID staffId,
            @RequestBody Map<String, String> req) {
        try {
            UUID branchId = requireBranchId(jwt);
            User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy nhân viên."));
            if (!branchId.equals(staff.getBranchId())) {
                throw new AccessDeniedException("Nhân viên không thuộc chi nhánh của bạn.");
            }
            if (staff.getRole() != User.Role.staff) {
                throw new AccessDeniedException("Chỉ có thể quản lý tài khoản nhân viên (staff).");
            }
            String oldStatus = staff.getStatus().name();
            String newStatus = req.getOrDefault("status", "active");
            staff.setStatus(User.Status.valueOf(newStatus));
            userRepository.save(staff);
            auditLogService.log(httpServletRequest, UUID.fromString(jwt.getSubject()), "UPDATE_STATUS", "users", staff.getId(),
                    Map.of("status", oldStatus), Map.of("status", staff.getStatus().name()));
            return ResponseEntity.ok(Map.of("id", staff.getId().toString(), "status", staff.getStatus().name()));
        } catch (IllegalArgumentException | AccessDeniedException e) {
            return errorResponse(e);
        }
    }

    /* ═══════════════════════ Price Policies ═══════════════════════ */

    @GetMapping("/price-policies")
    public ResponseEntity<?> listPricePolicies(@AuthenticationPrincipal Jwt jwt) {
        try {
            UUID branchId = requireBranchId(jwt);
            List<PricePolicy> branchPolicies = pricePolicyRepository.findByBranchIdAndIsActiveTrue(branchId);
            List<PricePolicy> globalPolicies = pricePolicyRepository.findByBranchIdIsNullAndIsActiveTrue();
            List<Map<String, Object>> result = new ArrayList<>();
            branchPolicies.forEach(p -> result.add(toPricePolicyMap(p, "branch")));
            globalPolicies.forEach(p -> result.add(toPricePolicyMap(p, "global")));
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException | AccessDeniedException e) {
            return errorResponse(e);
        }
    }

    @PostMapping("/price-policies")
    public ResponseEntity<?> createPricePolicy(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody Map<String, Object> req) {
        try {
            UUID branchId = requireBranchId(jwt);
            UUID creatorId = UUID.fromString(jwt.getSubject());
            String wsTypeIdStr = (String) req.get("workspaceTypeId");
            String durationUnitStr = (String) req.get("durationUnit");
            Object priceObj = req.get("price");
            if (wsTypeIdStr == null || durationUnitStr == null || priceObj == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "bad_request", "message", "workspaceTypeId, durationUnit và price là bắt buộc."));
            }
            UUID workspaceTypeId = UUID.fromString(wsTypeIdStr);
            DurationUnit durationUnit = DurationUnit.valueOf(durationUnitStr);

            // The DB enforces one active policy per (branch, workspace type, duration unit) via
            // a partial unique index — check for it up front so a normal "create branch price"
            // click on an already-overridden combo returns a friendly 409 instead of an
            // unhandled 500 from the constraint violation.
            if (pricePolicyRepository
                    .findByBranchIdAndWorkspaceTypeIdAndDurationUnitAndIsActiveTrue(branchId, workspaceTypeId, durationUnit)
                    .isPresent()) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                        "error", "conflict",
                        "message", "Chi nhánh đã có mức giá riêng cho loại không gian và đơn vị thời gian này. Vui lòng chỉnh sửa mức giá hiện có thay vì tạo mới."
                ));
            }

            PricePolicy policy = PricePolicy.builder()
                .branchId(branchId)
                .workspaceTypeId(workspaceTypeId)
                .durationUnit(durationUnit)
                .price(Long.parseLong(priceObj.toString()))
                .isActive(true)
                .createdBy(creatorId)
                .build();
            pricePolicyRepository.save(policy);
            auditLogService.log(httpServletRequest, creatorId, "CREATE", "price_policies", policy.getId(),
                    null, Map.of("workspaceTypeId", workspaceTypeId.toString(), "durationUnit", durationUnit.name(), "price", policy.getPrice()));
            return ResponseEntity.status(HttpStatus.CREATED).body(toPricePolicyMap(policy, "branch"));
        } catch (IllegalArgumentException | AccessDeniedException e) {
            return errorResponse(e);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            // Defense in depth against the race between the check above and this insert
            // (two concurrent requests both passing the check, then both inserting).
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "error", "conflict",
                    "message", "Chi nhánh đã có mức giá riêng cho loại không gian và đơn vị thời gian này."
            ));
        }
    }

    @PutMapping("/price-policies/{id}")
    public ResponseEntity<?> updatePricePolicy(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID id,
            @RequestBody Map<String, Object> req) {
        try {
            UUID branchId = requireBranchId(jwt);
            PricePolicy policy = pricePolicyRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy price policy."));
            if (policy.getBranchId() == null || !policy.getBranchId().equals(branchId)) {
                throw new AccessDeniedException("Bạn không có quyền sửa price policy này.");
            }
            Map<String, Object> oldValues = Map.of("price", policy.getPrice(), "isActive", policy.isActive());
            if (req.containsKey("price") && req.get("price") != null) {
                policy.setPrice(Long.parseLong(req.get("price").toString()));
            }
            if (req.containsKey("isActive")) {
                policy.setActive(Boolean.parseBoolean(req.get("isActive").toString()));
            }
            pricePolicyRepository.save(policy);
            auditLogService.log(httpServletRequest, UUID.fromString(jwt.getSubject()), "UPDATE", "price_policies", policy.getId(),
                    oldValues, Map.of("price", policy.getPrice(), "isActive", policy.isActive()));
            return ResponseEntity.ok(toPricePolicyMap(policy, "branch"));
        } catch (IllegalArgumentException | AccessDeniedException e) {
            return errorResponse(e);
        }
    }

    @DeleteMapping("/price-policies/{id}")
    public ResponseEntity<?> deletePricePolicy(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID id) {
        try {
            UUID branchId = requireBranchId(jwt);
            PricePolicy policy = pricePolicyRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy price policy."));
            if (policy.getBranchId() == null || !policy.getBranchId().equals(branchId)) {
                throw new AccessDeniedException("Bạn không có quyền xóa price policy này.");
            }
            policy.setActive(false);
            pricePolicyRepository.save(policy);
            auditLogService.log(httpServletRequest, UUID.fromString(jwt.getSubject()), "DELETE", "price_policies", policy.getId(),
                    Map.of("isActive", true), Map.of("isActive", false));
            return ResponseEntity.ok(Map.of("message", "Đã xóa price policy thành công."));
        } catch (IllegalArgumentException | AccessDeniedException e) {
            return errorResponse(e);
        }
    }

    private Map<String, Object> toPricePolicyMap(PricePolicy p, String source) {
        return Map.of(
            "id", p.getId().toString(),
            "workspaceTypeId", p.getWorkspaceTypeId().toString(),
            "durationUnit", p.getDurationUnit().name(),
            "price", p.getPrice(),
            "isActive", p.isActive(),
            "branchId", p.getBranchId() != null ? p.getBranchId().toString() : "",
            "source", source
        );
    }

    /**
     * Extract branchId from JWT subject → lookup User
     * - super_admin: allows specifying target branchId via query param ?branchId= or X-Branch-Id header.
     *                If allowOptionalForSuperAdmin is true and no param is provided, returns null so that
     *                downstream floor-level operations can resolve the branch from the target floor directly.
     * - branch_admin: strictly locked to user.getBranchId()
     */
    private UUID resolveBranchId(Jwt jwt, boolean allowOptionalForSuperAdmin) {
        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            throw new IllegalArgumentException("Người dùng chưa được xác thực.");
        }

        UUID userId = UUID.fromString(jwt.getSubject());
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng."));

        // Super Admin (or global admin with no branch) can manage any branch by passing branchId
        if (user.getRole() == User.Role.super_admin || (user.getRole() == User.Role.admin && user.getBranchId() == null)) {
            String branchParam = httpServletRequest.getParameter("branchId");
            if (branchParam == null || branchParam.isBlank()) {
                branchParam = httpServletRequest.getHeader("X-Branch-Id");
            }
            if (branchParam != null && !branchParam.isBlank()) {
                try {
                    return UUID.fromString(branchParam.trim());
                } catch (IllegalArgumentException e) {
                    throw new IllegalArgumentException("Mã chi nhánh không hợp lệ.");
                }
            }
            if (allowOptionalForSuperAdmin) {
                return null;
            }
            if (user.getBranchId() != null) {
                return user.getBranchId();
            }
            throw new IllegalArgumentException("Vui lòng chọn chi nhánh để quản lý không gian.");
        }

        boolean isAuthorized = user.getRole() == User.Role.branch_admin 
                || user.getRole() == User.Role.admin;
        if (!isAuthorized || user.getBranchId() == null) {
            throw new AccessDeniedException("Bạn không có quyền quản lý chi nhánh.");
        }

        return user.getBranchId();
    }

    private UUID requireBranchId(Jwt jwt) {
        return resolveBranchId(jwt, false);
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
