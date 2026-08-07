package com.example.momosandbox.controller;

import com.example.momosandbox.dto.api.CashCreatePaymentResponse;
import com.example.momosandbox.dto.api.CreatePaymentRequest;
import com.example.momosandbox.dto.api.MomoCreatePaymentResponse;
import com.example.momosandbox.dto.api.PaymentDto;
import com.example.momosandbox.service.PaymentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/payments")
@Slf4j
public class PaymentController {

    private final PaymentService paymentService;

    @Value("${app.frontend.base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/momo/create")
    public MomoCreatePaymentResponse createMomoPayment(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreatePaymentRequest req,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey) {
        UUID userId = requireSubject(jwt);
        return paymentService.createMomoPayment(userId, req.getBookingId(), idempotencyKey);
    }

    @PostMapping("/cash/create")
    @PreAuthorize("hasAnyRole('staff', 'branch_admin')")
    public CashCreatePaymentResponse createCashPayment(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreatePaymentRequest req) {
        UUID userId = requireSubject(jwt);
        return paymentService.createCashPayment(userId, req.getBookingId());
    }

    @GetMapping("/booking/{bookingId}")
    public List<PaymentDto> paymentsForBooking(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("bookingId") UUID bookingId) {
        UUID userId = requireSubject(jwt);
        return paymentService.listPaymentsByBooking(userId, bookingId);
    }

    // Public endpoints for MoMo callbacks
    @PostMapping("/momo/notify")
    public ResponseEntity<Map<String, String>> momoIpn(@RequestBody Map<String, String> body) {
        log.info("Received MoMo IPN: {}", body);
        paymentService.handleMomoCallback(body);
        // Per MoMo spec, return 204 No Content on success
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/momo/return")
    public ResponseEntity<Void> momoReturn(@RequestParam Map<String, String> allParams) {
        log.info("Received MoMo return with params: {}", allParams);
        String orderId = allParams.getOrDefault("orderId", "");
        String resultCode = allParams.getOrDefault("resultCode", "");
        String message = allParams.getOrDefault("message", "Giao dịch hoàn tất."); // Default success message

        try {
            paymentService.handleMomoCallback(allParams);
        } catch (Exception ex) {
            log.error("Error handling MoMo return for orderId {}: {}", orderId, ex.getMessage());
            resultCode = "-1"; // Generic error code
            message = "Lỗi xác thực thanh toán.";
        }

        // Always redirect the user back to FE to show immediate feedback.
        String redirectUrl = frontendBaseUrl + "/payment/result" +
                "?orderId=" + url(orderId) +
                "&resultCode=" + url(resultCode) +
                "&message=" + url(message);

        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, redirectUrl)
                .build();
    }

    private String url(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }

    private UUID requireSubject(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            // This would typically be handled by Spring Security config, but as a fallback:
            throw new IllegalArgumentException("Missing or invalid user authentication.");
        }
        return UUID.fromString(jwt.getSubject());
    }
}
