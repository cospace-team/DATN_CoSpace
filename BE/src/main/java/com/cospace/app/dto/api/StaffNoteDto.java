package com.cospace.app.dto.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

public class StaffNoteDto {

    private StaffNoteDto() {
    }

    @Data
    public static class CreateRequest {
        /** handover, incident, lost_found or customer */
        @NotBlank(message = "Vui lòng chọn loại ghi chú")
        private String kind;

        @NotBlank(message = "Vui lòng nhập tiêu đề")
        @Size(max = 160, message = "Tiêu đề tối đa 160 ký tự")
        private String title;

        @Size(max = 4000, message = "Nội dung tối đa 4000 ký tự")
        private String body;

        /** Required for a note about a customer. */
        private UUID customerId;
        private UUID bookingId;
        private UUID workspaceId;

        @Size(max = 500, message = "Đường dẫn ảnh quá dài")
        private String photoUrl;

        /** Only a super admin has no branch of their own and must say which one. */
        private UUID branchId;
    }

    @Data
    public static class ResolveRequest {
        @Size(max = 255, message = "Ghi chú tối đa 255 ký tự")
        private String note;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Response {
        private UUID id;
        private UUID branchId;
        private String kind;
        private String title;
        private String body;
        private UUID customerId;
        private String customerName;
        private String customerPhone;
        private UUID bookingId;
        private String bookingCode;
        private UUID workspaceId;
        private String workspaceName;
        private String photoUrl;
        private String status;
        private UUID createdBy;
        private String createdByName;
        private OffsetDateTime createdAt;
        private String resolvedByName;
        private OffsetDateTime resolvedAt;
        private String resolutionNote;
    }
}
