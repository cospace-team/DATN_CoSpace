package com.cospace.app.dto.api;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {

    @NotBlank(message = "Email là bắt buộc")
    @Email(message = "Email không hợp lệ")
    private String email;

    @NotBlank(message = "Mật khẩu là bắt buộc")
    @Size(min = 8, message = "Mật khẩu tối thiểu 8 ký tự")
    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*$", message = "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số")
    private String password;

    @NotBlank(message = "Mật khẩu xác nhận là bắt buộc")
    private String confirmPassword;

    @NotBlank(message = "Họ và tên là bắt buộc")
    @Size(min = 2, max = 150, message = "Họ và tên từ 2 đến 150 ký tự")
    private String fullName;

    @Pattern(regexp = "^$|^(0[3|5|7|8|9])+([0-9]{8})$", message = "Số điện thoại không hợp lệ")
    private String phone;
}
