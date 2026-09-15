package com.cospace.app.util;

import com.cospace.app.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtUtilTest {

    static final String TEST_SECRET = "unit-test-secret-key-that-is-long-enough-for-hs384-signing!!";

    private JwtUtil jwtUtil;
    private User user;

    static JwtUtil newJwtUtil(String secret) {
        JwtUtil util = new JwtUtil();
        ReflectionTestUtils.setField(util, "jwtSecret", secret);
        ReflectionTestUtils.setField(util, "jwtExpiration", 3600);
        ReflectionTestUtils.setField(util, "refreshExpiration", 2592000);
        return util;
    }

    @BeforeEach
    void setUp() {
        jwtUtil = newJwtUtil(TEST_SECRET);
        user = User.builder()
                .id(UUID.randomUUID())
                .email("staff@cospace.vn")
                .fullName("Nhân Viên")
                .role(User.Role.staff)
                .branchId(UUID.randomUUID())
                .build();
    }

    private Claims parse(String token, String secret) {
        SecretKey key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    }

    @Test
    void accessTokenCarriesIdentityRoleAndTokenUse() {
        Claims claims = parse(jwtUtil.generateAccessToken(user), TEST_SECRET);

        assertThat(claims.getSubject()).isEqualTo(user.getId().toString());
        assertThat(claims.get("email", String.class)).isEqualTo("staff@cospace.vn");
        assertThat(claims.get(JwtUtil.CLAIM_TOKEN_USE, String.class)).isEqualTo(JwtUtil.TOKEN_USE_ACCESS);
        @SuppressWarnings("unchecked")
        Map<String, Object> appMetadata = claims.get("app_metadata", Map.class);
        assertThat(appMetadata).containsEntry("role", "staff")
                .containsEntry("branch_id", user.getBranchId().toString());
        assertThat(claims.getExpiration().getTime() - claims.getIssuedAt().getTime()).isEqualTo(3600_000L);
    }

    @Test
    void accessTokenIsSignedWithHs384SoSecurityConfigCanVerifyIt() {
        String token = jwtUtil.generateAccessToken(user);

        String header = new String(java.util.Base64.getUrlDecoder().decode(token.split("\\.")[0]), StandardCharsets.UTF_8);
        assertThat(header).contains("\"alg\":\"HS384\"");
    }

    @Test
    void accessTokenHandlesUserWithoutAvatarOrBranch() {
        user.setBranchId(null);
        user.setAvatarUrl(null);

        Claims claims = parse(jwtUtil.generateAccessToken(user), TEST_SECRET);

        @SuppressWarnings("unchecked")
        Map<String, Object> appMetadata = claims.get("app_metadata", Map.class);
        assertThat(appMetadata).containsEntry("branch_id", "");
    }

    @Test
    void refreshTokenRoundTripsToUserId() {
        String refreshToken = jwtUtil.generateRefreshToken(user);

        assertThat(jwtUtil.parseRefreshToken(refreshToken)).isEqualTo(user.getId());
    }

    @Test
    void refreshTokenDoesNotCarryRoleClaims() {
        Claims claims = parse(jwtUtil.generateRefreshToken(user), TEST_SECRET);

        assertThat(claims.get(JwtUtil.CLAIM_TOKEN_USE, String.class)).isEqualTo(JwtUtil.TOKEN_USE_REFRESH);
        assertThat(claims).doesNotContainKeys("app_metadata", "user_metadata", "email");
    }

    @Test
    void accessTokenCannotBeUsedAsRefreshToken() {
        String accessToken = jwtUtil.generateAccessToken(user);

        assertThatThrownBy(() -> jwtUtil.parseRefreshToken(accessToken))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("refresh token");
    }

    @Test
    void rejectsRefreshTokenSignedWithAnotherSecret() {
        String forged = newJwtUtil("another-secret-key-that-is-long-enough-for-hs384-signing!!!!!")
                .generateRefreshToken(user);

        assertThatThrownBy(() -> jwtUtil.parseRefreshToken(forged))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsExpiredRefreshToken() {
        JwtUtil expiring = newJwtUtil(TEST_SECRET);
        ReflectionTestUtils.setField(expiring, "refreshExpiration", -60);
        String expired = expiring.generateRefreshToken(user);

        assertThatThrownBy(() -> jwtUtil.parseRefreshToken(expired))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("hết hạn");
    }

    @Test
    void rejectsBlankOrMalformedRefreshToken() {
        assertThatThrownBy(() -> jwtUtil.parseRefreshToken(null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> jwtUtil.parseRefreshToken(" ")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> jwtUtil.parseRefreshToken("not.a.jwt")).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsRefreshTokenWithNonUuidSubject() {
        SecretKey key = Keys.hmacShaKeyFor(TEST_SECRET.getBytes(StandardCharsets.UTF_8));
        String token = Jwts.builder()
                .subject("not-a-uuid")
                .claim(JwtUtil.CLAIM_TOKEN_USE, JwtUtil.TOKEN_USE_REFRESH)
                .signWith(key)
                .compact();

        assertThatThrownBy(() -> jwtUtil.parseRefreshToken(token))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
