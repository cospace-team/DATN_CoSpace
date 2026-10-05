package com.cospace.app.dto.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * What the counter gets when it looks a customer up to book for them: enough to tell two people
 * apart and call them, and nothing of their account (no e-mail, profile, role or branch).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerLookupDto {
    private UUID id;
    private String fullName;
    private String phone;
    private String membershipTier;
    private Integer reputationScore;
}
