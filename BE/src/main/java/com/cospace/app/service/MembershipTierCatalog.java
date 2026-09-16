package com.cospace.app.service;

import com.cospace.app.config.CacheConfig;
import com.cospace.app.dto.api.MembershipDto.TierResponse;
import com.cospace.app.entity.MembershipTier;
import com.cospace.app.repository.MembershipTierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

/**
 * Cached, read-only view of the active membership tiers, ordered lowest to highest. Kept in its
 * own bean so {@link MembershipService} and {@link PromotionService} hit the cache proxy instead
 * of bypassing it through self-invocation.
 */
@Component
@RequiredArgsConstructor
public class MembershipTierCatalog {

    private final MembershipTierRepository membershipTierRepository;

    @Cacheable(CacheConfig.MEMBERSHIP_TIERS)
    public List<TierResponse> activeTiers() {
        return membershipTierRepository.findByIsActiveTrueOrderBySortOrderAsc().stream()
                .map(MembershipTierCatalog::toResponse)
                .toList();
    }

    public Optional<TierResponse> findActive(String code) {
        if (code == null) return Optional.empty();
        return activeTiers().stream().filter(t -> t.getCode().equals(code)).findFirst();
    }

    public static boolean isEntryTier(TierResponse t) {
        return t.getMinTotalSpent() <= 0 && t.getMinBookings() <= 0;
    }

    /** Reached when either non-zero threshold is met; an entry tier is always reached. */
    public static boolean isReachedBy(TierResponse t, long totalSpent, long bookingCount) {
        if (isEntryTier(t)) return true;
        return (t.getMinTotalSpent() > 0 && totalSpent >= t.getMinTotalSpent())
                || (t.getMinBookings() > 0 && bookingCount >= t.getMinBookings());
    }

    public static TierResponse toResponse(MembershipTier t) {
        return TierResponse.builder()
                .id(t.getId())
                .code(t.getCode())
                .name(t.getName())
                .description(t.getDescription())
                .minTotalSpent(t.getMinTotalSpent())
                .minBookings(t.getMinBookings())
                .discountPercent(t.getDiscountPercent())
                .benefits(t.getBenefits())
                .color(t.getColor())
                .sortOrder(t.getSortOrder())
                .isActive(t.isActive())
                .build();
    }
}
