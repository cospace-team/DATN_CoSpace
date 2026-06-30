package com.example.momosandbox.service;

import com.example.momosandbox.dto.MomoResponse;
import com.example.momosandbox.entity.Booking;
import com.example.momosandbox.entity.Payment;
import com.example.momosandbox.repository.PaymentRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Service
public class PaymentService {

    private static final Logger logger = LoggerFactory.getLogger(PaymentService.class);

    private final PaymentRepository paymentRepository;
    private final BookingService bookingService;
    private final MomoService momoService;
    private final ObjectMapper objectMapper;

    public PaymentService(PaymentRepository paymentRepository, BookingService bookingService, MomoService momoService) {
        this.paymentRepository = paymentRepository;
        this.bookingService = bookingService;
        this.momoService = momoService;
        this.objectMapper = new ObjectMapper();
    }

    @Transactional
    public Payment createMomoPayment(String userId, UUID bookingId) {
        Booking booking = bookingService.getMyBooking(userId, bookingId);

        if (!"pending_payment".equals(booking.getStatus())) {
            throw new IllegalArgumentException("Booking không ở trạng thái chờ thanh toán");
        }

        Payment payment = Payment.builder()
                .id(UUID.randomUUID())
                .bookingId(booking.getId())
                .userId(userId)
                .provider("momo")
                .method("ewallet")
                .orderId(generateOrderId(booking))
                .requestId(UUID.randomUUID().toString())
                .amount(booking.getTotalAmount())
                .status("initiated")
                .build();

        paymentRepository.save(payment);

        String orderInfo = "Thanh toán booking " + booking.getBookingCode();
        MomoResponse momoRes = momoService.createPayment(payment.getOrderId(), payment.getRequestId(),
                payment.getAmount(), orderInfo);

        Integer resultCode = momoRes.getResultCode();
        if (resultCode == null && momoRes.getErrorCode() != null) {
            // backward-compat
            resultCode = momoRes.getErrorCode();
        }

        if (resultCode == null || resultCode != 0 || momoRes.getPayUrl() == null || momoRes.getPayUrl().isBlank()) {
            payment.setStatus("failed");
            payment.setRawCallback(safeJson(Map.of(
                    "create_error", true,
                    "resultCode", resultCode,
                    "message", momoRes.getMessage(),
                    "raw", momoRes)));
            paymentRepository.save(payment);
            throw new IllegalStateException(
                    "Tạo thanh toán MoMo thất bại: " + Objects.toString(momoRes.getMessage(), "unknown"));
        }

        payment.setStatus("pending");
        payment.setPayUrl(momoRes.getPayUrl());
        paymentRepository.save(payment);

        return payment;
    }

    @Transactional(readOnly = true)
    public List<Payment> listMyPayments(String userId) {
        return paymentRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional(readOnly = true)
    public List<Payment> listPaymentsByBooking(String userId, UUID bookingId) {
        Booking booking = bookingService.getMyBooking(userId, bookingId);
        return paymentRepository.findByBookingIdOrderByCreatedAtDesc(booking.getId());
    }

    @Transactional(readOnly = true)
    public Payment getByOrderId(String userId, String orderId) {
        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found"));
        if (!payment.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Payment not found");
        }
        return payment;
    }

    @Transactional
    public void handleMomoCallback(Map<String, String> params, boolean strictSignature) {
        String orderId = params.get("orderId");
        String signature = params.get("signature");
        if (orderId == null || orderId.isBlank()) {
            throw new IllegalArgumentException("Missing orderId");
        }

        if (strictSignature) {
            if (!momoService.verifyCallbackSignature(params, signature)) {
                throw new IllegalArgumentException("Invalid signature");
            }
        } else {
            if (signature != null && !signature.isBlank() && !momoService.verifyCallbackSignature(params, signature)) {
                logger.warn("MoMo signature mismatch for orderId={}", orderId);
                return;
            }
        }

        Payment payment = paymentRepository.findByOrderId(orderId).orElse(null);
        if (payment == null) {
            logger.warn("Payment not found for orderId={} (callback ignored)", orderId);
            return;
        }

        String resultCode = params.get("resultCode");
        String transId = params.get("transId");

        payment.setProviderTransId(transId);
        payment.setRawCallback(safeJson(params));

        if ("0".equals(resultCode)) {
            if (!"paid".equals(payment.getStatus())) {
                payment.setStatus("paid");
                payment.setPaidAt(OffsetDateTime.now(ZoneOffset.UTC));
                paymentRepository.save(payment);
                bookingService.updateStatus(payment.getBookingId(), "confirmed");
            }
        } else {
            if (!"failed".equals(payment.getStatus())) {
                payment.setStatus("failed");
                paymentRepository.save(payment);
            }
        }
    }

    private String safeJson(Object any) {
        try {
            return objectMapper.writeValueAsString(any);
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    private String generateOrderId(Booking booking) {
        // MoMo orderId needs to be unique and stable enough for callback lookup
        return "BOOKING_" + booking.getId();
    }

    public Map<String, String> extractCallbackParams(Map<String, ?> body) {
        Map<String, String> out = new LinkedHashMap<>();
        if (body == null) {
            return out;
        }
        body.forEach((k, v) -> out.put(k, v == null ? null : String.valueOf(v)));
        return out;
    }
}
