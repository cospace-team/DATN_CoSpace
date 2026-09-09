package com.cospace.app.dto.api;

import com.cospace.app.entity.PaymentStatus;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class MomoCreatePaymentResponse {

    private UUID paymentId;
    private UUID bookingId;
    private String orderId;
    private String provider;
    private String payUrl;
    private String qrCodeUrl;
    private long amount;
    private PaymentStatus status;
    private String message;
}
