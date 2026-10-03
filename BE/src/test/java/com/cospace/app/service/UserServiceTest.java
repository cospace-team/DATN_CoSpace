package com.cospace.app.service;

import com.cospace.app.dto.api.UserProfileDto;
import com.cospace.app.dto.api.WalkinUserCreateRequest;
import com.cospace.app.entity.Profile;
import com.cospace.app.entity.User;
import com.cospace.app.repository.BranchEntityRepository;
import com.cospace.app.repository.ProfileRepository;
import com.cospace.app.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private ProfileRepository profileRepository;
    @Mock
    private BranchEntityRepository branchEntityRepository;
    @Mock
    private PasswordEncoder passwordEncoder;

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository, profileRepository, branchEntityRepository, passwordEncoder);
    }

    private static WalkinUserCreateRequest walkin(String name, String phone) {
        WalkinUserCreateRequest req = new WalkinUserCreateRequest();
        req.setFullName(name);
        req.setPhone(phone);
        return req;
    }

    private void stubSaves() {
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });
        when(profileRepository.save(any(Profile.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private static User walkinAccount(String name, String phone, User.Status status) {
        return User.builder()
                .id(UUID.randomUUID())
                .email("walkin_abcd1234" + UserService.WALKIN_EMAIL_DOMAIN)
                .fullName(name)
                .phone(phone)
                .role(User.Role.customer)
                .status(status)
                .build();
    }

    @Test
    void returningGuestWithSamePhoneAndNameReusesTheirAccount() {
        User existing = walkinAccount("Nguyễn Văn A", "0912345678", User.Status.active);
        when(userRepository.findFirstByPhoneAndFullNameIgnoreCaseAndEmailEndingWithOrderByCreatedAtAsc(
                "0912345678", "Nguyễn Văn A", UserService.WALKIN_EMAIL_DOMAIN)).thenReturn(Optional.of(existing));
        when(profileRepository.findById(existing.getId()))
                .thenReturn(Optional.of(Profile.builder().userId(existing.getId()).build()));

        UserProfileDto dto = userService.createWalkinUser(walkin("  Nguyễn Văn A ", " 0912345678 "));

        assertThat(dto.getId()).isEqualTo(existing.getId());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void guestsOnTheSharedPlaceholderPhoneAlwaysGetTheirOwnAccount() {
        stubSaves();

        UserProfileDto first = userService.createWalkinUser(walkin("Khách vãng lai", UserService.SHARED_WALKIN_PHONE));
        UserProfileDto second = userService.createWalkinUser(walkin("Khách vãng lai", UserService.SHARED_WALKIN_PHONE));

        assertThat(first.getId()).isNotEqualTo(second.getId());
        verify(userRepository, never())
                .findFirstByPhoneAndFullNameIgnoreCaseAndEmailEndingWithOrderByCreatedAtAsc(anyString(), anyString(), anyString());
    }

    @Test
    void suspendedWalkinAccountIsNotReused() {
        User suspended = walkinAccount("Trần B", "0987654321", User.Status.suspended);
        when(userRepository.findFirstByPhoneAndFullNameIgnoreCaseAndEmailEndingWithOrderByCreatedAtAsc(
                "0987654321", "Trần B", UserService.WALKIN_EMAIL_DOMAIN)).thenReturn(Optional.of(suspended));
        stubSaves();

        UserProfileDto dto = userService.createWalkinUser(walkin("Trần B", "0987654321"));

        assertThat(dto.getId()).isNotEqualTo(suspended.getId());
        assertThat(dto.getEmail()).endsWith(UserService.WALKIN_EMAIL_DOMAIN);
    }
}
