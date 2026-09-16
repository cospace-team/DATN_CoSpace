package com.cospace.app.security;

import com.cospace.app.entity.User;
import com.cospace.app.repository.UserRepository;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BranchAccessGuardTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private BranchAccessGuard guard;

    private final UUID ownBranch = UUID.randomUUID();
    private final UUID otherBranch = UUID.randomUUID();

    private Jwt caller(User.Role role, UUID branchId) {
        UUID id = UUID.randomUUID();
        when(userRepository.findById(id)).thenReturn(Optional.of(
                User.builder().id(id).role(role).branchId(branchId).build()));
        return Jwt.withTokenValue("t").header("alg", "HS384").subject(id.toString()).build();
    }

    @Nested
    class RequireBranchAccess {

        @Test
        void superAdminMayActOnAnyRequestedBranch() {
            assertThat(guard.requireBranchAccess(caller(User.Role.super_admin, null), otherBranch))
                    .isEqualTo(otherBranch);
        }

        @Test
        void superAdminMustNameABranch() {
            Jwt jwt = caller(User.Role.super_admin, null);

            assertThatThrownBy(() -> guard.requireBranchAccess(jwt, null))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        void branchAdminDefaultsToOwnBranch() {
            assertThat(guard.requireBranchAccess(caller(User.Role.branch_admin, ownBranch), null))
                    .isEqualTo(ownBranch);
        }

        @Test
        void branchAdminCannotRequestAnotherBranch() {
            Jwt jwt = caller(User.Role.branch_admin, ownBranch);

            assertThatThrownBy(() -> guard.requireBranchAccess(jwt, otherBranch))
                    .isInstanceOf(AccessDeniedException.class);
        }

        @Test
        void staffCannotRequestAnotherBranch() {
            Jwt jwt = caller(User.Role.staff, ownBranch);

            assertThatThrownBy(() -> guard.requireBranchAccess(jwt, otherBranch))
                    .isInstanceOf(AccessDeniedException.class);
        }

        @Test
        void staffWithoutBranchIsDenied() {
            Jwt jwt = caller(User.Role.staff, null);

            assertThatThrownBy(() -> guard.requireBranchAccess(jwt, null))
                    .isInstanceOf(AccessDeniedException.class);
        }

        @Test
        void customerIsDeniedEvenWithBranchAssigned() {
            Jwt jwt = caller(User.Role.customer, ownBranch);

            assertThatThrownBy(() -> guard.requireBranchAccess(jwt, ownBranch))
                    .isInstanceOf(AccessDeniedException.class);
        }
    }

    @Nested
    class ResolveReportBranchId {

        @Test
        void superAdminMayQueryAllBranches() {
            assertThat(guard.resolveReportBranchId(caller(User.Role.super_admin, null), null)).isNull();
        }

        @Test
        void legacyAdminWithoutBranchIsGlobal() {
            assertThat(guard.resolveReportBranchId(caller(User.Role.admin, null), otherBranch)).isEqualTo(otherBranch);
        }

        @Test
        void legacyAdminWithBranchIsLockedToIt() {
            assertThat(guard.resolveReportBranchId(caller(User.Role.admin, ownBranch), null)).isEqualTo(ownBranch);
        }

        @Test
        void branchAdminCannotReadAnotherBranchReport() {
            Jwt jwt = caller(User.Role.branch_admin, ownBranch);

            assertThatThrownBy(() -> guard.resolveReportBranchId(jwt, otherBranch))
                    .isInstanceOf(AccessDeniedException.class);
        }

        @Test
        void branchAdminOmittingBranchGetsOwnBranchNotAllBranches() {
            assertThat(guard.resolveReportBranchId(caller(User.Role.branch_admin, ownBranch), null))
                    .isEqualTo(ownBranch);
        }
    }

    @Nested
    class RequireAccessToBranch {

        @Test
        void superAdminPassesForAnyResource() {
            Jwt jwt = caller(User.Role.super_admin, null);

            assertThatCode(() -> guard.requireAccessToBranch(jwt, otherBranch)).doesNotThrowAnyException();
        }

        @Test
        void staffPassesForOwnBranchResource() {
            Jwt jwt = caller(User.Role.staff, ownBranch);

            assertThatCode(() -> guard.requireAccessToBranch(jwt, ownBranch)).doesNotThrowAnyException();
        }

        @Test
        void staffIsDeniedForOtherBranchResource() {
            Jwt jwt = caller(User.Role.staff, ownBranch);

            assertThatThrownBy(() -> guard.requireAccessToBranch(jwt, otherBranch))
                    .isInstanceOf(AccessDeniedException.class);
        }

        @Test
        void resourceWithoutBranchIsDeniedForBranchScopedUsers() {
            Jwt jwt = caller(User.Role.branch_admin, ownBranch);

            assertThatThrownBy(() -> guard.requireAccessToBranch(jwt, null))
                    .isInstanceOf(AccessDeniedException.class);
        }
    }

    @Test
    void unauthenticatedCallerIsRejected() {
        assertThatThrownBy(() -> guard.requireOwnBranch(null)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void callerMissingFromDatabaseIsRejected() {
        UUID id = UUID.randomUUID();
        when(userRepository.findById(id)).thenReturn(Optional.empty());
        Jwt jwt = Jwt.withTokenValue("t").header("alg", "HS384").subject(id.toString()).build();

        assertThatThrownBy(() -> guard.isSuperAdmin(jwt)).isInstanceOf(IllegalArgumentException.class);
    }
}
