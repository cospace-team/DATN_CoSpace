package com.cospace.app.service;

import com.cospace.app.entity.PasswordResetToken;
import com.cospace.app.entity.User;
import com.cospace.app.repository.PasswordResetTokenRepository;
import com.cospace.app.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordResetTokenRepository tokenRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private ObjectProvider<JavaMailSender> mailSenderProvider;
    @Mock
    private JavaMailSender mailSender;

    @InjectMocks
    private PasswordResetService service;

    private final OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

    private User activeUser() {
        return User.builder().id(UUID.randomUUID()).email("an@example.com").fullName("An").status(User.Status.active).build();
    }

    @Test
    void requestMailsALinkAndStoresOnlyTheHash() {
        ReflectionTestUtils.setField(service, "frontendBaseUrl", "https://cospace.vn/");
        User u = activeUser();
        when(userRepository.findByEmail("an@example.com")).thenReturn(Optional.of(u));
        when(mailSenderProvider.getIfAvailable()).thenReturn(mailSender);

        service.requestReset("  an@example.com ");

        ArgumentCaptor<PasswordResetToken> saved = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(tokenRepository).save(saved.capture());
        verify(tokenRepository).retireOpenTokens(any(), any());
        ArgumentCaptor<SimpleMailMessage> mail = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(mail.capture());

        String body = mail.getValue().getText();
        String token = body.substring(body.indexOf("token=") + 6).split("\\s")[0];
        assertThat(body).contains("https://cospace.vn/reset-password?token=");
        assertThat(saved.getValue().getTokenHash()).isEqualTo(PasswordResetService.sha256(token)).isNotEqualTo(token);
        assertThat(saved.getValue().getExpiresAt()).isAfter(now.plusMinutes(29));
    }

    @Test
    void unknownEmailSendsNothing() {
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());
        when(userRepository.findByEmailIgnoreCase(anyString())).thenReturn(Optional.empty());

        service.requestReset("nobody@example.com");

        verify(tokenRepository, never()).save(any());
    }

    @Test
    void repeatedRequestWithinCooldownSendsNothing() {
        User u = activeUser();
        when(userRepository.findByEmail("an@example.com")).thenReturn(Optional.of(u));
        when(tokenRepository.existsByUserIdAndCreatedAtAfter(any(), any())).thenReturn(true);

        service.requestReset("an@example.com");

        verify(tokenRepository, never()).save(any());
    }

    @Test
    void validTokenSetsTheNewPasswordOnce() {
        User u = activeUser();
        PasswordResetToken t = PasswordResetToken.builder().userId(u.getId())
                .tokenHash(PasswordResetService.sha256("tok")).expiresAt(now.plusMinutes(10)).build();
        when(tokenRepository.findByTokenHash(PasswordResetService.sha256("tok"))).thenReturn(Optional.of(t));
        when(userRepository.findById(u.getId())).thenReturn(Optional.of(u));
        when(passwordEncoder.encode("MatKhau@2026")).thenReturn("hashed");

        service.resetPassword("tok", "MatKhau@2026", "MatKhau@2026");

        assertThat(u.getPassword()).isEqualTo("hashed");
        assertThat(t.getUsedAt()).isNotNull();
    }

    @Test
    void expiredOrUsedTokenIsRejected() {
        PasswordResetToken expired = PasswordResetToken.builder().userId(UUID.randomUUID())
                .expiresAt(now.minusMinutes(1)).build();
        when(tokenRepository.findByTokenHash(PasswordResetService.sha256("old"))).thenReturn(Optional.of(expired));
        PasswordResetToken used = PasswordResetToken.builder().userId(UUID.randomUUID())
                .expiresAt(now.plusMinutes(10)).usedAt(now.minusMinutes(1)).build();
        when(tokenRepository.findByTokenHash(PasswordResetService.sha256("used"))).thenReturn(Optional.of(used));

        assertThatThrownBy(() -> service.resetPassword("old", "MatKhau@2026", "MatKhau@2026"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("hết hạn");
        assertThatThrownBy(() -> service.resetPassword("used", "MatKhau@2026", "MatKhau@2026"))
                .isInstanceOf(IllegalArgumentException.class);
        verify(userRepository, never()).save(any());
    }

    @Test
    void mismatchedConfirmationIsRejected() {
        assertThatThrownBy(() -> service.resetPassword("tok", "MatKhau@2026", "MatKhau@2027"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("không khớp");
    }
}
