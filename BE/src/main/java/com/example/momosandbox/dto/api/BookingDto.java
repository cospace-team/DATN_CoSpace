package com.example.momosandbox.dto.api;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class BookingDto {

    private String id;

    @JsonProperty("booking_code")
    private String bookingCode;

    @JsonProperty("user_id")
    private String userId;

    @JsonProperty("workspace_id")
    private String workspaceId;

    @JsonProperty("branch_id")
    private String branchId;

    @JsonProperty("workspace_type_id")
    private String workspaceTypeId;

    @JsonProperty("start_at")
    private String startAt;

    @JsonProperty("end_at")
    private String endAt;

    private String unit;

    @JsonProperty("unit_count")
    private int unitCount;

    private String status;

    @JsonProperty("subtotal_amount")
    private long subtotalAmount;

    @JsonProperty("discount_amount")
    private long discountAmount;

    @JsonProperty("addon_amount")
    private long addonAmount;

    @JsonProperty("total_amount")
    private long totalAmount;

    @JsonProperty("payment_deadline_at")
    private String paymentDeadlineAt;

    private String source;

    @JsonProperty("created_at")
    private String createdAt;
}
