package com.cospace.app.util;

import com.cospace.app.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

@Component
public class JwtUtil {

    /**
     * Distinguishes the two tokens we issue. Without it a refresh token — same key, same shape,
     * 30-day lifetime — would be accepted as an API bearer token.
     */
    public static final String CLAIM_TOKEN_USE = "token_use";
    public static final String TOKEN_USE_ACCESS = "access";
    public static final String TOKEN_USE_REFRESH = "refresh";

    @Value("${app.jwt.secret:defaultSecretKeyWhichIsVeryLongAndSecureForLocalAuth1234!@#}")
    private String jwtSecret;

    @Value("${app.jwt.expiration:3600}")
    private int jwtExpiration;

    @Value("${app.jwt.refresh-expiration:2592000}")
    private int refreshExpiration;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateAccessToken(User user) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + (jwtExpiration * 1000L));

        // Compatible with Supabase structure for AuthController
        Map<String, Object> userMetadata = Map.of(
                "email", user.getEmail(),
                "full_name", user.getFullName(),
                "avatar_url", user.getAvatarUrl() != null ? user.getAvatarUrl() : "",
                "role", user.getRole().name()
        );

        Map<String, Object> appMetadata = Map.of(
                "role", user.getRole().name(),
                "branch_id", user.getBranchId() != null ? user.getBranchId().toString() : "",
                "branch_name", "" // Add if branch entity exists
        );

        return Jwts.builder()
                .subject(user.getId().toString())
                .claim("email", user.getEmail())
                .claim("user_metadata", userMetadata)
                .claim("app_metadata", appMetadata)
                .claim(CLAIM_TOKEN_USE, TOKEN_USE_ACCESS)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSigningKey())
                .compact();
    }

    public String generateRefreshToken(User user) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + (refreshExpiration * 1000L));

        return Jwts.builder()
                .subject(user.getId().toString())
                .claim(CLAIM_TOKEN_USE, TOKEN_USE_REFRESH)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSigningKey())
                .compact();
    }

    /**
     * Verifies a refresh token's signature and expiry and returns the user it belongs to.
     * Rejects access tokens so a stolen short-lived token can't be traded for a 30-day one.
     */
    public UUID parseRefreshToken(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new IllegalArgumentException("Thiếu refresh token.");
        }
        Claims claims;
        try {
            claims = Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(refreshToken)
                    .getPayload();
        } catch (JwtException | IllegalArgumentException e) {
            throw new IllegalArgumentException("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        }

        if (!TOKEN_USE_REFRESH.equals(claims.get(CLAIM_TOKEN_USE, String.class))) {
            throw new IllegalArgumentException("Token không phải refresh token.");
        }

        try {
            return UUID.fromString(claims.getSubject());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Refresh token không hợp lệ.");
        }
    }

    public int getJwtExpiration() {
        return jwtExpiration;
    }
}
