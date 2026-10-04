package com.cospace.app.dto.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ResetPasswordRequest {

    @NotBlank(message = "Link đặt lại mật khẩu không hợp lệ")
    private String token;

    // Same rule as registration (RegisterRequest.password).
    @NotBlank(message = "Mật khẩu là bắt buộc")
    @Size(min = 8, message = "Mật khẩu tối thiểu 8 ký tự")
    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*$", message = "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số")
    private String newPassword;

    @NotBlank(message = "Mật khẩu xác nhận là bắt buộc")
    private String confirmPassword;
}
