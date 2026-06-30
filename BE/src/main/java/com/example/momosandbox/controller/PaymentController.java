package com.example.momosandbox.controller;

import com.example.momosandbox.dto.api.MomoCreatePaymentRequest;
import com.example.momosandbox.dto.api.MomoCreatePaymentResponse;
import com.example.momosandbox.dto.api.PaymentDto;
import com.example.momosandbox.entity.Payment;
import com.example.momosandbox.service.PaymentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    @Value("${app.frontend.base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/momo/create")
    public ResponseEntity<MomoCreatePaymentResponse> createMomoPayment(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody MomoCreatePaymentRequest req) {
        String userId = requireSubject(jwt);
        UUID bookingId = UUID.fromString(req.getBookingId());
        Payment payment = paymentService.createMomoPayment(userId, bookingId);
        return ResponseEntity.ok(MomoCreatePaymentResponse.builder()
                .orderId(payment.getOrderId())
                .payUrl(payment.getPayUrl())
                .build());
    }

    @GetMapping("/my")
    public ResponseEntity<List<PaymentDto>> myPayments(@AuthenticationPrincipal Jwt jwt) {
        String userId = requireSubject(jwt);
        List<PaymentDto> items = paymentService.listMyPayments(userId).stream().map(this::toDto).toList();
        return ResponseEntity.ok(items);
    }

    @GetMapping("/booking/{bookingId}")
    public ResponseEntity<List<PaymentDto>> paymentsForBooking(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("bookingId") UUID bookingId) {
        String userId = requireSubject(jwt);
        List<PaymentDto> items = paymentService.listPaymentsByBooking(userId, bookingId).stream().map(this::toDto)
                .toList();
        return ResponseEntity.ok(items);
    }

    @GetMapping("/order/{orderId}")
    public ResponseEntity<PaymentDto> byOrderId(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("orderId") String orderId) {
        String userId = requireSubject(jwt);
        Payment payment = paymentService.getByOrderId(userId, orderId);
        return ResponseEntity.ok(toDto(payment));
    }

    // Public endpoints for MoMo callbacks

    @PostMapping("/momo/ipn")
    public ResponseEntity<Map<String, Object>> momoIpn(@RequestBody Map<String, Object> body) {
        Map<String, String> params = paymentService.extractCallbackParams(body);
        paymentService.handleMomoCallback(params, true);

        Map<String, Object> res = new HashMap<>();
        res.put("result", "ok");
        return ResponseEntity.ok(res);
    }

    @GetMapping("/momo/return")
    public ResponseEntity<Void> momoReturn(HttpServletRequest request,
            @RequestParam Map<String, String> allParams) {
        // Verify & update payment status based on returnUrl callback
        String orderId = allParams.getOrDefault("orderId", "");
        String resultCode = allParams.getOrDefault("resultCode", "");
        String message = allParams.getOrDefault("message", "");

        try {
            paymentService.handleMomoCallback(allParams, true);
        } catch (Exception ex) {
            // Always redirect the user back to FE to show immediate feedback.
            resultCode = "-1";
            message = "Payment verification failed";
        }

        String redirect = frontendBaseUrl + "/customer/bookings" +
                "?orderId=" + url(orderId) +
                "&resultCode=" + url(resultCode) +
                "&message=" + url(message);

        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, redirect)
                .build();
    }

    private String url(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }

    private String requireSubject(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            throw new IllegalArgumentException("Missing JWT subject");
        }
        return jwt.getSubject();
    }

    private PaymentDto toDto(Payment p) {
        return PaymentDto.builder()
                .id(p.getId().toString())
                .bookingId(p.getBookingId().toString())
                .userId(p.getUserId())
                .provider(p.getProvider())
                .method(p.getMethod())
                .orderId(p.getOrderId())
                .requestId(p.getRequestId())
                .amount(p.getAmount())
                .status(p.getStatus())
                .payUrl(p.getPayUrl())
                .providerTransId(p.getProviderTransId())
                .paidAt(p.getPaidAt() == null ? null : p.getPaidAt().toString())
                .createdAt(p.getCreatedAt().toString())
                .build();
    }
}
