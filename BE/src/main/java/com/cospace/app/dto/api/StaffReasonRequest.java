package com.cospace.app.dto.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class StaffReasonRequest {
    @NotBlank(message = "Vui lòng nhập lý do")
    @Size(max = 255, message = "Lý do tối đa 255 ký tự")
    private String reason;
}
