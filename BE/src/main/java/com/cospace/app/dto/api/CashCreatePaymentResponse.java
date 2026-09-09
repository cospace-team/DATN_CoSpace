package com.cospace.app.dto.api;

import com.cospace.app.entity.PaymentStatus;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class CashCreatePaymentResponse {

    private UUID paymentId;
    private UUID bookingId;
    private String provider;
    private String method;
    private long amount;
    private PaymentStatus status;
    private String paidAt;
}
