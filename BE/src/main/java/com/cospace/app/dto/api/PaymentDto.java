package com.cospace.app.dto.api;

import com.cospace.app.entity.PaymentStatus;
import lombok.Builder;
import lombok.Data;
import java.util.UUID;

@Data
@Builder
public class PaymentDto {

    private UUID id;

    private UUID bookingId;

    private UUID userId;



    private String provider;

    private String method;

    private String orderId;

    private String requestId;

    private long amount;

    private PaymentStatus status;

    private String payUrl;

    private String gatewayTransactionId;

    private String paidAt;
    
    private String refundedAt;

    private String createdAt;
}
