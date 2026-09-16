package com.cospace.app.controller;

import com.cospace.app.dto.api.AmenityDto.AmenityRequest;
import com.cospace.app.dto.api.AmenityDto.AmenityResponse;
import com.cospace.app.dto.api.AmenityDto.AssignAmenitiesRequest;
import com.cospace.app.dto.api.AmenityDto.AssignedAmenity;
import com.cospace.app.dto.api.AmenityDto.WorkspaceTypeAmenities;
import com.cospace.app.dto.api.MembershipDto.RecalculateResponse;
import com.cospace.app.dto.api.MembershipDto.TierRequest;
import com.cospace.app.dto.api.MembershipDto.TierResponse;
import com.cospace.app.dto.api.PromotionDto.PromotionRequest;
import com.cospace.app.dto.api.PromotionDto.PromotionResponse;
import com.cospace.app.entity.Amenity;
import com.cospace.app.entity.MembershipTier;
import com.cospace.app.service.AmenityService;
import com.cospace.app.service.AuditLogService;
import com.cospace.app.service.MembershipService;
import com.cospace.app.service.PromotionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * super_admin / admin console for amenities (tiện ích), promotions (khuyến mãi) and membership
 * tiers (hạng thành viên). Business rules live in the services; this controller only wires
 * requests to them and records audit logs.
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('super_admin', 'admin')")
public class AdminLoyaltyController {

    private final AmenityService amenityService;
    private final MembershipService membershipService;
    private final PromotionService promotionService;
    private final AuditLogService auditLogService;
    private final HttpServletRequest httpServletRequest;

    /* ═══════════════════════ Amenities ═══════════════════════ */

    @GetMapping("/amenities")
    public List<AmenityResponse> listAmenities() {
        return amenityService.listAmenities();
    }

    @PostMapping("/amenities")
    @ResponseStatus(HttpStatus.CREATED)
    public AmenityResponse createAmenity(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody AmenityRequest req) {
        AmenityResponse created = amenityService.createAmenity(req);
        audit(jwt, "CREATE", "amenities", created.getId(), null, Map.of("name", created.getName()));
        return created;
    }

    @PutMapping("/amenities/{id}")
    public AmenityResponse updateAmenity(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                                         @Valid @RequestBody AmenityRequest req) {
        AmenityResponse updated = amenityService.updateAmenity(id, req);
        audit(jwt, "UPDATE", "amenities", id, null, Map.of("name", updated.getName(), "isActive", updated.getIsActive()));
        return updated;
    }

    @DeleteMapping("/amenities/{id}")
    public Map<String, String> deleteAmenity(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        Amenity deleted = amenityService.deleteAmenity(id);
        audit(jwt, "DELETE", "amenities", id, Map.of("name", deleted.getName()), null);
        return Map.of("message", "Đã xóa tiện ích.");
    }

    /** Every workspace type with its amenities, including deactivated ones. */
    @GetMapping("/workspace-type-amenities")
    public List<WorkspaceTypeAmenities> listWorkspaceTypeAmenities() {
        return amenityService.listWorkspaceTypeAmenities(false);
    }

    @PutMapping("/workspace-types/{id}/amenities")
    public List<AssignedAmenity> assignAmenities(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                                                 @Valid @RequestBody AssignAmenitiesRequest req) {
        List<AssignedAmenity> assigned = amenityService.assignAmenities(id, req);
        audit(jwt, "UPDATE", "workspace_type_amenities", id, null,
                Map.of("amenities", assigned.stream().map(AssignedAmenity::getName).toList()));
        return assigned;
    }

    /* ═══════════════════════ Membership tiers ═══════════════════════ */

    @GetMapping("/membership-tiers")
    public List<TierResponse> listTiers() {
        return membershipService.listAllTiers();
    }

    @PostMapping("/membership-tiers")
    @ResponseStatus(HttpStatus.CREATED)
    public TierResponse createTier(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody TierRequest req) {
        TierResponse created = membershipService.createTier(req);
        audit(jwt, "CREATE", "membership_tiers", created.getId(), null, tierValues(created));
        return created;
    }

    @PutMapping("/membership-tiers/{id}")
    public TierResponse updateTier(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                                   @Valid @RequestBody TierRequest req) {
        TierResponse updated = membershipService.updateTier(id, req);
        audit(jwt, "UPDATE", "membership_tiers", id, null, tierValues(updated));
        return updated;
    }

    @DeleteMapping("/membership-tiers/{id}")
    public Map<String, String> deleteTier(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        MembershipTier deleted = membershipService.deleteTier(id);
        audit(jwt, "DELETE", "membership_tiers", id, Map.of("code", deleted.getCode(), "name", deleted.getName()), null);
        return Map.of("message", "Đã xóa hạng thành viên. Hãy chạy tính lại hạng để cập nhật khách hàng.");
    }

    @PostMapping("/membership-tiers/recalculate")
    public RecalculateResponse recalculateTiers(@AuthenticationPrincipal Jwt jwt) {
        RecalculateResponse result = membershipService.recalculateAll();
        audit(jwt, "RECALCULATE", "membership_tiers", null, null,
                Map.of("processedUsers", result.getProcessedUsers(), "changedUsers", result.getChangedUsers()));
        return result;
    }

    /* ═══════════════════════ Promotions ═══════════════════════ */

    @GetMapping("/promotions")
    public List<PromotionResponse> listPromotions() {
        return promotionService.listAll();
    }

    @PostMapping("/promotions")
    @ResponseStatus(HttpStatus.CREATED)
    public PromotionResponse createPromotion(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody PromotionRequest req) {
        PromotionResponse created = promotionService.create(req, UUID.fromString(jwt.getSubject()));
        audit(jwt, "CREATE", "promotions", created.getId(), null, promotionValues(created));
        return created;
    }

    @PutMapping("/promotions/{id}")
    public PromotionResponse updatePromotion(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                                             @Valid @RequestBody PromotionRequest req) {
        PromotionResponse updated = promotionService.update(id, req);
        audit(jwt, "UPDATE", "promotions", id, null, promotionValues(updated));
        return updated;
    }

    @DeleteMapping("/promotions/{id}")
    public ResponseEntity<Map<String, Object>> deletePromotion(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        boolean deleted = promotionService.delete(id);
        audit(jwt, deleted ? "DELETE" : "DEACTIVATE", "promotions", id, null, Map.of("deleted", deleted));
        return ResponseEntity.ok(Map.of(
                "deleted", deleted,
                "message", deleted
                        ? "Đã xóa chương trình khuyến mãi."
                        : "Mã đã được sử dụng trong đơn đặt chỗ nên chỉ được ngưng áp dụng thay vì xóa."));
    }

    /* ═══════════════════════ Helpers ═══════════════════════ */

    private void audit(Jwt jwt, String action, String entity, UUID entityId,
                       Map<String, Object> oldValues, Map<String, Object> newValues) {
        auditLogService.log(httpServletRequest, UUID.fromString(jwt.getSubject()), action, entity, entityId,
                oldValues, newValues);
    }

    private static Map<String, Object> tierValues(TierResponse t) {
        Map<String, Object> m = new HashMap<>();
        m.put("code", t.getCode());
        m.put("name", t.getName());
        m.put("minTotalSpent", t.getMinTotalSpent());
        m.put("minBookings", t.getMinBookings());
        m.put("discountPercent", t.getDiscountPercent());
        m.put("isActive", t.getIsActive());
        return m;
    }

    private static Map<String, Object> promotionValues(PromotionResponse p) {
        Map<String, Object> m = new HashMap<>();
        m.put("code", p.getCode());
        m.put("discountType", p.getDiscountType());
        m.put("discountValue", p.getDiscountValue());
        m.put("startAt", String.valueOf(p.getStartAt()));
        m.put("endAt", String.valueOf(p.getEndAt()));
        m.put("isActive", p.getIsActive());
        return m;
    }
}
