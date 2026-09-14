package com.cospace.app.security;

import com.cospace.app.entity.User;
import com.cospace.app.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Central place to verify that a staff-tier caller (staff / branch_admin / legacy admin /
 * super_admin) is only touching data that belongs to their own branch.
 *
 * Several controllers used to accept a {@code branchId} straight from the request
 * (query param, path variable, or a resource lookup) and pass it to the service layer
 * without ever checking it against the caller's own branch — letting any branch admin
 * or staff member read or mutate another branch's bookings, check-ins, dashboard stats
 * or maintenance schedule. Route every such lookup through this guard instead.
 */
@Component
@RequiredArgsConstructor
public class BranchAccessGuard {

    private final UserRepository userRepository;

    /**
     * Resolves the branch a staff-tier caller may act on when a {@code requestedBranchId}
     * was supplied by the client (query param / path variable).
     * <p>
     * {@code super_admin} may act on any branch (requestedBranchId is required and returned
     * as-is). Every other staff-tier role must have a branch assigned and it must match
     * {@code requestedBranchId} exactly.
     *
     * @return the branchId that should actually be used for the lookup
     */
    public UUID requireBranchAccess(Jwt jwt, UUID requestedBranchId) {
        User caller = loadCaller(jwt);
        if (caller.getRole() == User.Role.super_admin) {
            if (requestedBranchId == null) {
                throw new IllegalArgumentException("branchId là bắt buộc.");
            }
            return requestedBranchId;
        }
        UUID ownBranchId = requireOwnBranch(caller);
        if (requestedBranchId != null && !ownBranchId.equals(requestedBranchId)) {
            throw new AccessDeniedException("Bạn không có quyền truy cập chi nhánh khác.");
        }
        return ownBranchId;
    }

    /** Returns the caller's own branch, rejecting anyone without a staff-tier branch role. */
    public UUID requireOwnBranch(Jwt jwt) {
        return requireOwnBranch(loadCaller(jwt));
    }

    /** True if the caller's actual DB role is {@code super_admin} (unrestricted, cross-branch). */
    public boolean isSuperAdmin(Jwt jwt) {
        return loadCaller(jwt).getRole() == User.Role.super_admin;
    }

    /**
     * Resolves the branchId to use for a report-style query, where a true global admin may
     * omit {@code requestedBranchId} to see data aggregated across every branch.
     * <p>
     * "Global" means {@code super_admin}, or the legacy {@code admin} role when it has no
     * branch assigned (an account with a branch behaves like a branch_admin — see
     * {@link com.cospace.app.config.SupabaseJwtAuthenticationConverter}). Every other caller
     * (staff, branch_admin, or an "admin" account that does have a branch) is locked to their
     * own branch regardless of what was requested, to prevent a branch-scoped user from reading
     * or exporting another branch's — or the whole system's — revenue and customer data.
     *
     * @return the branchId to filter by, or {@code null} to mean "all branches"
     */
    public UUID resolveReportBranchId(Jwt jwt, UUID requestedBranchId) {
        User caller = loadCaller(jwt);
        boolean isGlobal = caller.getRole() == User.Role.super_admin
                || (caller.getRole() == User.Role.admin && caller.getBranchId() == null);
        if (isGlobal) {
            return requestedBranchId; // null means "all branches", and that's allowed here
        }
        UUID ownBranchId = requireOwnBranch(caller);
        if (requestedBranchId != null && !ownBranchId.equals(requestedBranchId)) {
            throw new AccessDeniedException("Bạn không có quyền truy cập báo cáo của chi nhánh khác.");
        }
        return ownBranchId;
    }

    /**
     * Verifies the caller may act on a resource that already belongs to
     * {@code resourceBranchId} (e.g. the branch a workspace or maintenance record was
     * resolved to belong to). {@code super_admin} passes unconditionally.
     */
    public void requireAccessToBranch(Jwt jwt, UUID resourceBranchId) {
        User caller = loadCaller(jwt);
        if (caller.getRole() == User.Role.super_admin) {
            return;
        }
        UUID ownBranchId = requireOwnBranch(caller);
        if (resourceBranchId == null || !ownBranchId.equals(resourceBranchId)) {
            throw new AccessDeniedException("Bạn không có quyền truy cập tài nguyên của chi nhánh khác.");
        }
    }

    private UUID requireOwnBranch(User caller) {
        boolean isBranchTier = caller.getRole() == User.Role.staff
                || caller.getRole() == User.Role.branch_admin
                || caller.getRole() == User.Role.admin;
        if (!isBranchTier || caller.getBranchId() == null) {
            throw new AccessDeniedException("Bạn không có quyền quản lý chi nhánh.");
        }
        return caller.getBranchId();
    }

    private User loadCaller(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            throw new IllegalArgumentException("Người dùng chưa được xác thực.");
        }
        UUID userId = UUID.fromString(jwt.getSubject());
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng."));
    }
}
