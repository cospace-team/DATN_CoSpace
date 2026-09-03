package com.example.momosandbox.dto.api;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class WalkinUserCreateRequest {
    @NotBlank(message = "Tên khách hàng không được để trống")
    private String fullName;

    @NotBlank(message = "Số điện thoại không được để trống")
    private String phone;
}
