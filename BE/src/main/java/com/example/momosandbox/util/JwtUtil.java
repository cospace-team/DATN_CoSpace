package com.example.momosandbox.util;

import com.example.momosandbox.entity.User;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;

@Component
public class JwtUtil {

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
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSigningKey())
                .compact();
    }
    
    public int getJwtExpiration() {
        return jwtExpiration;
    }
}
