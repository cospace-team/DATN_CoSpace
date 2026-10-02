package com.cospace.app.dto.api;

import com.cospace.app.service.CancellationService.EndEarlyRefund;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** What staff supply to end a booking in use early and refund the customer. */
@Data
public class StaffEndEarlyRequest {

    @NotBlank(message = "Vui lòng nhập lý do kết thúc sớm")
    @Size(max = 255, message = "Lý do tối đa 255 ký tự")
    private String reason;

    /** UNUSED: the rental share for the time left; FULL: everything refundable; CUSTOM: {@link #amount}. */
    private EndEarlyRefund refundMode = EndEarlyRefund.UNUSED;

    /** Refund for CUSTOM, from 0 up to what is refundable. */
    private Long amount;
}
