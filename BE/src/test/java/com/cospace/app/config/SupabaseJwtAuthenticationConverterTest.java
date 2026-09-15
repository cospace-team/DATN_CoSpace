package com.cospace.app.config;

import com.cospace.app.entity.User;
import com.cospace.app.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;

import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SupabaseJwtAuthenticationConverterTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private SupabaseJwtAuthenticationConverter converter;

    private final UUID userId = UUID.randomUUID();

    private Jwt.Builder jwt() {
        return Jwt.withTokenValue("token").header("alg", "HS384").subject(userId.toString());
    }

    private void givenDbUser(User.Role role, UUID branchId, User.Status status) {
        when(userRepository.findById(userId)).thenReturn(Optional.of(User.builder()
                .id(userId).email("db@cospace.vn").role(role).branchId(branchId).status(status).build()));
    }

    private static Set<String> roles(AbstractAuthenticationToken token) {
        return token.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(a -> a.startsWith("ROLE_") && a.equals(a.toUpperCase()))
                .collect(Collectors.toSet());
    }

    @Test
    void databaseRoleOverridesRoleClaimedInToken() {
        givenDbUser(User.Role.customer, null, User.Status.active);
        Jwt token = jwt().claim("app_metadata", Map.of("role", "super_admin")).build();

        AbstractAuthenticationToken auth = converter.convert(token);

        assertThat(roles(auth)).containsExactly("ROLE_CUSTOMER");
    }

    @Test
    void suspendedUserIsRejectedImmediately() {
        givenDbUser(User.Role.staff, UUID.randomUUID(), User.Status.suspended);

        assertThatThrownBy(() -> converter.convert(jwt().build()))
                .isInstanceOf(InvalidBearerTokenException.class);
    }

    @Test
    void superAdminInheritsAllLowerRoles() {
        givenDbUser(User.Role.super_admin, null, User.Status.active);

        assertThat(roles(converter.convert(jwt().build())))
                .containsExactlyInAnyOrder("ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_BRANCH_ADMIN", "ROLE_STAFF", "ROLE_CUSTOMER");
    }

    @Test
    void branchAdminIsNotAdmin() {
        givenDbUser(User.Role.branch_admin, UUID.randomUUID(), User.Status.active);

        assertThat(roles(converter.convert(jwt().build())))
                .containsExactlyInAnyOrder("ROLE_BRANCH_ADMIN", "ROLE_STAFF", "ROLE_CUSTOMER");
    }

    @Test
    void staffIsNotBranchAdmin() {
        givenDbUser(User.Role.staff, UUID.randomUUID(), User.Status.active);

        assertThat(roles(converter.convert(jwt().build())))
                .containsExactlyInAnyOrder("ROLE_STAFF", "ROLE_CUSTOMER");
    }

    @Test
    void legacyAdminWithBranchDoesNotBecomeSuperAdmin() {
        givenDbUser(User.Role.admin, UUID.randomUUID(), User.Status.active);

        assertThat(roles(converter.convert(jwt().build())))
                .contains("ROLE_ADMIN")
                .doesNotContain("ROLE_SUPER_ADMIN");
    }

    @Test
    void legacyAdminWithoutBranchIsSuperAdmin() {
        givenDbUser(User.Role.admin, null, User.Status.active);

        assertThat(roles(converter.convert(jwt().build()))).contains("ROLE_SUPER_ADMIN");
    }

    @Test
    void unknownUserWithoutRoleClaimsIsCustomer() {
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThat(roles(converter.convert(jwt().build()))).containsExactly("ROLE_CUSTOMER");
    }

    @Test
    void principalNameIsEmailFromToken() {
        givenDbUser(User.Role.customer, null, User.Status.active);

        AbstractAuthenticationToken auth = converter.convert(jwt().claim("email", "token@cospace.vn").build());

        assertThat(auth.getName()).isEqualTo("token@cospace.vn");
    }

    @Test
    void userEditableMetadataMustNotGrantPrivileges() {
        when(userRepository.findById(userId)).thenReturn(Optional.empty());
        Jwt token = jwt().claim("user_metadata", Map.of("role", "super_admin")).build();

        assertThat(roles(converter.convert(token))).containsExactly("ROLE_CUSTOMER");
    }

    @Test
    void serverControlledAppMetadataRoleIsHonoredForUserNotYetInDatabase() {
        when(userRepository.findById(userId)).thenReturn(Optional.empty());
        Jwt token = jwt()
                .claim("app_metadata", Map.of("role", "staff"))
                .claim("user_metadata", Map.of("role", "super_admin"))
                .build();

        assertThat(roles(converter.convert(token))).containsExactlyInAnyOrder("ROLE_STAFF", "ROLE_CUSTOMER");
    }
}
