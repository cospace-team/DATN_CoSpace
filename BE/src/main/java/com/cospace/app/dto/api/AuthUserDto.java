package com.cospace.app.dto.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * The user shape returned by the auth endpoints. Carries the resolved {@code branchName} that
 * the raw User entity has no column for, so staff/admin branch labels render after login.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthUserDto {

    private UUID id;
    private String email;
    private String fullName;
    private String phone;
    private String avatarUrl;
    private String role;
    private String status;
    private UUID branchId;
    private String branchName;
}
