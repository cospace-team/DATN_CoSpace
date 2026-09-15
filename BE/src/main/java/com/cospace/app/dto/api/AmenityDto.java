package com.cospace.app.dto.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

/** DTOs for amenities (tiện ích) and their assignment to workspace types. */
public class AmenityDto {

    private AmenityDto() {
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AmenityResponse {
        private UUID id;
        private String name;
        private String iconName;
        private String description;
        private Boolean isActive;
        /** Number of workspace types this amenity is assigned to. */
        private Long workspaceTypeCount;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AmenityRequest {
        @NotBlank(message = "Tên tiện ích không được để trống")
        @Size(max = 100, message = "Tên tiện ích tối đa 100 ký tự")
        private String name;

        @Size(max = 50, message = "Mã icon tối đa 50 ký tự")
        private String iconName;

        private String description;
        private Boolean isActive;
    }

    /** An amenity as attached to one workspace type. */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AssignedAmenity {
        private UUID amenityId;
        private String name;
        private String iconName;
        private int quantity;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class WorkspaceTypeAmenities {
        private UUID workspaceTypeId;
        private String workspaceTypeCode;
        private String workspaceTypeName;
        private int capacityDefault;
        private List<AssignedAmenity> amenities;
    }

    /** Replaces the full amenity set of a workspace type. */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssignAmenitiesRequest {
        @NotNull(message = "Danh sách tiện ích không được để trống")
        @Valid
        private List<Item> amenities;

        @Data
        @NoArgsConstructor
        @AllArgsConstructor
        public static class Item {
            @NotNull(message = "amenityId không được để trống")
            private UUID amenityId;

            @Min(value = 1, message = "Số lượng phải từ 1 trở lên")
            private int quantity = 1;
        }
    }
}
