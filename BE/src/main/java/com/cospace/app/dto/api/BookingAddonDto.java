package com.cospace.app.dto.api;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/** Add-on services ordered for a booking (the running tab). */
public final class BookingAddonDto {

    private BookingAddonDto() {
    }

    /** One service and how many of it, as ordered at checkout or at the counter. */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LineRequest {
        @NotNull(message = "serviceId không được để trống")
        private UUID serviceId;

        @Min(value = 1, message = "Số lượng phải từ 1")
        @Max(value = 100, message = "Số lượng tối đa là 100")
        private int quantity = 1;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SettleRequest {
        /** cash | bank_transfer */
        private String method;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ItemResponse {
        private UUID id;
        private UUID serviceId;
        private String serviceName;
        private String serviceUnit;
        private int quantity;
        private long unitPrice;
        private long subtotal;
        private String status;
        private OffsetDateTime createdAt;
        private OffsetDateTime paidAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TabResponse {
        private UUID bookingId;
        private String bookingCode;
        private String bookingStatus;
        private UUID branchId;
        private List<ItemResponse> items;
        /** Still owed at the counter. */
        private long unpaidAmount;
        private long paidAmount;
    }
}
