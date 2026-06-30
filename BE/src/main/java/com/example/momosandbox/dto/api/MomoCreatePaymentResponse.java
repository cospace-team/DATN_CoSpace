package com.example.momosandbox.dto.api;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MomoCreatePaymentResponse {

    @JsonProperty("order_id")
    private String orderId;

    @JsonProperty("pay_url")
    private String payUrl;
}
