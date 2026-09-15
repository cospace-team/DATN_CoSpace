package com.cospace.app.service;

import com.cospace.app.entity.DurationUnit;
import com.cospace.app.entity.PricePolicy;
import com.cospace.app.repository.PricePolicyRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

/**
 * Unit prices come only from the active price policies configured by admins: the branch's own
 * policy first, then the system-wide one. There are no built-in prices — a type/unit nobody has
 * priced cannot be booked, instead of silently being charged a hardcoded demo amount.
 */
@Service
public class PricingService {

    private final PricePolicyRepository pricePolicyRepository;

    public PricingService(PricePolicyRepository pricePolicyRepository) {
        this.pricePolicyRepository = pricePolicyRepository;
    }

    public long getUnitPriceVnd(UUID branchId, String workspaceTypeId, String unit) {
        DurationUnit unitEnum = DurationUnit.valueOf(normalizeUnit(unit));
        UUID typeUuid = parseType(workspaceTypeId);

        if (branchId != null) {
            Optional<PricePolicy> branchPolicy = pricePolicyRepository
                    .findByBranchIdAndWorkspaceTypeIdAndDurationUnitAndIsActiveTrue(branchId, typeUuid, unitEnum);
            if (branchPolicy.isPresent()) {
                return branchPolicy.get().getPrice();
            }
        }
        return pricePolicyRepository
                .findByBranchIdIsNullAndWorkspaceTypeIdAndDurationUnitAndIsActiveTrue(typeUuid, unitEnum)
                .map(PricePolicy::getPrice)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Không tìm thấy giá cho loại không gian này theo đơn vị \"" + unitEnum.name()
                                + "\". Vui lòng chọn đơn vị thời gian khác hoặc liên hệ chi nhánh."));
    }

    private static UUID parseType(String workspaceTypeId) {
        if (workspaceTypeId == null || workspaceTypeId.isBlank()) {
            throw new IllegalArgumentException("Không xác định được loại không gian để tính giá.");
        }
        try {
            return UUID.fromString(workspaceTypeId.trim());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Loại không gian không hợp lệ: " + workspaceTypeId);
        }
    }

    private static String normalizeUnit(String unit) {
        if (unit == null) {
            throw new IllegalArgumentException("unit is required");
        }
        String normalized = unit.trim().toLowerCase();
        return switch (normalized) {
            case "hour", "day", "week", "month" -> normalized;
            default -> throw new IllegalArgumentException("unit không hợp lệ: " + unit);
        };
    }
}
