package com.cospace.app.dto.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/**
 * DTOs for Space Management (Floors, Workspaces, WorkspaceTypes)
 * Used by BranchAdminSpaceController
 */
public class SpaceDto {

    private SpaceDto() {
    }

    /* ─── Request DTOs ─── */

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateFloorRequest {
        @Min(value = 1, message = "Số tầng phải >= 1")
        private int floorNo;

        @NotBlank(message = "Tên tầng không được để trống")
        private String name;

        /** SVG content as string (full XML) */
        private String svgContent;

        /** Structured layout JSON */
        private String layoutJson;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UpdateFloorRequest {
        private String name;
        private Integer floorNo;
        private Boolean isPublished;
        /** If provided, replaces SVG content and bumps mapVersion */
        private String svgContent;
        /** If provided, replaces layout JSON and bumps mapVersion */
        private String layoutJson;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateWorkspaceRequest {
        @NotNull(message = "floorId không được để trống")
        private UUID floorId;

        @NotNull(message = "workspaceTypeId không được để trống")
        private String workspaceTypeId;

        @NotBlank(message = "Mã không gian không được để trống")
        private String code;

        @NotBlank(message = "Tên không gian không được để trống")
        private String name;

        @Min(value = 1, message = "Sức chứa phải >= 1")
        private int capacity;

        private String svgElementId;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UpdateWorkspaceRequest {
        private String code;
        private String name;
        private String workspaceTypeId;

        @Min(value = 1, message = "Sức chứa phải >= 1")
        private int capacity;

        private String svgElementId;

        /** active, maintenance, inactive */
        private String status;
    }

    /* ─── Response DTOs ─── */

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class FloorResponse {
        private UUID id;
        private int floorNo;
        private String name;
        private String svgContent;
        private String layoutJson;
        private int mapVersion;
        private boolean isPublished;
        private int workspaceCount;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class WorkspaceResponse {
        private UUID id;
        private String code;
        private String name;
        private String workspaceTypeId;
        private String workspaceTypeName;
        private int capacity;
        private String svgElementId;
        private String status;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class WorkspaceTypeResponse {
        private UUID id;
        private String code;
        private String name;
        private int capacityDefault;
    }
}
