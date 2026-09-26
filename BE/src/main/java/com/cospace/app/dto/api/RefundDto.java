package com.cospace.app.dto.api;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

public class RefundDto {

    private RefundDto() {
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RefundResponse {
        private UUID id;
        private UUID bookingId;
        private String bookingCode;
        private String bookingStatus;
        private UUID paymentId;
        private String paymentProvider;
        private UUID userId;
        private String customerName;
        private String customerPhone;
        private String customerEmail;
        private UUID branchId;
        private String branchName;
        private long amount;
        /** CANCELLATION | MAINTENANCE | LATE_PAYMENT | DUPLICATE_PAYMENT */
        private String reasonType;
        private String reason;
        /** pending | processed | rejected */
        private String status;
        private String resolutionNote;
        /** cash | bank_transfer | voucher */
        private String refundMethod;
        private String voucherCode;
        private OffsetDateTime voucherExpiresAt;
        private String processedByName;
        private OffsetDateTime processedAt;
        private OffsetDateTime createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResolveRequest {
        @Size(max = 1000, message = "Ghi chú tối đa 1000 ký tự")
        private String note;

        /** How the money goes back: cash | bank_transfer (default) | voucher. Ignored when rejecting. */
        private String method;

        /** Validity of the voucher in days when method = voucher (default 90). */
        private Integer voucherValidDays;
    }
}
