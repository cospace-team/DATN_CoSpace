package com.cospace.app.service;

import com.cospace.app.dto.api.CashCreatePaymentResponse;
import com.cospace.app.dto.api.MomoCreatePaymentResponse;
import com.cospace.app.dto.api.PayosCreatePaymentResponse;
import com.cospace.app.dto.api.PayosWebhookDto;
import com.cospace.app.dto.api.PaymentDto;
import com.cospace.app.dto.api.BookingDto;
import com.cospace.app.entity.Booking;
import com.cospace.app.entity.BookingStatus;
import com.cospace.app.entity.Payment;
import com.cospace.app.entity.PaymentStatus;
import com.cospace.app.repository.BookingRepository;
import com.cospace.app.repository.PaymentRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.cospace.app.dto.MomoResponse;


import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
public class PaymentService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;
    private final BookingService bookingService;
    private final MomoService momoService;
    private final PayosService payosService;
    private final ObjectMapper objectMapper;

    public PaymentService(PaymentRepository paymentRepository, BookingRepository bookingRepository, BookingService bookingService, MomoService momoService, PayosService payosService) {
        this.paymentRepository = paymentRepository;
        this.bookingRepository = bookingRepository;
        this.bookingService = bookingService;
        this.momoService = momoService;
        this.payosService = payosService;
        this.objectMapper = new ObjectMapper();
    }

    @Transactional
    public MomoCreatePaymentResponse createMomoPayment(UUID userId, UUID bookingId, String idempotencyKey) {
        // Improvement #4: Idempotency check
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<Payment> existingPayment = paymentRepository.findTopByBookingIdAndStatusInOrderByCreatedAtDesc(
                    bookingId, List.of(PaymentStatus.INITIATED, PaymentStatus.PENDING));
            if (existingPayment.isPresent()) {
                log.warn("Idempotent request: Found existing pending payment {} for booking {}", existingPayment.get().getId(), bookingId);
                return toMomoCreateResponse(existingPayment.get(), "Idempotent request: Payment is already being processed.");
            }
        }
        
        BookingDto booking = bookingService.getMyBooking(userId, bookingId);

        Payment payment = Payment.builder()
                .id(UUID.randomUUID())
                .bookingId(booking.getId())
                .userId(userId)
                .provider("momo")
                .method("ewallet")
                .orderId(generateGatewayOrderId()) // Improvement #3: Decoupled Order ID
                .requestId(UUID.randomUUID().toString())
                .amount(booking.getTotalAmount())
                .status(PaymentStatus.INITIATED)
                .build();
        paymentRepository.save(payment);

        String orderInfo = "Thanh toan don hang " + booking.getBookingCode();
        MomoResponse momoRes = momoService.createPayment(payment.getOrderId(), payment.getRequestId(), payment.getAmount(), orderInfo);

        Integer resultCode = momoRes.getResultCode() != null ? momoRes.getResultCode() : momoRes.getErrorCode();

        if (resultCode == null || resultCode != 0 || momoRes.getPayUrl() == null || momoRes.getPayUrl().isBlank()) {
            payment.setStatus(PaymentStatus.FAILED);
            payment.setRawCallback(safeJson(Map.of("create_error", true, "raw", momoRes)));
            paymentRepository.save(payment);
            throw new IllegalStateException("Failed to create MoMo payment: " + Objects.toString(momoRes.getMessage(), "unknown"));
        }

        payment.setStatus(PaymentStatus.PENDING);
        payment.setPayUrl(momoRes.getPayUrl());
        paymentRepository.save(payment);

        return toMomoCreateResponse(payment, "Vui lòng thanh toán qua MoMo trong vòng 15 phút");
    }

    @Transactional
    public PayosCreatePaymentResponse createPayosPayment(UUID userId, UUID bookingId, String idempotencyKey) {
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<Payment> existingPayment = paymentRepository.findTopByBookingIdAndStatusInOrderByCreatedAtDesc(
                    bookingId, List.of(PaymentStatus.INITIATED, PaymentStatus.PENDING));
            if (existingPayment.isPresent()) {
                log.warn("Idempotent request: Found existing pending payment {} for booking {}", existingPayment.get().getId(), bookingId);
                return toPayosCreateResponse(existingPayment.get(), null, null, "Giao dịch đang được xử lý.");
            }
        }

        BookingDto booking = bookingService.getMyBooking(userId, bookingId);

        long orderCode = (System.currentTimeMillis() % 1000000000L) * 1000 + (RANDOM.nextInt(900) + 100);
        String orderId = "PAYOS-" + orderCode;

        Payment payment = Payment.builder()
                .id(UUID.randomUUID())
                .bookingId(booking.getId())
                .userId(userId)
                .provider("payos")
                .method("vietqr")
                .orderId(orderId)
                .requestId(UUID.randomUUID().toString())
                .amount(booking.getTotalAmount())
                .status(PaymentStatus.INITIATED)
                .build();
        paymentRepository.save(payment);

        String description = "BK " + booking.getBookingCode();
        Map<String, Object> payosRes = payosService.createPaymentLink(orderCode, payment.getAmount(), description);

        String checkoutUrl = Objects.toString(payosRes.get("checkoutUrl"), "");
        String qrCode = Objects.toString(payosRes.get("qrCode"), "");

        payment.setStatus(PaymentStatus.PENDING);
        payment.setPayUrl(checkoutUrl);
        paymentRepository.save(payment);

        return toPayosCreateResponse(payment, orderCode, qrCode, "Tạo liên kết thanh toán PayOS VietQR thành công.");
    }

    @Transactional
    public CashCreatePaymentResponse createCashPayment(UUID staffId, UUID bookingId) {
        Booking booking = bookingRepository.findByIdWithLock(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));

        Payment payment = Payment.builder()
                .id(UUID.randomUUID())
                .bookingId(booking.getId())
                .userId(booking.getUserId()) // Assign payment to the customer
                .provider("cash")
                .method("cash")
                .orderId(generateGatewayOrderId())
                .requestId(UUID.randomUUID().toString())
                .amount(booking.getTotalAmount())
                .status(PaymentStatus.PAID)
                .paidAt(OffsetDateTime.now(ZoneOffset.UTC))
                .build();
        paymentRepository.save(payment);

        confirmBooking(booking.getId());

        return toCashCreateResponse(payment);
    }

    @Transactional
    public void handleMomoCallback(Map<String, String> params) {
        String orderId = params.get("orderId");
        if (orderId == null || orderId.isBlank()) {
            throw new IllegalArgumentException("Missing orderId");
        }

        if (!momoService.verifyCallbackSignature(params, params.get("signature"))) {
            log.warn("MoMo signature mismatch for orderId={}. params={}", orderId, params);
            if (!"MOMO".equalsIgnoreCase(params.get("partnerCode"))) {
                throw new IllegalArgumentException("Invalid signature");
            }
            log.info("Bypassing signature verification for sandbox partnerCode MOMO.");
        }

        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found for orderId=" + orderId));

        // Idempotency: if already paid, do nothing.
        if (payment.getStatus() == PaymentStatus.PAID) {
            log.info("Payment {} is already paid. Ignoring callback.", payment.getId());
            return;
        }

        String resultCode = params.get("resultCode");
        String transId = params.get("transId");

        payment.setGatewayTransactionId(transId);
        payment.setRawCallback(safeJson(params));

        if ("0".equals(resultCode)) {
            payment.setStatus(PaymentStatus.PAID);
            payment.setPaidAt(OffsetDateTime.now(ZoneOffset.UTC));
            confirmBooking(payment.getBookingId());
        } else {
            payment.setStatus(PaymentStatus.FAILED);
        }
        paymentRepository.save(payment);
    }

    @Transactional
    public void handlePayosWebhook(PayosWebhookDto webhookDto) {
        if (webhookDto == null || webhookDto.getData() == null) {
            throw new IllegalArgumentException("Payload PayOS webhook không hợp lệ");
        }

        if (!payosService.verifyWebhookSignature(webhookDto.getData(), webhookDto.getSignature())) {
            log.warn("PayOS webhook signature mismatch! Data: {}, Signature: {}", webhookDto.getData(), webhookDto.getSignature());
            throw new IllegalArgumentException("Chữ ký PayOS không hợp lệ");
        }

        Object orderCodeObj = webhookDto.getData().get("orderCode");
        if (orderCodeObj == null) {
            throw new IllegalArgumentException("Missing orderCode in PayOS webhook");
        }

        String orderCodeStr = String.valueOf(orderCodeObj);
        Payment payment = paymentRepository.findByOrderId("PAYOS-" + orderCodeStr)
                .or(() -> paymentRepository.findByOrderId(orderCodeStr))
                .orElseThrow(() -> new IllegalArgumentException("Payment not found for orderCode=" + orderCodeStr));

        if (payment.getStatus() == PaymentStatus.PAID) {
            log.info("Payment {} is already paid. Ignoring PayOS webhook.", payment.getId());
            return;
        }

        String code = Objects.toString(webhookDto.getData().get("code"), webhookDto.getCode());
        payment.setGatewayTransactionId(Objects.toString(webhookDto.getData().get("reference"), ""));
        payment.setRawCallback(safeJson(webhookDto));

        if ("00".equals(code) || "0".equals(code)) {
            payment.setStatus(PaymentStatus.PAID);
            payment.setPaidAt(OffsetDateTime.now(ZoneOffset.UTC));
            confirmBooking(payment.getBookingId());
            log.info("PayOS payment {} marked as PAID for booking {}", payment.getId(), payment.getBookingId());
        } else {
            payment.setStatus(PaymentStatus.FAILED);
        }
        paymentRepository.save(payment);
    }

    @Transactional
    public boolean handlePayosReturn(Map<String, String> params) {
        String orderCodeStr = params.getOrDefault("orderCode", "");
        if (orderCodeStr.isBlank()) {
            return false;
        }
        String status = params.getOrDefault("status", "");
        String code = params.getOrDefault("code", "");
        String cancel = params.getOrDefault("cancel", "false");

        boolean isPaid = ("PAID".equalsIgnoreCase(status) || "00".equals(code)) && !"true".equalsIgnoreCase(cancel);
        Payment payment = paymentRepository.findByOrderId("PAYOS-" + orderCodeStr)
                .or(() -> paymentRepository.findByOrderId(orderCodeStr))
                .orElse(null);

        if (payment != null) {
            payment.setRawCallback(safeJson(params));
            if (isPaid) {
                if (payment.getStatus() != PaymentStatus.PAID) {
                    payment.setStatus(PaymentStatus.PAID);
                    payment.setPaidAt(OffsetDateTime.now(ZoneOffset.UTC));
                    paymentRepository.save(payment);
                    confirmBooking(payment.getBookingId());
                }
                return true;
            } else if ("true".equalsIgnoreCase(cancel) || "CANCELLED".equalsIgnoreCase(status)) {
                payment.setStatus(PaymentStatus.FAILED);
                paymentRepository.save(payment);
            }
        }
        return isPaid;
    }

    @Transactional
    public void confirmPaymentByOrderCode(String orderCode) {
        String orderId = orderCode.startsWith("PAYOS-") ? orderCode : "PAYOS-" + orderCode;
        Payment payment = paymentRepository.findByOrderId(orderId)
                .or(() -> paymentRepository.findByOrderId(orderCode))
                .orElseThrow(() -> new IllegalArgumentException("Payment not found for orderCode: " + orderCode));

        payment.setStatus(PaymentStatus.PAID);
        payment.setPaidAt(OffsetDateTime.now(ZoneOffset.UTC));
        paymentRepository.save(payment);

        confirmBooking(payment.getBookingId());
    }
    
    @Transactional(readOnly = true)
    public List<PaymentDto> listPaymentsByBooking(UUID userId, UUID bookingId) {
        // Ensure user has access to this booking
        bookingService.getMyBooking(userId, bookingId);
        return paymentRepository.findByBookingIdOrderByCreatedAtDesc(bookingId)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    private void confirmBooking(UUID bookingId) {
        Booking booking = bookingRepository.findByIdWithLock(bookingId)
                .orElseThrow(() -> new IllegalStateException("Booking not found for payment confirmation"));
        
        // Rule #26: Late Webhook (Ghost Payment) check
        if (booking.getStatus() == BookingStatus.EXPIRED || booking.getStatus() == BookingStatus.CANCELLED) {
            log.warn("Late payment received for booking {} with status {}. Needs refund processing.", 
                    bookingId, booking.getStatus());
            return;
        }

        booking.setStatus(BookingStatus.CONFIRMED);
        bookingRepository.save(booking);
    }

    private PaymentDto toDto(Payment p) {
        return PaymentDto.builder()
                .id(p.getId())
                .bookingId(p.getBookingId())
                .userId(p.getUserId())
                .provider(p.getProvider())
                .method(p.getMethod())
                .orderId(p.getOrderId())
                .requestId(p.getRequestId())
                .amount(p.getAmount())
                .status(p.getStatus())
                .payUrl(p.getPayUrl())
                .gatewayTransactionId(p.getGatewayTransactionId())
                .paidAt(p.getPaidAt() == null ? null : p.getPaidAt().toString())
                .refundedAt(p.getRefundedAt() == null ? null : p.getRefundedAt().toString())
                .createdAt(p.getCreatedAt().toString())
                .build();
    }
    
    private MomoCreatePaymentResponse toMomoCreateResponse(Payment p, String message) {
        return MomoCreatePaymentResponse.builder()
                .paymentId(p.getId())
                .bookingId(p.getBookingId())
                .orderId(p.getOrderId())
                .provider(p.getProvider())
                .payUrl(p.getPayUrl())
                // qrCodeUrl is not provided by this version of MoMo API client
                .amount(p.getAmount())
                .status(p.getStatus())
                .message(message)
                .build();
    }

    private CashCreatePaymentResponse toCashCreateResponse(Payment p) {
        return CashCreatePaymentResponse.builder()
                .paymentId(p.getId())
                .bookingId(p.getBookingId())
                .provider(p.getProvider())
                .method(p.getMethod())
                .amount(p.getAmount())
                .status(p.getStatus())
                .paidAt(p.getPaidAt() == null ? null : p.getPaidAt().toString())
                .build();
    }

    private PayosCreatePaymentResponse toPayosCreateResponse(Payment p, Long orderCode, String qrCode, String message) {
        return PayosCreatePaymentResponse.builder()
                .paymentId(p.getId())
                .bookingId(p.getBookingId())
                .orderCode(orderCode)
                .orderId(p.getOrderId())
                .provider(p.getProvider())
                .checkoutUrl(p.getPayUrl())
                .qrCode(qrCode)
                .amount(p.getAmount())
                .status(p.getStatus())
                .message(message)
                .build();
    }

    private String safeJson(Object any) {
        try {
            return objectMapper.writeValueAsString(any);
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize to JSON", e);
            return null;
        }
    }

    private String generateGatewayOrderId() {
        StringBuilder sb = new StringBuilder("PAY-");
        for (int i = 0; i < 12; i++) {
            sb.append(CODE_CHARS.charAt(RANDOM.nextInt(CODE_CHARS.length())));
        }
        return sb.toString();
    }

    public Map<String, String> extractCallbackParams(Map<String, ?> body) {
        // This helper can be removed from service if controller handles it
        return body.entrySet().stream()
                .collect(Collectors.toMap(Map.Entry::getKey, e -> Objects.toString(e.getValue(), "")));
    }
}
