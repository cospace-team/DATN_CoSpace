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
    private final RefundService refundService;
    private final BookingAddonService bookingAddonService;
    private final ObjectMapper objectMapper;

    public PaymentService(PaymentRepository paymentRepository, BookingRepository bookingRepository, BookingService bookingService, MomoService momoService, PayosService payosService, RefundService refundService, BookingAddonService bookingAddonService) {
        this.paymentRepository = paymentRepository;
        this.bookingRepository = bookingRepository;
        this.bookingService = bookingService;
        this.momoService = momoService;
        this.payosService = payosService;
        this.refundService = refundService;
        this.bookingAddonService = bookingAddonService;
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
        requireOnlinePayable(booking);

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
        requireOnlinePayable(booking);

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
        Map<String, Object> payosRes = payosService.createPaymentLink(
                orderCode, payment.getAmount(), description, booking.getPaymentDeadlineAt());

        String checkoutUrl = Objects.toString(payosRes.get("checkoutUrl"), "");
        String qrCode = Objects.toString(payosRes.get("qrCode"), "");

        payment.setStatus(PaymentStatus.PENDING);
        payment.setPayUrl(checkoutUrl);
        paymentRepository.save(payment);

        return toPayosCreateResponse(payment, orderCode, qrCode, "Tạo liên kết thanh toán PayOS VietQR thành công.");
    }

    /**
     * Creates a VietQR (PayOS) payment for everything still owed on a booking's running tab: add-ons
     * ordered after the booking was paid, extra hours, late check-out fees. The lines are tied to the
     * payment and become paid when PayOS confirms it. The caller checks that the requester owns the
     * booking or works at its branch.
     */
    @Transactional
    public com.cospace.app.dto.api.BookingAddonDto.TabPaymentResponse createTabPayosPayment(UUID bookingId) {
        Booking booking = bookingRepository.findByIdWithLock(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đặt chỗ."));
        if (booking.getStatus() != BookingStatus.CONFIRMED && booking.getStatus() != BookingStatus.CHECKED_IN
                && booking.getStatus() != BookingStatus.COMPLETED) {
            throw new IllegalStateException("Không thể thanh toán dịch vụ cho đơn ở trạng thái "
                    + BookingStateMachine.label(booking.getStatus()) + ".");
        }

        long owed = bookingAddonService.unpaidAmount(bookingId);
        if (owed <= 0) {
            throw new IllegalStateException("Đơn không còn khoản nào chưa thanh toán.");
        }

        long orderCode = (System.currentTimeMillis() % 1000000000L) * 1000 + (RANDOM.nextInt(900) + 100);
        Payment payment = Payment.builder()
                .id(UUID.randomUUID())
                .bookingId(booking.getId())
                .userId(booking.getUserId())
                .provider("payos")
                .method("vietqr")
                .orderId("PAYOS-" + orderCode)
                .requestId(UUID.randomUUID().toString())
                .amount(owed)
                .status(PaymentStatus.INITIATED)
                .purpose(Payment.PURPOSE_ADDON)
                .build();
        paymentRepository.saveAndFlush(payment);

        long amount = bookingAddonService.linkUnpaidToPayment(bookingId, payment.getId());

        Map<String, Object> payosRes = payosService.createPaymentLink(orderCode, amount, "DV " + booking.getBookingCode(), null);
        payment.setStatus(PaymentStatus.PENDING);
        payment.setPayUrl(Objects.toString(payosRes.get("checkoutUrl"), ""));
        paymentRepository.save(payment);

        return com.cospace.app.dto.api.BookingAddonDto.TabPaymentResponse.builder()
                .paymentId(payment.getId())
                .bookingId(booking.getId())
                .orderCode(orderCode)
                .orderId(payment.getOrderId())
                .amount(amount)
                .checkoutUrl(payment.getPayUrl())
                .qrCode(Objects.toString(payosRes.get("qrCode"), ""))
                .status(payment.getStatus().name())
                .build();
    }

    @Transactional
    public CashCreatePaymentResponse createCashPayment(UUID staffId, UUID bookingId) {
        Booking booking = bookingRepository.findByIdWithLock(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));
        requirePayable(booking.getStatus(), booking.getPaymentDeadlineAt(), booking.getTotalAmount());
        if (paymentRepository.existsByBookingIdAndStatusAndPurpose(bookingId, PaymentStatus.PAID, Payment.PURPOSE_BOOKING)) {
            throw new IllegalStateException("Đơn đặt chỗ này đã được thanh toán.");
        }

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

        confirmBooking(payment);

        return toCashCreateResponse(payment);
    }

    @Transactional
    public void handleMomoCallback(Map<String, String> params) {
        String orderId = params.get("orderId");
        if (orderId == null || orderId.isBlank()) {
            throw new IllegalArgumentException("Missing orderId");
        }

        // partnerCode comes from the request itself, so it can never be a reason to skip verification.
        if (!momoService.verifyCallbackSignature(params, params.get("signature"))) {
            log.warn("MoMo signature mismatch for orderId={}", orderId);
            throw new IllegalArgumentException("Invalid signature");
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
            applyPaidPayment(payment);
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
                .orElse(null);
        if (payment == null) {
            // Signed by PayOS but not one of our orders, e.g. the test call PayOS sends when the webhook
            // URL is registered. Acknowledge it (PayOS requires a 2xx) without changing anything.
            log.warn("PayOS webhook for unknown orderCode={} acknowledged without changes", orderCodeStr);
            return;
        }

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
            applyPaidPayment(payment);
            log.info("PayOS payment {} marked as PAID for booking {}", payment.getId(), payment.getBookingId());
        } else {
            payment.setStatus(PaymentStatus.FAILED);
        }
        paymentRepository.save(payment);
    }

    /**
     * Handles the browser redirect back from PayOS. The query string (status, code, cancel) is
     * controlled by whoever opens the URL, so it is never trusted: the payment's state is taken from
     * our own database or verified directly with PayOS.
     *
     * @return true only if the payment is confirmed as paid
     */
    @Transactional
    public boolean handlePayosReturn(Map<String, String> params) {
        String orderCodeStr = params.getOrDefault("orderCode", "").trim();
        if (orderCodeStr.startsWith("PAYOS-")) {
            orderCodeStr = orderCodeStr.substring("PAYOS-".length());
        }
        long orderCode;
        try {
            orderCode = Long.parseLong(orderCodeStr);
        } catch (NumberFormatException ex) {
            return false;
        }

        String lookupCode = orderCodeStr;
        Payment payment = paymentRepository.findByOrderId("PAYOS-" + lookupCode)
                .or(() -> paymentRepository.findByOrderId(lookupCode))
                .orElse(null);
        if (payment == null) {
            return false;
        }
        if (payment.getStatus() == PaymentStatus.PAID) {
            return true;
        }

        PayosService.PaymentLinkStatus verified = payosService.getPaymentLinkStatus(orderCode);
        if (verified == null) {
            return false;
        }

        if (verified.isPaid() && verified.amountPaid() >= payment.getAmount()) {
            payment.setStatus(PaymentStatus.PAID);
            payment.setPaidAt(OffsetDateTime.now(ZoneOffset.UTC));
            payment.setRawCallback(safeJson(Map.of("source", "payos_status_lookup", "status", verified)));
            paymentRepository.save(payment);
            applyPaidPayment(payment);
            return true;
        }

        if ("CANCELLED".equalsIgnoreCase(verified.status()) || "EXPIRED".equalsIgnoreCase(verified.status())) {
            payment.setStatus(PaymentStatus.FAILED);
            payment.setRawCallback(safeJson(Map.of("source", "payos_status_lookup", "status", verified)));
            paymentRepository.save(payment);
        }
        return false;
    }

    /**
     * Demo-only stand-in for the PayOS webhook, used by the internal VietQR checkout screen. It is
     * refused whenever real PayOS credentials are configured, and only the customer who owns the
     * payment may trigger it, for a booking that is still awaiting payment.
     */
    @Transactional
    public void simulatePayosPayment(UUID callerId, String orderCode) {
        if (!payosService.isDemoMode()) {
            throw new IllegalStateException("Mô phỏng thanh toán chỉ khả dụng khi PayOS chạy ở chế độ demo.");
        }
        String orderId = orderCode.startsWith("PAYOS-") ? orderCode : "PAYOS-" + orderCode;
        Payment payment = paymentRepository.findByOrderId(orderId)
                .or(() -> paymentRepository.findByOrderId(orderCode))
                .orElseThrow(() -> new IllegalArgumentException("Payment not found for orderCode: " + orderCode));
        if (!payment.getUserId().equals(callerId)) {
            throw new org.springframework.security.access.AccessDeniedException("Bạn không có quyền xác nhận giao dịch này.");
        }
        if (payment.getStatus() == PaymentStatus.PAID) {
            return;
        }
        if (payment.getStatus() != PaymentStatus.INITIATED && payment.getStatus() != PaymentStatus.PENDING) {
            throw new IllegalStateException("Giao dịch không còn ở trạng thái chờ thanh toán.");
        }
        if (!Payment.PURPOSE_ADDON.equals(payment.getPurpose())) {
            Booking booking = bookingRepository.findById(payment.getBookingId())
                    .orElseThrow(() -> new IllegalStateException("Booking not found for payment"));
            requirePayable(booking.getStatus(), booking.getPaymentDeadlineAt(), booking.getTotalAmount());
        }

        payment.setStatus(PaymentStatus.PAID);
        payment.setPaidAt(OffsetDateTime.now(ZoneOffset.UTC));
        paymentRepository.save(payment);

        applyPaidPayment(payment);
    }

    @Transactional(readOnly = true)
    public PaymentStatus getPaymentStatusByOrderCode(String orderCode) {
        String orderId = orderCode.startsWith("PAYOS-") ? orderCode : "PAYOS-" + orderCode;
        return paymentRepository.findByOrderId(orderId)
                .or(() -> paymentRepository.findByOrderId(orderCode))
                .map(Payment::getStatus)
                .orElse(null);
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

    /** Branch of a booking, so controllers can verify staff access before acting on it. */
    @Transactional(readOnly = true)
    public UUID getBookingBranchId(UUID bookingId) {
        return bookingRepository.findById(bookingId)
                .map(Booking::getBranchId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thông tin đặt chỗ."));
    }

    private void requireOnlinePayable(BookingDto booking) {
        OffsetDateTime deadline = booking.getPaymentDeadlineAt() == null ? null : OffsetDateTime.parse(booking.getPaymentDeadlineAt());
        requirePayable(booking.getStatus(), deadline, booking.getTotalAmount());
    }

    /** A booking can take a payment only while it is awaiting one, within its hold, with something to pay. */
    private static void requirePayable(BookingStatus status, OffsetDateTime paymentDeadlineAt, long totalAmount) {
        if (status != BookingStatus.PENDING_PAYMENT) {
            throw new IllegalStateException("Đơn đặt chỗ không ở trạng thái chờ thanh toán (hiện tại: " + status + ").");
        }
        if (paymentDeadlineAt != null && !OffsetDateTime.now(ZoneOffset.UTC).isBefore(paymentDeadlineAt)) {
            throw new IllegalStateException("Đơn đặt chỗ đã quá hạn thanh toán. Vui lòng đặt lại.");
        }
        if (totalAmount <= 0) {
            throw new IllegalStateException("Đơn đặt chỗ không có số tiền cần thanh toán.");
        }
    }

    /** Routes a payment that has just been received to what it was paying for. */
    private void applyPaidPayment(Payment payment) {
        if (Payment.PURPOSE_ADDON.equals(payment.getPurpose())) {
            confirmTabPayment(payment);
        } else {
            confirmBooking(payment);
        }
    }

    /**
     * Marks the tab lines a QR payment was made for as paid. If some of them were settled at the
     * counter or cancelled while the customer was paying, the surplus is queued as a refund.
     */
    private void confirmTabPayment(Payment payment) {
        Booking booking = bookingRepository.findByIdWithLock(payment.getBookingId())
                .orElseThrow(() -> new IllegalStateException("Booking not found for payment confirmation"));
        long covered = bookingAddonService.applyTabPayment(payment);
        long surplus = payment.getAmount() - covered;
        if (surplus > 0) {
            log.warn("Tab payment {} for booking {} exceeded what was still owed by {}. Queuing refund.",
                    payment.getId(), booking.getId(), surplus);
            refundService.requestRefund(booking, payment.getId(), surplus, com.cospace.app.entity.Refund.REASON_DUPLICATE_PAYMENT,
                    "Khoản dịch vụ đã được thanh toán hoặc hủy trước khi chuyển khoản về, phần dư sẽ được hoàn lại.");
        }
    }

    /**
     * Applies a payment that has just been received. Money that arrives when the booking no longer
     * needs it — the hold already expired or was cancelled, or another payment already covered it —
     * is never kept silently: it is queued as a refund for staff to return.
     */
    private void confirmBooking(Payment payment) {
        Booking booking = bookingRepository.findByIdWithLock(payment.getBookingId())
                .orElseThrow(() -> new IllegalStateException("Booking not found for payment confirmation"));

        if (booking.getStatus() == BookingStatus.PENDING_PAYMENT) {
            BookingStateMachine.transition(booking, BookingStatus.CONFIRMED);
            bookingRepository.save(booking);
            // Add-ons ordered at checkout were part of this payment's amount.
            bookingAddonService.markPreordersPaid(booking.getId(), payment.getId());
            return;
        }

        // Rule #26: Late Webhook (Ghost Payment)
        if (booking.getStatus() == BookingStatus.EXPIRED || booking.getStatus() == BookingStatus.CANCELLED) {
            log.warn("Late payment {} received for booking {} with status {}. Queuing refund.",
                    payment.getId(), booking.getId(), booking.getStatus());
            refundService.requestRefund(booking, payment.getId(), payment.getAmount(), com.cospace.app.entity.Refund.REASON_LATE_PAYMENT,
                    "Thanh toán về sau khi đơn đã " + BookingStateMachine.label(booking.getStatus()).toLowerCase(java.util.Locale.ROOT) + ".");
            return;
        }

        if (paymentRepository.existsByBookingIdAndStatusAndPurposeAndIdNot(booking.getId(), PaymentStatus.PAID, Payment.PURPOSE_BOOKING, payment.getId())) {
            log.warn("Duplicate payment {} received for already-paid booking {}. Queuing refund.", payment.getId(), booking.getId());
            refundService.requestRefund(booking, payment.getId(), payment.getAmount(), com.cospace.app.entity.Refund.REASON_DUPLICATE_PAYMENT,
                    "Đơn đã được thanh toán trước đó, khoản thanh toán trùng sẽ được hoàn lại.");
        }
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
