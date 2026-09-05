package com.cospace.app.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MomoResponse {
    @JsonProperty("partnerCode")
    private String partnerCode;

    @JsonProperty("requestId")
    private String requestId;

    @JsonProperty("orderId")
    private String orderId;

    /** MoMo v2 uses resultCode. Kept for backward compatibility. */
    @JsonProperty("errorCode")
    private Integer errorCode;

    @JsonProperty("resultCode")
    private Integer resultCode;

    @JsonProperty("amount")
    private Long amount;

    @JsonProperty("responseTime")
    private Long responseTime;

    @JsonProperty("message")
    private String message;

    @JsonProperty("payUrl")
    private String payUrl;

    @JsonProperty("deeplink")
    private String deeplink;

    @JsonProperty("qrCodeUrl")
    private String qrCodeUrl;

    @JsonProperty("requestType")
    private String requestType;
}
