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

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    /**
     * Placeholder domain for the account a staff member creates for a walk-in guest. Those guests
     * never signed up for anything beyond the booking at the counter, so features like partner
     * matching must leave them out.
     */
    public static final String WALKIN_EMAIL_DOMAIN = "@walkin.local";

    /** The phone the counter's quick mode sends for a guest who gives none (WalkinBookingPage). */
    static final String SHARED_WALKIN_PHONE = "0900000000";

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
        
        user.setPhone(com.cospace.app.util.CredentialRules.normalizePhone(dto.getPhone()));
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
        profile.setContactPhone(user.getPhone());
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

        com.cospace.app.util.CredentialRules.requireStrongPassword(req.getNewPassword());
        user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public java.util.List<UserProfileDto> searchUsers(String query) {
        if (query == null || query.trim().isEmpty()) {
            return java.util.Collections.emptyList();
        }
        List<User> users = userRepository.searchUsers(query.trim());
        if (users.isEmpty()) return java.util.Collections.emptyList();

        java.util.Set<UUID> userIds = users.stream().map(User::getId).collect(java.util.stream.Collectors.toSet());
        java.util.Map<UUID, Profile> profileMap = profileRepository.findAllById(userIds).stream()
                .collect(java.util.stream.Collectors.toMap(Profile::getUserId, java.util.function.Function.identity()));

        java.util.Set<UUID> branchIds = users.stream().map(User::getBranchId).filter(java.util.Objects::nonNull).collect(java.util.stream.Collectors.toSet());
        java.util.Map<UUID, String> branchMap = branchEntityRepository.findAllById(branchIds).stream()
                .collect(java.util.stream.Collectors.toMap(com.cospace.app.entity.BranchEntity::getId, com.cospace.app.entity.BranchEntity::getName));

        return users.stream().map(user -> {
            Profile profile = profileMap.get(user.getId());
            if (profile == null) {
                profile = Profile.builder().userId(user.getId()).contactPublic(false).build();
            }
            String branchName = user.getBranchId() != null ? branchMap.get(user.getBranchId()) : null;
            return convertToDto(user, profile, branchName);
        }).collect(java.util.stream.Collectors.toList());
    }

    @Transactional
    @CacheEvict(value = CacheConfig.ADMIN_USERS, allEntries = true)
    public UserProfileDto createWalkinUser(com.cospace.app.dto.api.WalkinUserCreateRequest req) {
        String phone = req.getPhone() != null ? req.getPhone().trim() : null;
        String fullName = req.getFullName() != null ? req.getFullName().trim() : null;
        // A returning walk-in guest (same phone and name) keeps one account and one booking history
        // instead of a new placeholder account on every visit. Guests who gave no phone all arrive
        // with the counter's shared placeholder number and are never merged: one shared account would
        // pile up their spending into a membership discount and hit the limit on unpaid bookings.
        if (phone != null && !phone.isEmpty() && !SHARED_WALKIN_PHONE.equals(phone)
                && fullName != null && !fullName.isEmpty()) {
            java.util.Optional<User> existing = userRepository
                    .findFirstByPhoneAndFullNameIgnoreCaseAndEmailEndingWithOrderByCreatedAtAsc(phone, fullName, WALKIN_EMAIL_DOMAIN)
                    .filter(u -> u.getStatus() == User.Status.active);
            if (existing.isPresent()) {
                User user = existing.get();
                Profile profile = profileRepository.findById(user.getId())
                        .orElseGet(() -> profileRepository.save(Profile.builder().userId(user.getId()).contactPublic(false).build()));
                return convertToDto(user, profile);
            }
        }
        User user = User.builder()
                .email("walkin_" + UUID.randomUUID().toString().substring(0, 8) + WALKIN_EMAIL_DOMAIN)
                .fullName(fullName)
                .phone(phone)
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
        Page<User> usersPage = userRepository.filterUsers(role, branchId, status, searchClean, pageable);
        List<User> userList = usersPage.getContent();
        if (userList.isEmpty()) {
            return new org.springframework.data.domain.PageImpl<>(java.util.List.of(), pageable, usersPage.getTotalElements());
        }

        java.util.Set<UUID> userIds = userList.stream().map(User::getId).collect(java.util.stream.Collectors.toSet());
        java.util.Map<UUID, Profile> profileMap = profileRepository.findAllById(userIds).stream()
                .collect(java.util.stream.Collectors.toMap(Profile::getUserId, java.util.function.Function.identity()));

        java.util.Set<UUID> branchIds = userList.stream().map(User::getBranchId).filter(java.util.Objects::nonNull).collect(java.util.stream.Collectors.toSet());
        java.util.Map<UUID, String> branchMap = branchEntityRepository.findAllById(branchIds).stream()
                .collect(java.util.stream.Collectors.toMap(com.cospace.app.entity.BranchEntity::getId, com.cospace.app.entity.BranchEntity::getName));

        java.util.List<UserProfileDto> dtos = userList.stream().map(user -> {
            Profile profile = profileMap.get(user.getId());
            if (profile == null) {
                profile = Profile.builder().userId(user.getId()).contactPublic(false).build();
            }
            String branchName = user.getBranchId() != null ? branchMap.get(user.getBranchId()) : null;
            return convertToDto(user, profile, branchName);
        }).toList();

        return new org.springframework.data.domain.PageImpl<>(dtos, pageable, usersPage.getTotalElements());
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
        return convertToDto(user, profile, branchName);
    }

    private UserProfileDto convertToDto(User user, Profile profile, String branchName) {

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
                .membershipTier(user.getMembershipTier())
                .reputationScore(user.getReputationScore())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
