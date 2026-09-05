package com.cospace.app.config;

import com.cospace.app.entity.User;
import com.cospace.app.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
@RequiredArgsConstructor
@Slf4j
public class SupabaseJwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final UserRepository userRepository;

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        String sub = jwt.getSubject();
        Set<GrantedAuthority> authorities = new HashSet<>();

        String email = jwt.getClaimAsString("email");
        String roleStr = null;
        UUID branchId = null;

        // 1. Try DB lookup first for freshest authority
        if (sub != null) {
            try {
                UUID userId = UUID.fromString(sub);
                Optional<User> userOpt = userRepository.findById(userId);
                if (userOpt.isPresent()) {
                    User user = userOpt.get();
                    if (user.getRole() != null) {
                        roleStr = user.getRole().name();
                    }
                    branchId = user.getBranchId();
                    if (email == null) {
                        email = user.getEmail();
                    }
                }
            } catch (Exception e) {
                log.debug("Error looking up user by subject {}: {}", sub, e.getMessage());
            }
        }

        // 2. Fallback to JWT claims
        if (roleStr == null) {
            Map<String, Object> appMetadata = jwt.getClaimAsMap("app_metadata");
            if (appMetadata != null && appMetadata.containsKey("role")) {
                roleStr = Objects.toString(appMetadata.get("role"), null);
            }
            if (roleStr == null) {
                Map<String, Object> userMetadata = jwt.getClaimAsMap("user_metadata");
                if (userMetadata != null && userMetadata.containsKey("role")) {
                    roleStr = Objects.toString(userMetadata.get("role"), null);
                }
            }
        }

        if (roleStr == null) {
            roleStr = "customer";
        }

        String normalizedRole = roleStr.toLowerCase().trim();

        // Add both standard uppercase and lowercase roles for maximum compatibility
        switch (normalizedRole) {
            case "super_admin":
                addRole(authorities, "SUPER_ADMIN", "super_admin");
                addRole(authorities, "ADMIN", "admin");
                addRole(authorities, "BRANCH_ADMIN", "branch_admin");
                addRole(authorities, "STAFF", "staff");
                addRole(authorities, "CUSTOMER", "customer");
                break;
            case "branch_admin":
                addRole(authorities, "BRANCH_ADMIN", "branch_admin");
                addRole(authorities, "ADMIN", "admin");
                addRole(authorities, "STAFF", "staff");
                addRole(authorities, "CUSTOMER", "customer");
                break;
            case "admin":
                addRole(authorities, "ADMIN", "admin");
                if (branchId == null) {
                    addRole(authorities, "SUPER_ADMIN", "super_admin");
                }
                addRole(authorities, "BRANCH_ADMIN", "branch_admin");
                addRole(authorities, "STAFF", "staff");
                addRole(authorities, "CUSTOMER", "customer");
                break;
            case "staff":
                addRole(authorities, "STAFF", "staff");
                addRole(authorities, "CUSTOMER", "customer");
                break;
            case "customer":
            default:
                addRole(authorities, "CUSTOMER", "customer");
                break;
        }

        String principalName = email != null && !email.isBlank() ? email : (sub != null ? sub : "anonymous");
        return new JwtAuthenticationToken(jwt, authorities, principalName);
    }

    private void addRole(Set<GrantedAuthority> authorities, String... names) {
        for (String name : names) {
            authorities.add(new SimpleGrantedAuthority("ROLE_" + name));
        }
    }
}
