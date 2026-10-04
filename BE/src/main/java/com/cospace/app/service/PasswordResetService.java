package com.cospace.app.service;

import com.cospace.app.entity.PasswordResetToken;
import com.cospace.app.entity.User;
import com.cospace.app.repository.PasswordResetTokenRepository;
import com.cospace.app.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;

/**
 * "Forgot password": mails a one-time link that lets the owner of the address set a new password.
 * The request endpoint answers the same way whether or not the email has an account, so it can't
 * be used to find out who is registered.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PasswordResetService {

    static final Duration TOKEN_TTL = Duration.ofMinutes(30);
    /** A second request this soon after the last one sends nothing, so the form can't flood an inbox. */
    static final Duration RESEND_COOLDOWN = Duration.ofSeconds(60);

    private static final String INVALID_LINK = "Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu link mới.";

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    /** Absent, or present with an empty host, when no SMTP server is configured. */
    private final ObjectProvider<JavaMailSender> mailSender;
    private final SecureRandom random = new SecureRandom();

    @Value("${app.frontend.base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    @Value("${app.mail.from:}")
    private String mailFrom;

    /** Without a mail server, write the link to the log so the flow can still be used locally. Off in prod. */
    @Value("${app.password-reset.log-links:true}")
    private boolean logLinks;

    @Transactional
    public void requestReset(String rawEmail) {
        String email = rawEmail == null ? "" : rawEmail.trim();
        Optional<User> found = userRepository.findByEmail(email).or(() -> userRepository.findByEmailIgnoreCase(email));
        if (found.isEmpty() || found.get().getStatus() != User.Status.active) {
            log.info("Password reset requested for an address without an active account");
            return;
        }
        User user = found.get();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        if (tokenRepository.existsByUserIdAndCreatedAtAfter(user.getId(), now.minus(RESEND_COOLDOWN))) {
            return;
        }

        tokenRepository.retireOpenTokens(user.getId(), now);
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        tokenRepository.save(PasswordResetToken.builder()
                .userId(user.getId())
                .tokenHash(sha256(token))
                .expiresAt(now.plus(TOKEN_TTL))
                .build());

        String link = frontendBaseUrl.replaceAll("/+$", "") + "/reset-password?token=" + token;
        send(user, link);
    }

    @Transactional
    public void resetPassword(String token, String newPassword, String confirmPassword) {
        if (!newPassword.equals(confirmPassword)) {
            throw new IllegalArgumentException("Mật khẩu xác nhận không khớp");
        }
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        PasswordResetToken reset = tokenRepository.findByTokenHash(sha256(token))
                .filter(t -> t.getUsedAt() == null && t.getExpiresAt().isAfter(now))
                .orElseThrow(() -> new IllegalArgumentException(INVALID_LINK));
        User user = userRepository.findById(reset.getUserId())
                .orElseThrow(() -> new IllegalArgumentException(INVALID_LINK));
        if (user.getStatus() != User.Status.active) {
            throw new IllegalStateException("Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        reset.setUsedAt(now);
        tokenRepository.save(reset);
        log.info("Password reset completed for user {}", user.getId());
    }

    private void send(User user, String link) {
        JavaMailSender sender = mailSender.getIfAvailable();
        // application.yml always defines spring.mail.host (empty unless MAIL_HOST is set), which is
        // enough for Boot to create a sender, so an empty host is what "no mail server" looks like.
        if (sender instanceof JavaMailSenderImpl impl && (impl.getHost() == null || impl.getHost().isBlank())) {
            sender = null;
        }
        if (sender == null) {
            if (logLinks) {
                log.warn("Mail is not configured (spring.mail.host); password reset link for {}: {}", user.getEmail(), link);
            } else {
                log.error("Mail is not configured (spring.mail.host); cannot send the password reset email for user {}", user.getId());
            }
            return;
        }
        SimpleMailMessage message = new SimpleMailMessage();
        if (mailFrom != null && !mailFrom.isBlank()) {
            message.setFrom(mailFrom);
        }
        message.setTo(user.getEmail());
        message.setSubject("CoSpace - Đặt lại mật khẩu");
        message.setText("Xin chào " + (user.getFullName() != null ? user.getFullName() : "bạn") + ",\n\n"
                + "Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản CoSpace của bạn.\n"
                + "Mở link dưới đây để đặt mật khẩu mới (link có hiệu lực trong " + TOKEN_TTL.toMinutes() + " phút và chỉ dùng được một lần):\n\n"
                + link + "\n\n"
                + "Nếu bạn không yêu cầu, hãy bỏ qua email này; mật khẩu hiện tại vẫn giữ nguyên.\n\n"
                + "CoSpace");
        try {
            sender.send(message);
        } catch (MailException e) {
            // The response stays the generic "check your inbox" either way; the log tells the operator.
            log.error("Could not send the password reset email for user {}", user.getId(), e);
        }
    }

    static String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
