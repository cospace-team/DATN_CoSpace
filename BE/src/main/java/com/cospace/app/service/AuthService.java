package com.cospace.app.service;

import com.cospace.app.dto.api.AuthResponse;
import com.cospace.app.dto.api.AuthUserDto;
import com.cospace.app.dto.api.LoginRequest;
import com.cospace.app.dto.api.RegisterRequest;
import com.cospace.app.entity.User;
import com.cospace.app.repository.BranchEntityRepository;
import com.cospace.app.repository.UserRepository;
import com.cospace.app.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final BranchEntityRepository branchEntityRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email này đã được đăng ký.");
        }

        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("Mật khẩu xác nhận không khớp");
        }

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .role(User.Role.customer)
                .status(User.Status.active)
                .build();
        user = userRepository.save(user);

        return createAuthResponse(user, "Đăng ký thành công.");
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Email hoặc mật khẩu không đúng."));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Email hoặc mật khẩu không đúng.");
        }

        if (user.getStatus() != User.Status.active) {
            throw new IllegalStateException("Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.");
        }

        return createAuthResponse(user, "Đăng nhập thành công.");
    }

    /**
     * Trades a valid refresh token for a fresh access token so a session survives past the
     * 1-hour access-token lifetime. The refresh token is rotated on each use.
     */
    public AuthResponse refresh(String refreshToken) {
        UUID userId = jwtUtil.parseRefreshToken(refreshToken);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Tài khoản không còn tồn tại."));

        if (user.getStatus() != User.Status.active) {
            throw new IllegalStateException("Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.");
        }

        return createAuthResponse(user, "Làm mới phiên đăng nhập thành công.");
    }

    @org.springframework.transaction.annotation.Transactional
    public User syncGoogleUser(org.springframework.security.oauth2.jwt.Jwt jwt) {
        String email = jwt.getClaimAsString("email");
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("JWT không chứa email hợp lệ");
        }

        String userIdStr = jwt.getSubject();
        UUID supabaseId;
        try {
            supabaseId = UUID.fromString(userIdStr);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("JWT subject không hợp lệ (phải là UUID)");
        }

        java.util.Map<String, Object> userMetadata = jwt.getClaimAsMap("user_metadata");
        String fullName = "";
        String avatarUrl = "";
        if (userMetadata != null) {
            fullName = (String) userMetadata.get("full_name");
            avatarUrl = (String) userMetadata.get("avatar_url");
        }
        if (fullName == null || fullName.isBlank()) {
            fullName = jwt.getClaimAsString("name");
        }
        if (fullName == null || fullName.isBlank()) {
            fullName = email.split("@")[0];
        }

        User user = userRepository.findById(supabaseId).orElse(null);
        if (user == null) {
            User existingUser = userRepository.findByEmail(email).orElse(null);
            if (existingUser != null) {
                userRepository.updateUserId(existingUser.getId(), supabaseId);
                user = userRepository.findById(supabaseId).orElse(null);
            }
        }

        if (user == null) {
            user = User.builder()
                    .id(supabaseId)
                    .email(email)
                    .fullName(fullName)
                    .avatarUrl(avatarUrl != null && !avatarUrl.isBlank() ? avatarUrl : "")
                    .role(User.Role.customer)
                    .status(User.Status.active)
                    .build();
        } else {
            user.setFullName(fullName);
            if (avatarUrl != null && !avatarUrl.isBlank()) {
                user.setAvatarUrl(avatarUrl);
            }
        }

        return userRepository.save(user);
    }

    private AuthResponse createAuthResponse(User user, String message) {
        String accessToken = jwtUtil.generateAccessToken(user);
        String refreshToken = jwtUtil.generateRefreshToken(user);

        return AuthResponse.builder()
                .status("success")
                .message(message)
                .data(AuthResponse.AuthData.builder()
                        .user(toAuthUserDto(user))
                        .accessToken(accessToken)
                        .refreshToken(refreshToken)
                        .expiresIn(jwtUtil.getJwtExpiration())
                        .build())
                .build();
    }

    public AuthUserDto toAuthUserDto(User user) {
        String branchName = user.getBranchId() == null ? null
                : branchEntityRepository.findById(user.getBranchId())
                        .map(com.cospace.app.entity.BranchEntity::getName)
                        .orElse(null);

        return AuthUserDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .status(user.getStatus() != null ? user.getStatus().name() : null)
                .branchId(user.getBranchId())
                .branchName(branchName)
                .build();
    }
}
