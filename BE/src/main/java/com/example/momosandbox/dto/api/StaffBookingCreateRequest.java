package com.example.momosandbox.dto.api;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.UUID;

@Data
@EqualsAndHashCode(callSuper = true)
public class StaffBookingCreateRequest extends BookingCreateRequest {
    private UUID customerId;

    private String customerName;

    private String customerPhone;
}
