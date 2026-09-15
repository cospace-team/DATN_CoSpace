package com.cospace.app.dto.api;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

/** DTOs for promotions (khuyến mãi) and the booking price quote they feed into. */
public class PromotionDto {

    private PromotionDto() {
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PromotionResponse {
        private UUID id;
        private String code;
        private String name;
        private String description;
        private String discountType;
        private long discountValue;
        private Long maxDiscountAmount;
        private long minOrderAmount;
        private OffsetDateTime startAt;
        private OffsetDateTime endAt;
        private Integer usageLimit;
        private Integer perUserLimit;
        private UUID branchId;
        private String branchName;
        private UUID workspaceTypeId;
        private String workspaceTypeName;
        private String minTierCode;
        private String minTierName;
        private Boolean isPublic;
        private Boolean isActive;
        /** Redemptions still held by bookings (admin list only). */
        private Long usedCount;
        /** scheduled | running | ended | inactive | exhausted */
        private String state;
        private OffsetDateTime createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PromotionRequest {
        @NotBlank(message = "Mã khuyến mãi không được để trống")
        @Pattern(regexp = "^[A-Za-z0-9_-]{3,40}$", message = "Mã khuyến mãi gồm 3-40 ký tự chữ, số, gạch ngang hoặc gạch dưới")
        private String code;

        @NotBlank(message = "Tên chương trình không được để trống")
        @Size(max = 150, message = "Tên chương trình tối đa 150 ký tự")
        private String name;

        private String description;

        /** percent | fixed */
        @NotBlank(message = "Loại giảm giá không được để trống")
        private String discountType;

        @Min(value = 1, message = "Giá trị giảm phải lớn hơn 0")
        private long discountValue;

        private Long maxDiscountAmount;

        @Min(value = 0, message = "Giá trị đơn tối thiểu không được âm")
        private long minOrderAmount;

        @NotNull(message = "Thời gian bắt đầu không được để trống")
        private OffsetDateTime startAt;

        @NotNull(message = "Thời gian kết thúc không được để trống")
        private OffsetDateTime endAt;

        private Integer usageLimit;
        private Integer perUserLimit;
        private UUID branchId;
        private UUID workspaceTypeId;
        private String minTierCode;
        private Boolean isPublic;
        private Boolean isActive;
    }

    /** Price preview for a prospective booking, with membership + promotion discounts applied. */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuoteRequest {
        @NotNull(message = "workspaceId không được để trống")
        private UUID workspaceId;

        /** hour | day | week | month */
        @NotBlank(message = "unit không được để trống")
        private String unit;

        @NotNull(message = "startAt không được để trống")
        private OffsetDateTime startAt;

        @NotNull(message = "endAt không được để trống")
        private OffsetDateTime endAt;

        private String promotionCode;

        @jakarta.validation.Valid
        private java.util.List<BookingAddonDto.LineRequest> addons;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class QuoteResponse {
        private long pricePerUnit;
        private int unitCount;
        private long subtotalAmount;
        private String membershipTierCode;
        private String membershipTierName;
        private int membershipDiscountPercent;
        private long membershipDiscountAmount;
        private String promotionCode;
        private String promotionName;
        private long promotionDiscountAmount;
        private long discountAmount;
        private long addonAmount;
        private long totalAmount;
    }
}
