package com.cospace.app.service;

import com.cospace.app.dto.api.RefundDto.RefundResponse;
import com.cospace.app.entity.Booking;
import com.cospace.app.entity.BranchEntity;
import com.cospace.app.entity.Payment;
import com.cospace.app.entity.PaymentStatus;
import com.cospace.app.entity.Promotion;
import com.cospace.app.entity.Refund;
import com.cospace.app.entity.User;
import com.cospace.app.repository.BookingCancellationRepository;
import com.cospace.app.repository.BookingRepository;
import com.cospace.app.repository.BranchEntityRepository;
import com.cospace.app.repository.PaymentRepository;
import com.cospace.app.repository.PromotionRepository;
import com.cospace.app.repository.RefundRepository;
import com.cospace.app.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Tracks money owed back to customers. A refund is only ever <em>requested</em> automatically
 * (cancellation, maintenance, late or duplicate payment); a branch admin or admin settles it and
 * then marks it processed or rejected. Refunds for a booking never exceed what was actually paid
 * for it, however many causes stack up.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RefundService {

    /** Refunds that still count against what may be refunded for a booking. */
    private static final Set<String> OPEN_OR_DONE = Set.of(Refund.STATUS_PENDING, Refund.STATUS_PROCESSED);
    private static final Set<String> REFUND_METHODS = Set.of(Refund.METHOD_CASH, Refund.METHOD_BANK_TRANSFER, Refund.METHOD_VOUCHER);
    /** Default validity of a refund voucher. */
    private static final int DEFAULT_VOUCHER_DAYS = 90;

    private final RefundRepository refundRepository;
    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;
    private final BookingCancellationRepository cancellationRepository;
    private final UserRepository userRepository;
    private final BranchEntityRepository branchRepository;
    private final PromotionRepository promotionRepository;
    private final NotificationService notificationService;
    private final PromotionService promotionService;

    /** What can still be refunded for a booking: money received minus refunds already owed or paid. */
    @Transactional(readOnly = true)
    public long refundableAmount(UUID bookingId) {
        long received = paymentRepository.findByBookingIdAndStatusIn(bookingId, List.of(PaymentStatus.PAID, PaymentStatus.REFUNDED))
                .stream().mapToLong(Payment::getAmount).sum();
        long alreadyRefunded = refundRepository.sumAmountByBookingAndStatuses(bookingId, OPEN_OR_DONE);
        return Math.max(0, received - alreadyRefunded);
    }

    /**
     * Records a refund owed to the booking's customer and notifies them. Amounts of zero or less are
     * ignored; a payment-specific refund is created at most once per payment and reason.
     *
     * @return the refund, or null when nothing needed refunding
     */
    @Transactional
    public Refund requestRefund(Booking booking, UUID paymentId, long amount, String reasonType, String reason) {
        if (amount <= 0) return null;
        if (paymentId != null && refundRepository.existsByPaymentIdAndReasonType(paymentId, reasonType)) {
            return null;
        }
        Refund refund = refundRepository.save(Refund.builder()
                .bookingId(booking.getId())
                .paymentId(paymentId)
                .userId(booking.getUserId())
                .branchId(booking.getBranchId())
                .amount(amount)
                .reasonType(reasonType)
                .reason(reason)
                .build());
        log.info("Refund {} of {} requested for booking {} ({})", refund.getId(), amount, booking.getBookingCode(), reasonType);

        notificationService.createNotification(booking.getUserId(),
                "Yêu cầu hoàn tiền đã được ghi nhận",
                String.format("Đơn %s sẽ được hoàn %s. %s Chúng tôi sẽ thông báo khi hoàn tất.",
                        booking.getBookingCode(), vnd(amount), reason != null ? reason : ""),
                "REFUND", booking.getId(), "BOOKING");
        return refund;
    }

    /** Stops any payment still in flight for the booking, so a gateway can't confirm it later unnoticed. */
    @Transactional
    public void cancelOpenPayments(UUID bookingId) {
        List<Payment> open = paymentRepository.findByBookingIdAndStatusIn(bookingId, List.of(PaymentStatus.INITIATED, PaymentStatus.PENDING));
        open.forEach(p -> p.setStatus(PaymentStatus.CANCELLED));
        paymentRepository.saveAll(open);
    }

    /* ─────────────── Staff workflow ─────────────── */

    @Transactional(readOnly = true)
    public List<RefundResponse> list(UUID branchId, String status) {
        String normalized = status == null || status.isBlank() || "all".equalsIgnoreCase(status)
                ? null : status.trim().toLowerCase(Locale.ROOT);
        List<Refund> refunds = refundRepository.search(branchId, normalized);
        if (refunds.isEmpty()) return List.of();

        Map<UUID, Booking> bookings = bookingRepository.findAllById(refunds.stream().map(Refund::getBookingId).distinct().toList())
                .stream().collect(Collectors.toMap(Booking::getId, Function.identity()));
        Map<UUID, User> users = userRepository.findAllById(refunds.stream()
                        .flatMap(r -> java.util.stream.Stream.of(r.getUserId(), r.getProcessedBy()))
                        .filter(java.util.Objects::nonNull).distinct().toList())
                .stream().collect(Collectors.toMap(User::getId, Function.identity()));
        Map<UUID, String> branchNames = branchRepository.findAll().stream()
                .collect(Collectors.toMap(BranchEntity::getId, BranchEntity::getName));
        Map<UUID, Payment> payments = paymentRepository.findAllById(refunds.stream().map(Refund::getPaymentId)
                        .filter(java.util.Objects::nonNull).distinct().toList())
                .stream().collect(Collectors.toMap(Payment::getId, Function.identity()));
        Map<UUID, Promotion> vouchers = promotionRepository.findAllById(refunds.stream().map(Refund::getVoucherPromotionId)
                        .filter(java.util.Objects::nonNull).distinct().toList())
                .stream().collect(Collectors.toMap(Promotion::getId, Function.identity()));

        return refunds.stream().map(r -> {
            Booking b = bookings.get(r.getBookingId());
            User customer = users.get(r.getUserId());
            User processor = r.getProcessedBy() != null ? users.get(r.getProcessedBy()) : null;
            Payment payment = r.getPaymentId() != null ? payments.get(r.getPaymentId()) : null;
            return RefundResponse.builder()
                    .id(r.getId())
                    .bookingId(r.getBookingId())
                    .bookingCode(b != null ? b.getBookingCode() : null)
                    .bookingStatus(b != null && b.getStatus() != null ? b.getStatus().name() : null)
                    .paymentId(r.getPaymentId())
                    .paymentProvider(payment != null ? payment.getProvider() : null)
                    .userId(r.getUserId())
                    .customerName(customer != null ? customer.getFullName() : null)
                    .customerPhone(customer != null ? customer.getPhone() : null)
                    .customerEmail(customer != null ? customer.getEmail() : null)
                    .branchId(r.getBranchId())
                    .branchName(branchNames.get(r.getBranchId()))
                    .amount(r.getAmount())
                    .reasonType(r.getReasonType())
                    .reason(r.getReason())
                    .status(r.getStatus())
                    .resolutionNote(r.getResolutionNote())
                    .refundMethod(r.getRefundMethod())
                    .voucherCode(r.getVoucherPromotionId() != null && vouchers.containsKey(r.getVoucherPromotionId())
                            ? vouchers.get(r.getVoucherPromotionId()).getCode() : null)
                    .voucherExpiresAt(r.getVoucherPromotionId() != null && vouchers.containsKey(r.getVoucherPromotionId())
                            ? vouchers.get(r.getVoucherPromotionId()).getEndAt() : null)
                    .processedByName(processor != null ? processor.getFullName() : null)
                    .processedAt(r.getProcessedAt())
                    .createdAt(r.getCreatedAt())
                    .build();
        }).toList();
    }

    @Transactional(readOnly = true)
    public UUID getBranchId(UUID refundId) {
        return findRefund(refundId).getBranchId();
    }

    /** Marks a pending refund as paid back by bank transfer. */
    @Transactional
    public Refund markProcessed(UUID refundId, UUID actorId, String note) {
        return markProcessed(refundId, actorId, note, Refund.METHOD_BANK_TRANSFER, null);
    }

    /**
     * Marks a pending refund as paid back to the customer, in cash, by bank transfer, or as a
     * personal single-use voucher of the same value that is issued right away.
     */
    @Transactional
    public Refund markProcessed(UUID refundId, UUID actorId, String note, String method, Integer voucherValidDays) {
        String normalizedMethod = method == null || method.isBlank()
                ? Refund.METHOD_BANK_TRANSFER : method.trim().toLowerCase(Locale.ROOT);
        if (!REFUND_METHODS.contains(normalizedMethod)) {
            throw new IllegalArgumentException("Hình thức hoàn tiền không hợp lệ (cash, bank_transfer hoặc voucher).");
        }
        Refund refund = findPendingRefund(refundId);
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        String code = bookingCode(refund);

        Promotion voucher = null;
        if (Refund.METHOD_VOUCHER.equals(normalizedMethod)) {
            int validDays = voucherValidDays != null ? voucherValidDays : DEFAULT_VOUCHER_DAYS;
            voucher = promotionService.issueVoucher(refund.getUserId(), refund.getAmount(),
                    "Voucher hoàn tiền đơn " + code,
                    "Hoàn tiền đơn " + code + " dưới dạng voucher, dùng một lần cho đơn đặt chỗ tiếp theo.",
                    validDays, actorId);
            refund.setVoucherPromotionId(voucher.getId());
        }

        refund.setStatus(Refund.STATUS_PROCESSED);
        refund.setRefundMethod(normalizedMethod);
        refund.setResolutionNote(blankToNull(note));
        refund.setProcessedBy(actorId);
        refund.setProcessedAt(now);
        refund = refundRepository.save(refund);

        markPaymentsRefunded(refund, now);
        syncCancellation(refund);

        String noteSuffix = refund.getResolutionNote() != null ? " Ghi chú: " + refund.getResolutionNote() : "";
        if (voucher != null) {
            notificationService.createNotification(refund.getUserId(),
                    "Bạn nhận được voucher hoàn tiền",
                    String.format("Đơn %s được hoàn %s dưới dạng voucher %s, dùng khi đặt chỗ đến hết %s.%s",
                            code, vnd(refund.getAmount()), voucher.getCode(),
                            voucher.getEndAt().atZoneSameInstant(BookingService.BUSINESS_ZONE).toLocalDate()
                                    .format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")),
                            noteSuffix),
                    "REFUND", refund.getBookingId(), "BOOKING");
        } else {
            notificationService.createNotification(refund.getUserId(),
                    "Hoàn tiền thành công",
                    String.format("Bạn đã được hoàn %s cho đơn %s (%s).%s", vnd(refund.getAmount()), code,
                            Refund.METHOD_CASH.equals(normalizedMethod) ? "tiền mặt" : "chuyển khoản", noteSuffix),
                    "REFUND", refund.getBookingId(), "BOOKING");
        }
        return refund;
    }

    /** Declines a pending refund; a reason is required so the customer knows why. */
    @Transactional
    public Refund reject(UUID refundId, UUID actorId, String note) {
        if (note == null || note.isBlank()) {
            throw new IllegalArgumentException("Vui lòng nhập lý do từ chối hoàn tiền.");
        }
        Refund refund = findPendingRefund(refundId);
        refund.setStatus(Refund.STATUS_REJECTED);
        refund.setResolutionNote(note.trim());
        refund.setProcessedBy(actorId);
        refund.setProcessedAt(OffsetDateTime.now(ZoneOffset.UTC));
        refund = refundRepository.save(refund);
        syncCancellation(refund);

        notificationService.createNotification(refund.getUserId(),
                "Yêu cầu hoàn tiền bị từ chối",
                String.format("Yêu cầu hoàn %s cho đơn %s đã bị từ chối. Lý do: %s",
                        vnd(refund.getAmount()), bookingCode(refund), refund.getResolutionNote()),
                "REFUND", refund.getBookingId(), "BOOKING");
        return refund;
    }

    /**
     * A payment-specific refund returns that payment; a booking-level one marks the booking's
     * payments refunded once everything received has been given back.
     */
    private void markPaymentsRefunded(Refund refund, OffsetDateTime now) {
        if (refund.getPaymentId() != null) {
            paymentRepository.findById(refund.getPaymentId()).ifPresent(p -> {
                if (refund.getAmount() >= p.getAmount()) p.setStatus(PaymentStatus.REFUNDED);
                p.setRefundedAt(now);
                paymentRepository.save(p);
            });
            return;
        }
        List<Payment> paid = paymentRepository.findByBookingIdAndStatusIn(refund.getBookingId(), List.of(PaymentStatus.PAID));
        long received = paid.stream().mapToLong(Payment::getAmount).sum();
        long refunded = refundRepository.sumAmountByBookingAndStatuses(refund.getBookingId(), Set.of(Refund.STATUS_PROCESSED));
        boolean fullyRefunded = refunded >= received;
        paid.forEach(p -> {
            p.setRefundedAt(now);
            if (fullyRefunded) p.setStatus(PaymentStatus.REFUNDED);
        });
        paymentRepository.saveAll(paid);
    }

    /** Keeps the customer-facing refund status on the cancellation record in step with the refund. */
    private void syncCancellation(Refund refund) {
        if (!Refund.REASON_CANCELLATION.equals(refund.getReasonType()) && !Refund.REASON_MAINTENANCE.equals(refund.getReasonType())) {
            return;
        }
        cancellationRepository.findByBookingId(refund.getBookingId()).ifPresent(c -> {
            c.setRefundStatus(refund.getStatus());
            c.setProcessedAt(refund.getProcessedAt());
            cancellationRepository.save(c);
        });
    }

    private Refund findRefund(UUID refundId) {
        return refundRepository.findById(refundId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy yêu cầu hoàn tiền."));
    }

    private Refund findPendingRefund(UUID refundId) {
        Refund refund = findRefund(refundId);
        if (!Refund.STATUS_PENDING.equals(refund.getStatus())) {
            throw new IllegalStateException("Yêu cầu hoàn tiền này đã được xử lý trước đó.");
        }
        return refund;
    }

    private String bookingCode(Refund refund) {
        return bookingRepository.findById(refund.getBookingId()).map(Booking::getBookingCode).orElse("");
    }

    static String vnd(long amount) {
        return String.format(Locale.US, "%,d", amount).replace(',', '.') + "đ";
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
