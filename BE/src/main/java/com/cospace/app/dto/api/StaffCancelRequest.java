package com.cospace.app.dto.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** What a staff member must supply to cancel a booking on a customer's behalf. */
@Data
public class StaffCancelRequest {

    /** Why the booking is being cancelled; recorded on the cancellation and in the audit log. */
    @NotBlank(message = "Vui lòng nhập lý do hủy đơn thay khách")
    @Size(max = 255, message = "Lý do hủy tối đa 255 ký tự")
    private String reason;

    /**
     * Refunds everything the customer paid, ignoring the cancellation policy. For cases where the
     * branch is at fault — a room that turned out to be unusable, a double booking we created.
     */
    private boolean waivePenalty;
}
