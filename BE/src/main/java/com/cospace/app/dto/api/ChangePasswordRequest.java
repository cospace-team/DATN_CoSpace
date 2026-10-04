package com.cospace.app.dto.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChangePasswordRequest {
    private String oldPassword;

    @NotBlank(message = "Mật khẩu mới không được để trống")
    @Size(min = 8, message = "Mật khẩu mới phải có ít nhất 8 ký tự")
    // Same rule as registration and password reset (CredentialRules).
    @jakarta.validation.constraints.Pattern(regexp = com.cospace.app.util.CredentialRules.PASSWORD_REGEX,
            message = com.cospace.app.util.CredentialRules.PASSWORD_MESSAGE)
    private String newPassword;

    @NotBlank(message = "Mật khẩu xác nhận không được để trống")
    private String confirmNewPassword;
}
