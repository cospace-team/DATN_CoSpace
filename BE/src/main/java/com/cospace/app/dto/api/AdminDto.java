package com.cospace.app.dto.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * DTOs backing the super_admin / admin console: system-wide branches, workspace types and
 * price policies. Used by AdminController.
 */
public class AdminDto {

    private AdminDto() {
    }

    /* ─── Branches ─── */

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BranchResponse {
        private UUID id;
        private String code;
        private String name;
        private String address;
        private String city;
        private String timezone;
        private LocalTime openTime;
        private LocalTime closeTime;
        private String status;
        private OffsetDateTime createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateBranchRequest {
        @NotBlank(message = "Mã chi nhánh không được để trống")
        private String code;

        @NotBlank(message = "Tên chi nhánh không được để trống")
        private String name;

        @NotBlank(message = "Địa chỉ không được để trống")
        private String address;

        private String city;
        private String timezone;
        private LocalTime openTime;
        private LocalTime closeTime;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UpdateBranchRequest {
        private String name;
        private String address;
        private String city;
        private String timezone;
        private LocalTime openTime;
        private LocalTime closeTime;
        /** active | inactive */
        private String status;
    }

    /* ─── Workspace Types ─── */

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class WorkspaceTypeRequest {
        @NotBlank(message = "Mã loại không gian không được để trống")
        private String code;

        @NotBlank(message = "Tên loại không gian không được để trống")
        private String name;

        private int capacityDefault;
    }

    /* ─── Price Policies ─── */

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PricePolicyResponse {
        private UUID id;
        private UUID branchId;
        private String branchName;
        private UUID workspaceTypeId;
        private String workspaceTypeName;
        private String durationUnit;
        private long price;
        private boolean isActive;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreatePricePolicyRequest {
        /** null means a system-wide (global) price */
        private UUID branchId;

        @NotNull(message = "workspaceTypeId không được để trống")
        private UUID workspaceTypeId;

        @NotNull(message = "durationUnit không được để trống")
        private String durationUnit;

        private long price;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UpdatePricePolicyRequest {
        private Long price;
        private Boolean isActive;
    }
}
