package com.example.momosandbox.dto.api;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PaymentDto {

    private String id;

    @JsonProperty("booking_id")
    private String bookingId;

    @JsonProperty("user_id")
    private String userId;

    private String provider;

    private String method;

    @JsonProperty("order_id")
    private String orderId;

    @JsonProperty("request_id")
    private String requestId;

    private long amount;

    private String status;

    @JsonProperty("pay_url")
    private String payUrl;

    @JsonProperty("provider_trans_id")
    private String providerTransId;

    @JsonProperty("paid_at")
    private String paidAt;

    @JsonProperty("created_at")
    private String createdAt;
}
