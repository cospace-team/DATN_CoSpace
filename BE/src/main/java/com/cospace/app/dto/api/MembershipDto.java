package com.cospace.app.dto.api;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/** DTOs for membership tiers (hạng thành viên). */
public class MembershipDto {

    private MembershipDto() {
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TierResponse {
        private UUID id;
        private String code;
        private String name;
        private String description;
        private long minTotalSpent;
        private int minBookings;
        private int discountPercent;
        private String benefits;
        private String color;
        private int sortOrder;
        private Boolean isActive;
        /** Customers currently in this tier (admin list only). */
        private Long memberCount;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TierRequest {
        @NotBlank(message = "Mã hạng không được để trống")
        @Pattern(regexp = "^[a-z0-9_]{2,32}$", message = "Mã hạng chỉ gồm chữ thường, số, gạch dưới (2-32 ký tự)")
        private String code;

        @NotBlank(message = "Tên hạng không được để trống")
        @Size(max = 80, message = "Tên hạng tối đa 80 ký tự")
        private String name;

        private String description;

        @Min(value = 0, message = "Chi tiêu tối thiểu không được âm")
        private long minTotalSpent;

        @Min(value = 0, message = "Số đơn tối thiểu không được âm")
        private int minBookings;

        @Min(value = 0, message = "Phần trăm giảm giá từ 0 đến 100")
        @Max(value = 100, message = "Phần trăm giảm giá từ 0 đến 100")
        private int discountPercent;

        private String benefits;

        @Pattern(regexp = "^#[0-9a-fA-F]{6}$", message = "Màu phải ở dạng #RRGGBB")
        private String color;

        private int sortOrder;
        private Boolean isActive;
    }

    /** The caller's own membership standing. */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MyMembershipResponse {
        private TierResponse currentTier;
        /** null when already at the highest tier */
        private TierResponse nextTier;
        private long totalSpent;
        private long bookingCount;
        /** Remaining spend to reach nextTier via its spend threshold (0 if that threshold is unused). */
        private long spendToNextTier;
        /** Remaining bookings to reach nextTier via its booking threshold (0 if that threshold is unused). */
        private long bookingsToNextTier;
        /** 0-100: progress toward nextTier along whichever threshold is closer. */
        private int progressPercent;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RecalculateResponse {
        private int processedUsers;
        private int changedUsers;
    }
}
