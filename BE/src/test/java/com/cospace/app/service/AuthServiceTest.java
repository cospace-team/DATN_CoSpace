package com.cospace.app.service;

import com.cospace.app.dto.api.AuthResponse;
import com.cospace.app.dto.api.LoginRequest;
import com.cospace.app.dto.api.RegisterRequest;
import com.cospace.app.entity.User;
import com.cospace.app.repository.BranchEntityRepository;
import com.cospace.app.repository.UserRepository;
import com.cospace.app.util.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private BranchEntityRepository branchEntityRepository;

    // A low BCrypt cost keeps the suite fast while still exercising real hashing.
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);
    private JwtUtil jwtUtil;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "jwtSecret", "unit-test-secret-key-that-is-long-enough-for-hs384-signing!!");
        ReflectionTestUtils.setField(jwtUtil, "jwtExpiration", 3600);
        ReflectionTestUtils.setField(jwtUtil, "refreshExpiration", 2592000);
        authService = new AuthService(userRepository, branchEntityRepository, passwordEncoder, jwtUtil);
    }

    private User existingUser(String rawPassword, User.Status status) {
        return User.builder()
                .id(UUID.randomUUID())
                .email("khach@cospace.vn")
                .fullName("Khách Hàng")
                .password(passwordEncoder.encode(rawPassword))
                .role(User.Role.customer)
                .status(status)
                .build();
    }

    @Nested
    class Register {

        private RegisterRequest request() {
            RegisterRequest req = new RegisterRequest();
            req.setEmail("moi@cospace.vn");
            req.setPassword("Secret123");
            req.setConfirmPassword("Secret123");
            req.setFullName("Người Mới");
            req.setPhone("0912345678");
            return req;
        }

        @Test
        void createsActiveCustomerWithHashedPassword() {
            when(userRepository.existsByEmail("moi@cospace.vn")).thenReturn(false);
            when(userRepository.save(any(User.class))).thenAnswer(inv -> {
                User u = inv.getArgument(0);
                u.setId(UUID.randomUUID());
                return u;
            });

            AuthResponse response = authService.register(request());

            ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
            verify(userRepository).save(captor.capture());
            User saved = captor.getValue();
            assertThat(saved.getRole()).isEqualTo(User.Role.customer);
            assertThat(saved.getStatus()).isEqualTo(User.Status.active);
            assertThat(saved.getPassword()).isNotEqualTo("Secret123");
            assertThat(passwordEncoder.matches("Secret123", saved.getPassword())).isTrue();

            assertThat(response.getData().getAccessToken()).isNotBlank();
            assertThat(response.getData().getRefreshToken()).isNotBlank();
            assertThat(response.getData().getUser().getRole()).isEqualTo("customer");
            assertThat(jwtUtil.parseRefreshToken(response.getData().getRefreshToken())).isEqualTo(saved.getId());
        }

        @Test
        void rejectsDuplicateEmail() {
            when(userRepository.existsByEmail("moi@cospace.vn")).thenReturn(true);

            assertThatThrownBy(() -> authService.register(request()))
                    .isInstanceOf(IllegalArgumentException.class);
            verify(userRepository, never()).save(any());
        }

        @Test
        void rejectsMismatchedConfirmation() {
            RegisterRequest req = request();
            req.setConfirmPassword("Different123");

            assertThatThrownBy(() -> authService.register(req))
                    .isInstanceOf(IllegalArgumentException.class);
            verify(userRepository, never()).save(any());
        }
    }

    @Nested
    class Login {

        private LoginRequest request(String password) {
            LoginRequest req = new LoginRequest();
            req.setEmail("khach@cospace.vn");
            req.setPassword(password);
            return req;
        }

        @Test
        void returnsTokensForValidCredentials() {
            when(userRepository.findByEmail("khach@cospace.vn"))
                    .thenReturn(Optional.of(existingUser("Secret123", User.Status.active)));

            AuthResponse response = authService.login(request("Secret123"));

            assertThat(response.getStatus()).isEqualTo("success");
            assertThat(response.getData().getAccessToken()).isNotBlank();
            assertThat(response.getData().getExpiresIn()).isEqualTo(3600);
        }

        @Test
        void wrongPasswordAndUnknownEmailGiveTheSameMessage() {
            when(userRepository.findByEmail("khach@cospace.vn"))
                    .thenReturn(Optional.of(existingUser("Secret123", User.Status.active)))
                    .thenReturn(Optional.empty());

            String wrongPassword = catchMessage(() -> authService.login(request("Wrong123")));
            String unknownEmail = catchMessage(() -> authService.login(request("Secret123")));

            assertThat(wrongPassword).isEqualTo(unknownEmail);
        }

        @Test
        void suspendedUserCannotLogIn() {
            when(userRepository.findByEmail("khach@cospace.vn"))
                    .thenReturn(Optional.of(existingUser("Secret123", User.Status.suspended)));

            assertThatThrownBy(() -> authService.login(request("Secret123")))
                    .isInstanceOf(IllegalStateException.class);
        }

        @Test
        void accountWithoutLocalPasswordCannotLogIn() {
            User googleOnly = existingUser("x", User.Status.active);
            googleOnly.setPassword(null);
            when(userRepository.findByEmail("khach@cospace.vn")).thenReturn(Optional.of(googleOnly));

            assertThatThrownBy(() -> authService.login(request("anything")))
                    .isInstanceOf(RuntimeException.class);
        }

        private String catchMessage(Runnable action) {
            try {
                action.run();
            } catch (RuntimeException ex) {
                return ex.getMessage();
            }
            throw new AssertionError("Expected login to fail");
        }
    }

    @Nested
    class Refresh {

        @Test
        void issuesNewTokensForActiveUser() {
            User user = existingUser("Secret123", User.Status.active);
            when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

            AuthResponse response = authService.refresh(jwtUtil.generateRefreshToken(user));

            assertThat(response.getData().getUser().getId()).isEqualTo(user.getId());
        }

        @Test
        void suspendedUserCannotRefresh() {
            User user = existingUser("Secret123", User.Status.suspended);
            when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
            String refreshToken = jwtUtil.generateRefreshToken(user);

            assertThatThrownBy(() -> authService.refresh(refreshToken))
                    .isInstanceOf(IllegalStateException.class);
        }

        @Test
        void deletedUserCannotRefresh() {
            User user = existingUser("Secret123", User.Status.active);
            when(userRepository.findById(user.getId())).thenReturn(Optional.empty());
            String refreshToken = jwtUtil.generateRefreshToken(user);

            assertThatThrownBy(() -> authService.refresh(refreshToken))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Nested
    class SyncGoogleUser {

        private Jwt jwt(String subject, String email, Map<String, Object> userMetadata) {
            Jwt.Builder builder = Jwt.withTokenValue("token").header("alg", "ES256").subject(subject);
            if (email != null) {
                builder.claim("email", email);
            }
            if (userMetadata != null) {
                builder.claim("user_metadata", userMetadata);
            }
            return builder.build();
        }

        @Test
        void createsNewCustomerEvenIfMetadataClaimsAdminRole() {
            UUID id = UUID.randomUUID();
            when(userRepository.findById(id)).thenReturn(Optional.empty());
            when(userRepository.findByEmail("g@gmail.com")).thenReturn(Optional.empty());
            when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

            User user = authService.syncGoogleUser(jwt(id.toString(), "g@gmail.com",
                    Map.of("full_name", "Google User", "role", "super_admin")));

            assertThat(user.getId()).isEqualTo(id);
            assertThat(user.getRole()).isEqualTo(User.Role.customer);
            assertThat(user.getFullName()).isEqualTo("Google User");
        }

        @Test
        void keepsExistingRoleWhenUserAlreadyExists() {
            UUID id = UUID.randomUUID();
            User existing = User.builder().id(id).email("g@gmail.com").fullName("Old")
                    .role(User.Role.branch_admin).build();
            when(userRepository.findById(id)).thenReturn(Optional.of(existing));
            when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

            User user = authService.syncGoogleUser(jwt(id.toString(), "g@gmail.com", Map.of("full_name", "New Name")));

            assertThat(user.getRole()).isEqualTo(User.Role.branch_admin);
            assertThat(user.getFullName()).isEqualTo("New Name");
        }

        @Test
        void fallsBackToEmailPrefixForName() {
            UUID id = UUID.randomUUID();
            when(userRepository.findById(id)).thenReturn(Optional.empty());
            when(userRepository.findByEmail("nguyenvana@gmail.com")).thenReturn(Optional.empty());
            when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

            User user = authService.syncGoogleUser(jwt(id.toString(), "nguyenvana@gmail.com", null));

            assertThat(user.getFullName()).isEqualTo("nguyenvana");
        }

        private Jwt googleJwt(String subject, String email) {
            return Jwt.withTokenValue("token").header("alg", "ES256").subject(subject)
                    .claim("email", email)
                    .claim("app_metadata", Map.of("provider", "google", "providers", List.of("google")))
                    .build();
        }

        private Jwt emailSignupJwt(String subject, String email) {
            return Jwt.withTokenValue("token").header("alg", "ES256").subject(subject)
                    .claim("email", email)
                    // A self-served signup can rewrite its own user_metadata, so a forged
                    // email_verified there must not be enough to claim someone else's account.
                    .claim("user_metadata", Map.of("email_verified", true))
                    .claim("app_metadata", Map.of("provider", "email", "providers", List.of("email")))
                    .build();
        }

        @Test
        void linksAnExistingCustomerAccountToAGoogleIdentity() {
            UUID supabaseId = UUID.randomUUID();
            UUID localId = UUID.randomUUID();
            User existing = User.builder().id(localId).email("khach@gmail.com").fullName("Khách")
                    .role(User.Role.customer).build();
            when(userRepository.findById(supabaseId)).thenReturn(Optional.empty(), Optional.of(existing));
            when(userRepository.findByEmail("khach@gmail.com")).thenReturn(Optional.of(existing));
            when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

            User user = authService.syncGoogleUser(googleJwt(supabaseId.toString(), "khach@gmail.com"));

            verify(userRepository).updateUserId(localId, supabaseId);
            assertThat(user.getRole()).isEqualTo(User.Role.customer);
        }

        @Test
        void refusesToClaimAnExistingAccountFromASelfServedEmailSignup() {
            UUID supabaseId = UUID.randomUUID();
            User existing = User.builder().id(UUID.randomUUID()).email("khach@gmail.com")
                    .role(User.Role.customer).build();
            when(userRepository.findById(supabaseId)).thenReturn(Optional.empty());
            when(userRepository.findByEmail("khach@gmail.com")).thenReturn(Optional.of(existing));

            assertThatThrownBy(() -> authService.syncGoogleUser(emailSignupJwt(supabaseId.toString(), "khach@gmail.com")))
                    .isInstanceOf(IllegalArgumentException.class);

            verify(userRepository, never()).updateUserId(any(), any());
        }

        @Test
        void refusesToLinkAStaffAccountEvenFromGoogle() {
            UUID supabaseId = UUID.randomUUID();
            User staff = User.builder().id(UUID.randomUUID()).email("staff@cospace.vn")
                    .role(User.Role.staff).branchId(UUID.randomUUID()).build();
            when(userRepository.findById(supabaseId)).thenReturn(Optional.empty());
            when(userRepository.findByEmail("staff@cospace.vn")).thenReturn(Optional.of(staff));

            assertThatThrownBy(() -> authService.syncGoogleUser(googleJwt(supabaseId.toString(), "staff@cospace.vn")))
                    .isInstanceOf(IllegalArgumentException.class);

            verify(userRepository, never()).updateUserId(any(), any());
        }

        @Test
        void explainsItselfWhenTheAccountCannotBeRekeyed() {
            UUID supabaseId = UUID.randomUUID();
            User existing = User.builder().id(UUID.randomUUID()).email("khach@gmail.com")
                    .role(User.Role.customer).build();
            when(userRepository.findById(supabaseId)).thenReturn(Optional.empty());
            when(userRepository.findByEmail("khach@gmail.com")).thenReturn(Optional.of(existing));
            // The ON UPDATE CASCADE migration has not been applied to this database yet.
            org.mockito.Mockito.doThrow(new org.springframework.dao.DataIntegrityViolationException("fk"))
                    .when(userRepository).updateUserId(any(), any());

            assertThatThrownBy(() -> authService.syncGoogleUser(googleJwt(supabaseId.toString(), "khach@gmail.com")))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("email và mật khẩu");
        }

        @Test
        void rejectsTokenWithoutEmail() {
            assertThatThrownBy(() -> authService.syncGoogleUser(jwt(UUID.randomUUID().toString(), null, null)))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        void rejectsNonUuidSubject() {
            assertThatThrownBy(() -> authService.syncGoogleUser(jwt("google-123", "g@gmail.com", null)))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }
}
