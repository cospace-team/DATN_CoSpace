package com.cospace.app.controller;

import com.cospace.app.service.PaymentService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Stands in for the PayOS webhook on the internal VietQR checkout screen used when the project runs
 * without real PayOS credentials.
 *
 * <p>It lives in its own {@code @Profile("!prod")} controller rather than alongside the real payment
 * endpoints so that in production the route simply does not exist — a request gets 404 from an
 * unmapped path instead of reaching a handler that has to talk its own way out. {@link
 * PaymentService#simulatePayosPayment} still enforces demo mode, ownership and booking state, so
 * this is the outer of three independent checks.
 */
@RestController
@RequestMapping("/api/payments/payos")
@Profile("!prod")
@Slf4j
public class PayosSimulationController {

    private final PaymentService paymentService;

    public PayosSimulationController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/simulate")
    public ResponseEntity<Map<String, Object>> simulatePayosPayment(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody Map<String, Object> body) {
        String orderCode = Objects.toString(body.get("orderCode"), "");
        if (orderCode.isBlank()) {
            throw new IllegalArgumentException("orderCode is required for simulation");
        }
        log.info("Simulating PayOS payment confirmation for orderCode: {}", orderCode);
        paymentService.simulatePayosPayment(requireSubject(jwt), orderCode);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Đã xác nhận thanh toán PayOS thành công (Mô phỏng)"));
    }

    private UUID requireSubject(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            throw new IllegalArgumentException("Missing or invalid user authentication.");
        }
        return UUID.fromString(jwt.getSubject());
    }
}
