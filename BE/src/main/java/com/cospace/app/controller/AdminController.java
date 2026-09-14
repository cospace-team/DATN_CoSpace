package com.cospace.app.controller;

import com.cospace.app.dto.api.AdminDto.BranchResponse;
import com.cospace.app.dto.api.AdminDto.CreateBranchRequest;
import com.cospace.app.dto.api.AdminDto.CreatePricePolicyRequest;
import com.cospace.app.dto.api.AdminDto.PricePolicyResponse;
import com.cospace.app.dto.api.AdminDto.UpdateBranchRequest;
import com.cospace.app.dto.api.AdminDto.UpdatePricePolicyRequest;
import com.cospace.app.dto.api.AdminDto.WorkspaceTypeRequest;
import com.cospace.app.dto.api.SpaceDto.WorkspaceTypeResponse;
import com.cospace.app.entity.BranchEntity;
import com.cospace.app.entity.DurationUnit;
import com.cospace.app.entity.PricePolicy;
import com.cospace.app.entity.WorkspaceType;
import com.cospace.app.repository.BranchEntityRepository;
import com.cospace.app.repository.FloorRepository;
import com.cospace.app.repository.PricePolicyRepository;
import com.cospace.app.repository.WorkspaceEntityRepository;
import com.cospace.app.repository.WorkspaceTypeRepository;
import com.cospace.app.service.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * System-wide configuration for the super_admin / admin console: branches, workspace types and
 * price policies that apply across (or independently of) any single branch. Branch-scoped
 * self-service for a branch_admin's own branch stays in {@link BranchAdminSpaceController}.
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('super_admin', 'admin')")
public class AdminController {

    private final BranchEntityRepository branchRepository;
    private final FloorRepository floorRepository;
    private final WorkspaceTypeRepository workspaceTypeRepository;
    private final WorkspaceEntityRepository workspaceEntityRepository;
    private final PricePolicyRepository pricePolicyRepository;
    private final AuditLogService auditLogService;
    private final HttpServletRequest httpServletRequest;

    /* ═══════════════════════ Branches ═══════════════════════ */

    @GetMapping("/branches")
    @Cacheable(com.cospace.app.config.CacheConfig.ADMIN_BRANCHES)
    public ResponseEntity<List<BranchResponse>> listBranches() {
        List<BranchResponse> result = branchRepository.findAllByOrderByNameAsc().stream()
                .map(this::toBranchResponse)
                .toList();
        return ResponseEntity.ok(result);
    }

    @PostMapping("/branches")
    @CacheEvict(value = com.cospace.app.config.CacheConfig.ADMIN_BRANCHES, allEntries = true)
    public ResponseEntity<?> createBranch(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateBranchRequest req) {
        if (branchRepository.existsByCode(req.getCode())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "error", "conflict", "message", "Mã chi nhánh \"" + req.getCode() + "\" đã tồn tại."));
        }
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        BranchEntity branch = BranchEntity.builder()
                .id(UUID.randomUUID())
                .code(req.getCode())
                .name(req.getName())
                .address(req.getAddress())
                .city(req.getCity())
                .timezone(req.getTimezone() != null && !req.getTimezone().isBlank() ? req.getTimezone() : "Asia/Ho_Chi_Minh")
                .openTime(req.getOpenTime())
                .closeTime(req.getCloseTime())
                .status(BranchEntity.BranchStatus.active)
                .createdAt(now)
                .updatedAt(now)
                .build();
        branch = branchRepository.save(branch);
        auditLogService.log(httpServletRequest, UUID.fromString(jwt.getSubject()), "CREATE", "branches", branch.getId(),
                null, Map.of("code", branch.getCode(), "name", branch.getName()));
        return ResponseEntity.status(HttpStatus.CREATED).body(toBranchResponse(branch));
    }

    @PutMapping("/branches/{id}")
    @org.springframework.cache.annotation.Caching(evict = {
            @CacheEvict(value = com.cospace.app.config.CacheConfig.ADMIN_BRANCHES, allEntries = true),
            // A branch rename/status change must also invalidate the price-policy cache, whose
            // entries embed this branch's denormalized name.
            @CacheEvict(value = com.cospace.app.config.CacheConfig.ADMIN_PRICE_POLICIES, allEntries = true)
    })
    public ResponseEntity<?> updateBranch(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @RequestBody UpdateBranchRequest req) {
        BranchEntity branch = branchRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chi nhánh."));
        Map<String, Object> oldValues = Map.of("name", branch.getName(), "status", branch.getStatus().name());

        if (req.getName() != null && !req.getName().isBlank()) branch.setName(req.getName());
        if (req.getAddress() != null && !req.getAddress().isBlank()) branch.setAddress(req.getAddress());
        if (req.getCity() != null) branch.setCity(req.getCity());
        if (req.getTimezone() != null && !req.getTimezone().isBlank()) branch.setTimezone(req.getTimezone());
        if (req.getOpenTime() != null) branch.setOpenTime(req.getOpenTime());
        if (req.getCloseTime() != null) branch.setCloseTime(req.getCloseTime());
        if (req.getStatus() != null && !req.getStatus().isBlank()) {
            try {
                branch.setStatus(BranchEntity.BranchStatus.valueOf(req.getStatus()));
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "bad_request", "message", "Trạng thái không hợp lệ."));
            }
        }
        branch.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));
        branch = branchRepository.save(branch);
        auditLogService.log(httpServletRequest, UUID.fromString(jwt.getSubject()), "UPDATE", "branches", branch.getId(),
                oldValues, Map.of("name", branch.getName(), "status", branch.getStatus().name()));
        return ResponseEntity.ok(toBranchResponse(branch));
    }

    /** Deactivates a branch (soft delete) — rejected while the branch still has floors. */
    @DeleteMapping("/branches/{id}")
    @CacheEvict(value = com.cospace.app.config.CacheConfig.ADMIN_BRANCHES, allEntries = true)
    public ResponseEntity<?> deactivateBranch(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        BranchEntity branch = branchRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chi nhánh."));
        if (floorRepository.existsByBranchId(id)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "error", "conflict",
                    "message", "Chi nhánh \"" + branch.getName() + "\" vẫn còn tầng/không gian liên quan. Vui lòng xóa dữ liệu liên quan trước."));
        }
        branch.setStatus(BranchEntity.BranchStatus.inactive);
        branch.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));
        branchRepository.save(branch);
        auditLogService.log(httpServletRequest, UUID.fromString(jwt.getSubject()), "DELETE", "branches", branch.getId(),
                Map.of("status", "active"), Map.of("status", "inactive"));
        return ResponseEntity.ok(Map.of("message", "Đã ngưng hoạt động chi nhánh."));
    }

    /* ═══════════════════════ Workspace Types ═══════════════════════ */

    @GetMapping("/workspace-types")
    @Cacheable(com.cospace.app.config.CacheConfig.ADMIN_WORKSPACE_TYPES)
    public ResponseEntity<List<WorkspaceTypeResponse>> listWorkspaceTypes() {
        List<WorkspaceTypeResponse> result = workspaceTypeRepository.findAll().stream()
                .map(this::toWorkspaceTypeResponse)
                .toList();
        return ResponseEntity.ok(result);
    }

    @PostMapping("/workspace-types")
    @CacheEvict(value = com.cospace.app.config.CacheConfig.ADMIN_WORKSPACE_TYPES, allEntries = true)
    public ResponseEntity<?> createWorkspaceType(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody WorkspaceTypeRequest req) {
        if (workspaceTypeRepository.existsByCode(req.getCode())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "error", "conflict", "message", "Mã loại không gian \"" + req.getCode() + "\" đã tồn tại."));
        }
        WorkspaceType type = WorkspaceType.builder()
                .code(req.getCode())
                .name(req.getName())
                .capacityDefault(req.getCapacityDefault() > 0 ? req.getCapacityDefault() : 1)
                .build();
        type = workspaceTypeRepository.save(type);
        auditLogService.log(httpServletRequest, UUID.fromString(jwt.getSubject()), "CREATE", "workspace_types", type.getId(),
                null, Map.of("code", type.getCode(), "name", type.getName()));
        return ResponseEntity.status(HttpStatus.CREATED).body(toWorkspaceTypeResponse(type));
    }

    @PutMapping("/workspace-types/{id}")
    @org.springframework.cache.annotation.Caching(evict = {
            @CacheEvict(value = com.cospace.app.config.CacheConfig.ADMIN_WORKSPACE_TYPES, allEntries = true),
            // A workspace-type rename must also invalidate the price-policy cache, whose entries
            // embed this type's denormalized name.
            @CacheEvict(value = com.cospace.app.config.CacheConfig.ADMIN_PRICE_POLICIES, allEntries = true)
    })
    public ResponseEntity<?> updateWorkspaceType(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @RequestBody WorkspaceTypeRequest req) {
        WorkspaceType type = workspaceTypeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy loại không gian."));
        Map<String, Object> oldValues = Map.of("name", type.getName(), "capacityDefault", type.getCapacityDefault());

        if (req.getName() != null && !req.getName().isBlank()) type.setName(req.getName());
        if (req.getCapacityDefault() > 0) type.setCapacityDefault(req.getCapacityDefault());
        type = workspaceTypeRepository.save(type);
        auditLogService.log(httpServletRequest, UUID.fromString(jwt.getSubject()), "UPDATE", "workspace_types", type.getId(),
                oldValues, Map.of("name", type.getName(), "capacityDefault", type.getCapacityDefault()));
        return ResponseEntity.ok(toWorkspaceTypeResponse(type));
    }

    @DeleteMapping("/workspace-types/{id}")
    @CacheEvict(value = com.cospace.app.config.CacheConfig.ADMIN_WORKSPACE_TYPES, allEntries = true)
    public ResponseEntity<?> deleteWorkspaceType(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        WorkspaceType type = workspaceTypeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy loại không gian."));
        if (workspaceEntityRepository.countByWorkspaceTypeId(id) > 0 || pricePolicyRepository.countByWorkspaceTypeId(id) > 0) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "error", "conflict",
                    "message", "Loại không gian \"" + type.getName() + "\" đang được sử dụng bởi workspace hoặc mức giá. Vui lòng xóa dữ liệu liên quan trước."));
        }
        workspaceTypeRepository.delete(type);
        auditLogService.log(httpServletRequest, UUID.fromString(jwt.getSubject()), "DELETE", "workspace_types", id,
                Map.of("code", type.getCode(), "name", type.getName()), null);
        return ResponseEntity.ok(Map.of("message", "Đã xóa loại không gian."));
    }

    /* ═══════════════════════ Price Policies (system-wide console) ═══════════════════════ */

    @GetMapping("/price-policies")
    @Cacheable(com.cospace.app.config.CacheConfig.ADMIN_PRICE_POLICIES)
    public ResponseEntity<List<PricePolicyResponse>> listPricePolicies() {
        List<PricePolicyResponse> result = pricePolicyRepository.findAll().stream()
                .map(this::toPricePolicyResponse)
                .toList();
        return ResponseEntity.ok(result);
    }

    @PostMapping("/price-policies")
    @CacheEvict(value = com.cospace.app.config.CacheConfig.ADMIN_PRICE_POLICIES, allEntries = true)
    public ResponseEntity<?> createPricePolicy(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreatePricePolicyRequest req) {
        DurationUnit durationUnit;
        try {
            durationUnit = DurationUnit.valueOf(req.getDurationUnit());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "bad_request", "message", "durationUnit không hợp lệ."));
        }
        if (!workspaceTypeRepository.existsById(req.getWorkspaceTypeId())) {
            return ResponseEntity.badRequest().body(Map.of("error", "bad_request", "message", "Loại không gian không hợp lệ."));
        }
        boolean duplicate = req.getBranchId() != null
                ? pricePolicyRepository.findByBranchIdAndWorkspaceTypeIdAndDurationUnitAndIsActiveTrue(req.getBranchId(), req.getWorkspaceTypeId(), durationUnit).isPresent()
                : pricePolicyRepository.findByBranchIdIsNullAndWorkspaceTypeIdAndDurationUnitAndIsActiveTrue(req.getWorkspaceTypeId(), durationUnit).isPresent();
        if (duplicate) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "error", "conflict",
                    "message", "Đã tồn tại mức giá cho loại không gian và đơn vị thời gian này ở phạm vi đã chọn."));
        }
        try {
            PricePolicy policy = PricePolicy.builder()
                    .branchId(req.getBranchId())
                    .workspaceTypeId(req.getWorkspaceTypeId())
                    .durationUnit(durationUnit)
                    .price(req.getPrice())
                    .isActive(true)
                    .createdBy(UUID.fromString(jwt.getSubject()))
                    .build();
            policy = pricePolicyRepository.save(policy);
            auditLogService.log(httpServletRequest, UUID.fromString(jwt.getSubject()), "CREATE", "price_policies", policy.getId(),
                    null, Map.of("workspaceTypeId", policy.getWorkspaceTypeId().toString(), "durationUnit", durationUnit.name(), "price", policy.getPrice()));
            return ResponseEntity.status(HttpStatus.CREATED).body(toPricePolicyResponse(policy));
        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "error", "conflict", "message", "Đã tồn tại mức giá cho loại không gian và đơn vị thời gian này."));
        }
    }

    @PutMapping("/price-policies/{id}")
    @CacheEvict(value = com.cospace.app.config.CacheConfig.ADMIN_PRICE_POLICIES, allEntries = true)
    public ResponseEntity<?> updatePricePolicy(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @RequestBody UpdatePricePolicyRequest req) {
        PricePolicy policy = pricePolicyRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy mức giá."));
        Map<String, Object> oldValues = Map.of("price", policy.getPrice(), "isActive", policy.isActive());
        if (req.getPrice() != null) policy.setPrice(req.getPrice());
        if (req.getIsActive() != null) policy.setActive(req.getIsActive());
        policy = pricePolicyRepository.save(policy);
        auditLogService.log(httpServletRequest, UUID.fromString(jwt.getSubject()), "UPDATE", "price_policies", policy.getId(),
                oldValues, Map.of("price", policy.getPrice(), "isActive", policy.isActive()));
        return ResponseEntity.ok(toPricePolicyResponse(policy));
    }

    @DeleteMapping("/price-policies/{id}")
    @CacheEvict(value = com.cospace.app.config.CacheConfig.ADMIN_PRICE_POLICIES, allEntries = true)
    public ResponseEntity<?> deletePricePolicy(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        PricePolicy policy = pricePolicyRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy mức giá."));
        policy.setActive(false);
        pricePolicyRepository.save(policy);
        auditLogService.log(httpServletRequest, UUID.fromString(jwt.getSubject()), "DELETE", "price_policies", policy.getId(),
                Map.of("isActive", true), Map.of("isActive", false));
        return ResponseEntity.ok(Map.of("message", "Đã xóa mức giá."));
    }

    /* ═══════════════════════ Mappers ═══════════════════════ */

    private BranchResponse toBranchResponse(BranchEntity b) {
        return BranchResponse.builder()
                .id(b.getId())
                .code(b.getCode())
                .name(b.getName())
                .address(b.getAddress())
                .city(b.getCity())
                .timezone(b.getTimezone())
                .openTime(b.getOpenTime())
                .closeTime(b.getCloseTime())
                .status(b.getStatus().name())
                .createdAt(b.getCreatedAt())
                .build();
    }

    private WorkspaceTypeResponse toWorkspaceTypeResponse(WorkspaceType t) {
        return WorkspaceTypeResponse.builder()
                .id(t.getId())
                .code(t.getCode())
                .name(t.getName())
                .capacityDefault(t.getCapacityDefault())
                .build();
    }

    private PricePolicyResponse toPricePolicyResponse(PricePolicy p) {
        String branchName = p.getBranchId() != null
                ? branchRepository.findById(p.getBranchId()).map(BranchEntity::getName).orElse("—")
                : null;
        String typeName = workspaceTypeRepository.findById(p.getWorkspaceTypeId())
                .map(WorkspaceType::getName)
                .orElse("—");
        return PricePolicyResponse.builder()
                .id(p.getId())
                .branchId(p.getBranchId())
                .branchName(branchName)
                .workspaceTypeId(p.getWorkspaceTypeId())
                .workspaceTypeName(typeName)
                .durationUnit(p.getDurationUnit().name())
                .price(p.getPrice())
                .isActive(p.isActive())
                .build();
    }
}
