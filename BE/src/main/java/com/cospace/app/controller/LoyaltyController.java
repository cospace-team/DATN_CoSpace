package com.cospace.app.controller;

import com.cospace.app.dto.api.AmenityDto.WorkspaceTypeAmenities;
import com.cospace.app.dto.api.MembershipDto.MyMembershipResponse;
import com.cospace.app.dto.api.MembershipDto.TierResponse;
import com.cospace.app.dto.api.PromotionDto.PromotionResponse;
import com.cospace.app.service.AmenityService;
import com.cospace.app.service.MembershipService;
import com.cospace.app.service.PromotionService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Customer-facing read endpoints for amenities, membership tiers and promotions. */
@RestController
@RequiredArgsConstructor
public class LoyaltyController {

    private final AmenityService amenityService;
    private final MembershipService membershipService;
    private final PromotionService promotionService;

    /** Workspace types with their active amenities, for the explore / booking screens. */
    @GetMapping("/api/customer/spaces/workspace-types")
    public List<WorkspaceTypeAmenities> listWorkspaceTypesWithAmenities() {
        return amenityService.listWorkspaceTypeAmenities(true);
    }

    @GetMapping("/api/membership/tiers")
    public List<TierResponse> listTiers() {
        return membershipService.listActiveTiers();
    }

    @GetMapping("/api/membership/me")
    public MyMembershipResponse myMembership(@AuthenticationPrincipal Jwt jwt) {
        return membershipService.getMyMembership(requireSubject(jwt));
    }

    /** Public promotions the caller can use right now at this branch (and workspace type, if given). */
    @GetMapping("/api/promotions/available")
    public List<PromotionResponse> availablePromotions(@AuthenticationPrincipal Jwt jwt,
                                                       @RequestParam UUID branchId,
                                                       @RequestParam(required = false) UUID workspaceTypeId) {
        UUID userId = requireSubject(jwt);
        String tierCode = membershipService.refreshTier(userId).tierCode();
        return promotionService.listAvailable(userId, tierCode, branchId, workspaceTypeId);
    }

    private UUID requireSubject(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            throw new IllegalArgumentException("Missing JWT subject");
        }
        return UUID.fromString(jwt.getSubject());
    }
}
