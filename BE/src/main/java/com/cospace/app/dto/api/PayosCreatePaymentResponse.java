package com.cospace.app.dto.api;

import com.cospace.app.entity.PaymentStatus;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class PayosCreatePaymentResponse {
    private UUID paymentId;
    private UUID bookingId;
    private Long orderCode;
    private String orderId;
    private String provider;
    private String checkoutUrl;
    private String qrCode;
    private long amount;
    private PaymentStatus status;
    private String message;
}
