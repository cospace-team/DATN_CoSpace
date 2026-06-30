package com.example.momosandbox.service;

import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class PricingService {

    private static final String DEFAULT_BRANCH = "*";

    private final Map<PriceKey, Long> unitPricesVnd = new HashMap<>();

    public PricingService() {
        // Defaults (aligned with FE mockData pricePolicies)
        put(DEFAULT_BRANCH, "wst-desk", "hour", 50_000L);
        put(DEFAULT_BRANCH, "wst-desk", "day", 250_000L);
        put(DEFAULT_BRANCH, "wst-desk", "month", 3_500_000L);

        put(DEFAULT_BRANCH, "wst-meeting", "hour", 200_000L);
        put(DEFAULT_BRANCH, "wst-meeting", "day", 1_200_000L);

        put(DEFAULT_BRANCH, "wst-private", "day", 800_000L);
        put(DEFAULT_BRANCH, "wst-private", "month", 12_000_000L);

        // Branch overrides
        put("branch-0001", "wst-desk", "hour", 60_000L);
    }

    public long getUnitPriceVnd(String branchId, String workspaceTypeId, String unit) {
        String normalizedUnit = normalizeUnit(unit);
        String b = (branchId == null || branchId.isBlank()) ? DEFAULT_BRANCH : branchId.trim();
        String t = (workspaceTypeId == null) ? "" : workspaceTypeId.trim();

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
