package com.cospace.app.dto.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Moves a customer's booking to another seat and/or another start time. The length of the booking
 * never changes, so the price does not either.
 */
@Data
public class StaffMoveRequest {
    /** The seat to move to; omit to keep the current one. */
    private UUID workspaceId;

    /** The new start; the end follows (same length). Omit to keep the current time. */
    private OffsetDateTime startAt;

    @NotBlank(message = "Vui lòng nhập lý do đổi chỗ / đổi giờ")
    @Size(max = 255, message = "Lý do tối đa 255 ký tự")
    private String reason;
}
