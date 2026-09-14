package com.cospace.app.dto.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserProfileDto {
    private UUID id;
    private String email;
    private String fullName;
    private String phone;
    private String avatarUrl;
    private String role;
    private String status;
    private UUID branchId;
    private String branchName;
    private String bio;
    private String profession;
    private String company;
    private boolean contactPublic;
    private String contactLink;
    private java.time.OffsetDateTime createdAt;
}
