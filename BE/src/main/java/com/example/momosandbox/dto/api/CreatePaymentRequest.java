package com.example.momosandbox.dto.api;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class CreatePaymentRequest {

    @JsonProperty("booking_id")
    @NotNull
    private UUID bookingId;
}
