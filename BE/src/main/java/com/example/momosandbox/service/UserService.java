package com.example.momosandbox.service;

import com.example.momosandbox.dto.api.ChangePasswordRequest;
import com.example.momosandbox.dto.api.UserProfileDto;
import com.example.momosandbox.entity.Profile;
import com.example.momosandbox.entity.User;
import com.example.momosandbox.repository.ProfileRepository;
import com.example.momosandbox.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;
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

    private UserProfileDto convertToDto(User user, Profile profile) {
        return UserProfileDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole().name())
                .status(user.getStatus().name())
                .bio(profile.getBio())
                .profession(profile.getProfession())
                .company(profile.getCompany())
                .contactPublic(profile.isContactPublic())
                .contactLink(profile.getContactLink())
                .build();
    }
}
