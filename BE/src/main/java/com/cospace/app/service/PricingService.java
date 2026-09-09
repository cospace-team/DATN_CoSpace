package com.cospace.app.service;

import com.cospace.app.entity.DurationUnit;
import com.cospace.app.entity.PricePolicy;
import com.cospace.app.repository.PricePolicyRepository;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class PricingService {

    private static final String DEFAULT_BRANCH = "*";

    private final PricePolicyRepository pricePolicyRepository;
    private final Map<PriceKey, Long> unitPricesVnd = new HashMap<>();

    public PricingService(PricePolicyRepository pricePolicyRepository) {
        this.pricePolicyRepository = pricePolicyRepository;

        // Defaults (aligned with FE mockData pricePolicies)
        put(DEFAULT_BRANCH, "wst-desk", "hour", 50_000L);
        put(DEFAULT_BRANCH, "wst-desk", "day", 250_000L);
        put(DEFAULT_BRANCH, "wst-desk", "month", 3_500_000L);

        put(DEFAULT_BRANCH, "wst-meeting", "hour", 200_000L);
        put(DEFAULT_BRANCH, "wst-meeting", "day", 1_200_000L);

        put(DEFAULT_BRANCH, "wst-private", "day", 800_000L);
        put(DEFAULT_BRANCH, "wst-private", "month", 12_000_000L);

        // Map workspace_types UUIDs (from seed scripts)
        put(DEFAULT_BRANCH, "a1000000-0000-0000-0000-000000000001", "hour", 50_000L);
        put(DEFAULT_BRANCH, "a1000000-0000-0000-0000-000000000001", "day", 250_000L);
        put(DEFAULT_BRANCH, "a1000000-0000-0000-0000-000000000001", "month", 3_500_000L);

        put(DEFAULT_BRANCH, "a1000000-0000-0000-0000-000000000002", "hour", 200_000L);
        put(DEFAULT_BRANCH, "a1000000-0000-0000-0000-000000000002", "day", 1_200_000L);

        put(DEFAULT_BRANCH, "a1000000-0000-0000-0000-000000000003", "day", 800_000L);
        put(DEFAULT_BRANCH, "a1000000-0000-0000-0000-000000000003", "month", 12_000_000L);

        // Branch overrides (by code and UUID)
        put("branch-0001", "wst-desk", "hour", 60_000L);
        put("b1000000-0000-0000-0000-000000000001", "wst-desk", "hour", 60_000L);
        put("b1000000-0000-0000-0000-000000000001", "a1000000-0000-0000-0000-000000000001", "hour", 60_000L);
    }

    public long getUnitPriceVnd(UUID branchId, String workspaceTypeId, String unit) {
        String normalizedUnit = normalizeUnit(unit);

        // 1. Try DB lookup first
        if (workspaceTypeId != null) {
            try {
                UUID typeUuid = UUID.fromString(workspaceTypeId);
                DurationUnit unitEnum = DurationUnit.valueOf(normalizedUnit.toLowerCase());

                if (branchId != null) {
                    Optional<PricePolicy> branchPolicy = pricePolicyRepository
                            .findByBranchIdAndWorkspaceTypeIdAndDurationUnitAndIsActiveTrue(branchId, typeUuid, unitEnum);
                    if (branchPolicy.isPresent()) {
                        return branchPolicy.get().getPrice();
                    }
                }

                Optional<PricePolicy> globalPolicy = pricePolicyRepository
                        .findByBranchIdIsNullAndWorkspaceTypeIdAndDurationUnitAndIsActiveTrue(typeUuid, unitEnum);
                if (globalPolicy.isPresent()) {
                    return globalPolicy.get().getPrice();
                }
            } catch (Exception ignored) {
            }
        }
        String b = (branchId == null) ? DEFAULT_BRANCH : branchId.toString();
        String t = (workspaceTypeId == null) ? "" : workspaceTypeId;

        Long direct = unitPricesVnd.get(new PriceKey(b, t, normalizedUnit));
        if (direct != null) {
            return direct;
        }

        Long fallback = unitPricesVnd.get(new PriceKey(DEFAULT_BRANCH, t, normalizedUnit));
        if (fallback != null) {
            return fallback;
        }

        // Heuristic fallbacks (week/month derived from day where possible)
        if ("week".equals(normalizedUnit)) {
            Long dayPrice = unitPricesVnd.get(new PriceKey(b, t, "day"));
            if (dayPrice == null) {
                dayPrice = unitPricesVnd.get(new PriceKey(DEFAULT_BRANCH, t, "day"));
            }
            if (dayPrice != null) {
                return dayPrice * 5;
            }
        }

        throw new IllegalArgumentException(
                "Không tìm thấy giá cho workspace_type_id=" + t + ", unit=" + normalizedUnit);
    }

    private void put(String branchId, String workspaceTypeId, String unit, long priceVnd) {
        unitPricesVnd.put(new PriceKey(branchId, workspaceTypeId, unit), priceVnd);
    }

    private String normalizeUnit(String unit) {
        if (unit == null) {
            throw new IllegalArgumentException("unit is required");
        }
        String normalized = unit.trim().toLowerCase();
        return switch (normalized) {
            case "hour", "day", "week", "month" -> normalized;
            default -> throw new IllegalArgumentException("unit không hợp lệ: " + unit);
        };
    }

    private record PriceKey(String branchId, String workspaceTypeId, String unit) {
    }
}
