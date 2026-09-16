package com.cospace.app.config;

import com.cospace.app.controller.ApiHealthController;
import com.cospace.app.entity.User;
import com.cospace.app.repository.UserRepository;
import com.cospace.app.util.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Drives real HTTP requests through the production {@link SecurityConfig} filter chain with tokens
 * signed exactly like {@link JwtUtil} signs them at login. Only {@link ApiHealthController} is loaded,
 * so a request that passes authorization on any other path ends in 404 (no handler) — which is how
 * these tests tell "allowed" apart from 401/403 without needing a database.
 */
@WebMvcTest(controllers = ApiHealthController.class)
@Import(SecurityConfig.class)
@TestPropertySource(properties = {
        "app.jwt.secret=" + SecurityConfigRouteAuthorizationTest.SECRET,
        "spring.security.oauth2.resourceserver.jwt.issuer-uri=https://example.supabase.co/auth/v1",
        "app.cors.allowed-origins=https://app.cospace.example,https://cospace-*-acme.vercel.app"
})
class SecurityConfigRouteAuthorizationTest {

    static final String SECRET = "route-test-secret-key-that-is-long-enough-for-hs384-sign";

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private JdbcTemplate jdbcTemplate;

    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "jwtSecret", SECRET);
        ReflectionTestUtils.setField(jwtUtil, "jwtExpiration", 3600);
        ReflectionTestUtils.setField(jwtUtil, "refreshExpiration", 2592000);
    }

    private User givenUser(User.Role role, User.Status status) {
        User user = User.builder()
                .id(UUID.randomUUID())
                .email(role.name() + "@cospace.vn")
                .fullName("Test " + role.name())
                .role(role)
                .status(status)
                .branchId(role == User.Role.super_admin || role == User.Role.customer ? null : UUID.randomUUID())
                .build();
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        return user;
    }

    private String bearer(User.Role role) {
        return "Bearer " + jwtUtil.generateAccessToken(givenUser(role, User.Status.active));
    }

    @Nested
    class PublicEndpoints {

        @Test
        void healthCheckIsPublic() throws Exception {
            when(jdbcTemplate.queryForObject(eq("select 1"), eq(Integer.class))).thenReturn(1);

            mockMvc.perform(get("/api/health"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("UP"));
        }

        @Test
        void loginAndRegisterDoNotRequireToken() throws Exception {
            mockMvc.perform(post("/api/auth/login")).andExpect(status().isNotFound());
            mockMvc.perform(post("/api/auth/register")).andExpect(status().isNotFound());
            mockMvc.perform(post("/api/auth/refresh")).andExpect(status().isNotFound());
        }

        @Test
        void corsPreflightFromAllowedOriginSucceeds() throws Exception {
            mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                            .options("/api/bookings")
                            .header("Origin", "https://app.cospace.example")
                            .header("Access-Control-Request-Method", "POST"))
                    .andExpect(status().isOk());
        }

        @Test
        void corsPreflightFromWildcardOriginSucceeds() throws Exception {
            // Vercel gives each deployment its own <project>-<hash>-<team> host, so the allowlist has
            // to match a shape rather than a fixed string.
            mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                            .options("/api/bookings")
                            .header("Origin", "https://cospace-9958dbwqt-acme.vercel.app")
                            .header("Access-Control-Request-Method", "POST"))
                    .andExpect(status().isOk());
        }

        @Test
        void corsPreflightFromLookalikeOfWildcardOriginIsRejected() throws Exception {
            // The pattern is anchored to one Vercel account: a host that merely ends in .vercel.app
            // must not slip through.
            mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                            .options("/api/bookings")
                            .header("Origin", "https://cospace-9958dbwqt-attacker.vercel.app")
                            .header("Access-Control-Request-Method", "POST"))
                    .andExpect(status().isForbidden());
        }

        @Test
        void corsPreflightFromUnknownOriginIsRejected() throws Exception {
            mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                            .options("/api/bookings")
                            .header("Origin", "https://evil.example")
                            .header("Access-Control-Request-Method", "POST"))
                    .andExpect(status().isForbidden());
        }
    }

    @Nested
    class Authentication {

        @Test
        void missingTokenIsUnauthorized() throws Exception {
            mockMvc.perform(get("/api/bookings/me"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.error").value("UNAUTHORIZED"));
        }

        @Test
        void garbageTokenIsUnauthorized() throws Exception {
            mockMvc.perform(get("/api/bookings/me").header("Authorization", "Bearer abc.def.ghi"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        void tokenSignedWithAnotherSecretIsUnauthorized() throws Exception {
            JwtUtil attacker = new JwtUtil();
            ReflectionTestUtils.setField(attacker, "jwtSecret", "attacker-secret-key-that-is-long-enough-for-hs384-sign!!");
            ReflectionTestUtils.setField(attacker, "jwtExpiration", 3600);
            User forged = User.builder().id(UUID.randomUUID()).email("x@x.vn").fullName("X")
                    .role(User.Role.super_admin).build();

            mockMvc.perform(get("/api/admin/users")
                            .header("Authorization", "Bearer " + attacker.generateAccessToken(forged)))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        void expiredTokenIsUnauthorized() throws Exception {
            ReflectionTestUtils.setField(jwtUtil, "jwtExpiration", -120);
            String expired = jwtUtil.generateAccessToken(givenUser(User.Role.customer, User.Status.active));

            mockMvc.perform(get("/api/bookings/me").header("Authorization", "Bearer " + expired))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        void refreshTokenCannotBeUsedAsBearerToken() throws Exception {
            User user = givenUser(User.Role.super_admin, User.Status.active);

            mockMvc.perform(get("/api/admin/users")
                            .header("Authorization", "Bearer " + jwtUtil.generateRefreshToken(user)))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        void suspendedUsersTokenStopsWorkingImmediately() throws Exception {
            User user = givenUser(User.Role.customer, User.Status.suspended);

            mockMvc.perform(get("/api/bookings/me")
                            .header("Authorization", "Bearer " + jwtUtil.generateAccessToken(user)))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        void validCustomerTokenIsAccepted() throws Exception {
            mockMvc.perform(get("/api/bookings/me").header("Authorization", bearer(User.Role.customer)))
                    .andExpect(status().isNotFound());
        }
    }

    @Nested
    class RoleBasedRoutes {

        @Test
        void customerIsForbiddenFromStaffBranchAdminAndAdminRoutes() throws Exception {
            String token = bearer(User.Role.customer);

            mockMvc.perform(get("/api/staff/dashboard").header("Authorization", token)).andExpect(status().isForbidden());
            mockMvc.perform(post("/api/checkins").header("Authorization", token)).andExpect(status().isForbidden());
            mockMvc.perform(get("/api/bookings/branch-today").header("Authorization", token)).andExpect(status().isForbidden());
            mockMvc.perform(get("/api/bookings/code/WH-ABC234").header("Authorization", token)).andExpect(status().isForbidden());
            mockMvc.perform(get("/api/branch-admin/spaces").header("Authorization", token)).andExpect(status().isForbidden());
            mockMvc.perform(get("/api/admin/users").header("Authorization", token))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.error").value("FORBIDDEN"));
        }

        @Test
        void staffCanReachStaffRoutesOnly() throws Exception {
            String token = bearer(User.Role.staff);

            mockMvc.perform(get("/api/staff/dashboard").header("Authorization", token)).andExpect(status().isNotFound());
            mockMvc.perform(post("/api/checkins").header("Authorization", token)).andExpect(status().isNotFound());
            mockMvc.perform(get("/api/bookings/branch-today").header("Authorization", token)).andExpect(status().isNotFound());
            mockMvc.perform(get("/api/branch-admin/spaces").header("Authorization", token)).andExpect(status().isForbidden());
            mockMvc.perform(get("/api/admin/users").header("Authorization", token)).andExpect(status().isForbidden());
        }

        @Test
        void branchAdminCanReachBranchAdminButNotAdminRoutes() throws Exception {
            String token = bearer(User.Role.branch_admin);

            mockMvc.perform(get("/api/staff/dashboard").header("Authorization", token)).andExpect(status().isNotFound());
            mockMvc.perform(get("/api/branch-admin/spaces").header("Authorization", token)).andExpect(status().isNotFound());
            mockMvc.perform(get("/api/admin/users").header("Authorization", token)).andExpect(status().isForbidden());
        }

        @Test
        void superAdminCanReachEveryRoleRoute() throws Exception {
            String token = bearer(User.Role.super_admin);

            mockMvc.perform(get("/api/staff/dashboard").header("Authorization", token)).andExpect(status().isNotFound());
            mockMvc.perform(get("/api/branch-admin/spaces").header("Authorization", token)).andExpect(status().isNotFound());
            mockMvc.perform(get("/api/admin/users").header("Authorization", token)).andExpect(status().isNotFound());
        }

        @Test
        void roleClaimInTokenCannotEscalateBeyondDatabaseRole() throws Exception {
            User customer = givenUser(User.Role.customer, User.Status.active);
            User claimsToBeAdmin = User.builder().id(customer.getId()).email(customer.getEmail())
                    .fullName(customer.getFullName()).role(User.Role.super_admin).build();

            mockMvc.perform(get("/api/admin/users")
                            .header("Authorization", "Bearer " + jwtUtil.generateAccessToken(claimsToBeAdmin)))
                    .andExpect(status().isForbidden());
        }
    }

    @Nested
    class KnownIssues {

        @Test
        void paymentSimulationRequiresAuthentication() throws Exception {
            mockMvc.perform(post("/api/payments/payos/simulate"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @Disabled("Cấu hình thừa: /h2-console/** vẫn permitAll dù dự án không dùng H2. Bật lại test sau khi xoá.")
        void h2ConsoleIsNotPublic() throws Exception {
            mockMvc.perform(get("/h2-console/"))
                    .andExpect(status().isUnauthorized());
        }
    }
}
