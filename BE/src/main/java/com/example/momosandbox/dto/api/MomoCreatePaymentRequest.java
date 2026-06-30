package com.example.momosandbox.dto.api;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class MomoCreatePaymentRequest {

    @JsonProperty("booking_id")
    @NotBlank
    private String bookingId;
}
