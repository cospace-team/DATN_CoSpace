package com.cospace.app.service;

import com.cospace.app.config.CacheConfig;
import com.cospace.app.dto.api.ChangePasswordRequest;
import com.cospace.app.dto.api.UserProfileDto;
import com.cospace.app.entity.Profile;
import com.cospace.app.entity.User;
import com.cospace.app.repository.ProfileRepository;
import com.cospace.app.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;
    private final com.cospace.app.repository.BranchEntityRepository branchEntityRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public UserProfileDto getUserProfile(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng"));

        Profile profile = profileRepository.findById(userId)
                .orElseGet(() -> Profile.builder()
                        .userId(userId)
                        .contactPublic(false)
                        .build());

        return convertToDto(user, profile);
    }

    @Transactional
    @CacheEvict(value = CacheConfig.ADMIN_USERS, allEntries = true)
    public UserProfileDto updateUserProfile(UUID userId, UserProfileDto dto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng"));

        // Check if email has changed and if new email is already in use
        if (dto.getEmail() != null && !dto.getEmail().equalsIgnoreCase(user.getEmail())) {
            if (userRepository.existsByEmail(dto.getEmail())) {
                throw new IllegalArgumentException("Email này đã được sử dụng bởi người dùng khác");
            }
            user.setEmail(dto.getEmail());
        }

        if (dto.getFullName() != null && !dto.getFullName().isBlank()) {
            user.setFullName(dto.getFullName());
        }
        
        user.setPhone(dto.getPhone());
        user.setAvatarUrl(dto.getAvatarUrl());
        userRepository.save(user);

        Profile profile = profileRepository.findById(userId)
                .orElseGet(() -> Profile.builder().userId(userId).build());

        profile.setBio(dto.getBio());
        profile.setProfession(dto.getProfession());
        profile.setCompany(dto.getCompany());
        profile.setContactPublic(dto.isContactPublic());
        profile.setContactLink(dto.getContactLink());
        profile.setContactEmail(dto.getEmail());
        profile.setContactPhone(dto.getPhone());
        profileRepository.save(profile);

        return convertToDto(user, profile);
    }

    @Transactional
    public void changePassword(UUID userId, ChangePasswordRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng"));

        if (!req.getNewPassword().equals(req.getConfirmNewPassword())) {
            throw new IllegalArgumentException("Mật khẩu mới và mật khẩu xác nhận không khớp");
        }

        // If the user registered via email (has password hash), verify old password
        if (user.getPassword() != null && !user.getPassword().isBlank()) {
            if (req.getOldPassword() == null || req.getOldPassword().isBlank()) {
                throw new IllegalArgumentException("Mật khẩu cũ không được để trống");
            }
            if (!passwordEncoder.matches(req.getOldPassword(), user.getPassword())) {
                throw new IllegalArgumentException("Mật khẩu cũ không chính xác");
            }
        }

        user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public java.util.List<UserProfileDto> searchUsers(String query) {
        if (query == null || query.trim().isEmpty()) {
            return java.util.Collections.emptyList();
        }
        return userRepository.searchUsers(query.trim()).stream()
                .map(user -> {
                    Profile profile = profileRepository.findById(user.getId())
                            .orElseGet(() -> Profile.builder().userId(user.getId()).contactPublic(false).build());
                    return convertToDto(user, profile);
                })
                .collect(java.util.stream.Collectors.toList());
    }

    @Transactional
    @CacheEvict(value = CacheConfig.ADMIN_USERS, allEntries = true)
    public UserProfileDto createWalkinUser(com.cospace.app.dto.api.WalkinUserCreateRequest req) {
        User user = User.builder()
                .email("walkin_" + UUID.randomUUID().toString().substring(0, 8) + "@walkin.local")
                .fullName(req.getFullName())
                .phone(req.getPhone())
                .role(User.Role.customer)
                .status(User.Status.active)
                .build();
        user = userRepository.save(user);

        Profile profile = Profile.builder()
                .userId(user.getId())
                .contactPublic(false)
                .build();
        profileRepository.save(profile);

        return convertToDto(user, profile);
    }

    @Transactional(readOnly = true)
    @Cacheable(CacheConfig.ADMIN_USERS)
    public Page<UserProfileDto> getUsers(String roleStr, UUID branchId, String statusStr, String search, int page, int size) {
        User.Role role = null;
        if (roleStr != null && !roleStr.isBlank() && !"all".equalsIgnoreCase(roleStr)) {
            try {
                role = User.Role.valueOf(roleStr.toLowerCase());
            } catch (IllegalArgumentException ignored) {}
        }

        User.Status status = null;
        if (statusStr != null && !statusStr.isBlank() && !"all".equalsIgnoreCase(statusStr)) {
            try {
                status = User.Status.valueOf(statusStr.toLowerCase());
            } catch (IllegalArgumentException ignored) {}
        }

        String searchClean = (search != null && !search.isBlank()) ? search.trim() : null;

        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)), Sort.by(Sort.Direction.DESC, "createdAt"));
        return userRepository.filterUsers(role, branchId, status, searchClean, pageable)
                .map(user -> {
                    Profile profile = profileRepository.findById(user.getId())
                            .orElseGet(() -> Profile.builder().userId(user.getId()).contactPublic(false).build());
                    return convertToDto(user, profile);
                });
    }

    @Transactional
    @CacheEvict(value = CacheConfig.ADMIN_USERS, allEntries = true)
    public UserProfileDto updateUserStatus(UUID targetUserId, String statusStr, UUID currentAdminUserId) {
        if (targetUserId.equals(currentAdminUserId)) {
            throw new IllegalArgumentException("Không thể tự thay đổi trạng thái hoặc khóa tài khoản của chính mình");
        }

        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng"));

        User.Status newStatus = User.Status.valueOf(statusStr.toLowerCase());
        user.setStatus(newStatus);
        userRepository.save(user);

        Profile profile = profileRepository.findById(targetUserId)
                .orElseGet(() -> Profile.builder().userId(targetUserId).contactPublic(false).build());
        return convertToDto(user, profile);
    }

    @Transactional
    @CacheEvict(value = CacheConfig.ADMIN_USERS, allEntries = true)
    public UserProfileDto updateUserRoleAndBranch(UUID targetUserId, String roleStr, UUID branchId, UUID currentAdminUserId) {
        if (targetUserId.equals(currentAdminUserId)) {
            throw new IllegalArgumentException("Không thể tự thay đổi vai trò của tài khoản quản trị hiện tại");
        }

        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng"));

        if (roleStr != null && !roleStr.isBlank()) {
            user.setRole(User.Role.valueOf(roleStr.toLowerCase()));
        }
        user.setBranchId(branchId);
        userRepository.save(user);

        Profile profile = profileRepository.findById(targetUserId)
                .orElseGet(() -> Profile.builder().userId(targetUserId).contactPublic(false).build());
        return convertToDto(user, profile);
    }

    private UserProfileDto convertToDto(User user, Profile profile) {
        String branchName = user.getBranchId() == null ? null
                : branchEntityRepository.findById(user.getBranchId())
                        .map(com.cospace.app.entity.BranchEntity::getName)
                        .orElse(null);

        return UserProfileDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .status(user.getStatus() != null ? user.getStatus().name() : null)
                .branchId(user.getBranchId())
                .branchName(branchName)
                .bio(profile.getBio())
                .profession(profile.getProfession())
                .company(profile.getCompany())
                .contactPublic(profile.isContactPublic())
                .contactLink(profile.getContactLink())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
