package com.cospace.app.dto.api;

import com.cospace.app.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String status;
    private String message;
    private AuthData data;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AuthData {
        private User user;
        private String accessToken;
        private String refreshToken;
        private int expiresIn;
    }
}
