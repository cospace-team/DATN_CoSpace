package com.example.momosandbox.dto.api;

import com.example.momosandbox.entity.PaymentStatus;
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
