package com.example.momosandbox.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MomoRequest {
    @NotBlank(message = "partnerName không được trống")
    private String partnerName;

    @NotBlank(message = "orderId không được trống")
    private String orderId;

    @NotBlank(message = "orderInfo không được trống")
    private String orderInfo;

    @Positive(message = "amount phải lớn hơn 0")
    private long amount;

    @NotBlank(message = "requestId không được trống")
    private String requestId;

    @NotBlank(message = "autoCapture không được trống")
    private String autoCapture; // "true" hoặc "false"
}
