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
        /** Bank account the customer asked a transfer refund to be sent to. */
        private String receivingBankName;
        private String receivingAccountNumber;
        private String receivingAccountName;
    }

    /** The customer's bank account for receiving a refund by transfer. */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReceivingAccountRequest {
        @jakarta.validation.constraints.NotBlank(message = "Vui lòng nhập tên ngân hàng")
        @Size(max = 100, message = "Tên ngân hàng tối đa 100 ký tự")
        private String bankName;

        @jakarta.validation.constraints.NotBlank(message = "Vui lòng nhập số tài khoản")
        @jakarta.validation.constraints.Pattern(regexp = "^[0-9 ]{6,24}$", message = "Số tài khoản chỉ gồm 6–20 chữ số")
        private String accountNumber;

        @jakarta.validation.constraints.NotBlank(message = "Vui lòng nhập tên chủ tài khoản")
        @Size(max = 100, message = "Tên chủ tài khoản tối đa 100 ký tự")
        private String accountName;
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
