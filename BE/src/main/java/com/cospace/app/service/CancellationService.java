package com.cospace.app.service;

import com.cospace.app.entity.Booking;
import com.cospace.app.entity.BookingCancellation;
import com.cospace.app.entity.BookingStatus;
import com.cospace.app.entity.CancellationPolicy;
import com.cospace.app.entity.Refund;
import com.cospace.app.repository.BookingCancellationRepository;
import com.cospace.app.repository.BookingRepository;
import com.cospace.app.repository.CancellationPolicyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class CancellationService {

    private final BookingRepository bookingRepository;
    private final BookingCancellationRepository cancellationRepository;
    private final CancellationPolicyRepository policyRepository;
    private final NotificationService notificationService;
    private final RefundService refundService;
    private final BookingAddonService bookingAddonService;

    @Transactional
    public BookingCancellation cancelBooking(UUID userId, UUID bookingId, String reason) {
        // Rule #44: Pessimistic Lock on parent booking
        Booking booking = bookingRepository.findByIdWithLock(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thông tin đặt chỗ."));

        // Check ownership
        if (!booking.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Bạn không có quyền hủy đặt chỗ này.");
        }

        // Check cancelable status
        if (booking.getStatus() != BookingStatus.CONFIRMED && booking.getStatus() != BookingStatus.PENDING_PAYMENT) {
            throw new IllegalStateException("Không thể hủy đặt chỗ ở trạng thái hiện tại: " + BookingStateMachine.label(booking.getStatus()));
        }

        // Check already cancelled
        if (cancellationRepository.findByBookingId(bookingId).isPresent()) {
            throw new IllegalStateException("Đơn đặt chỗ này đã được xử lý hủy trước đó.");
        }

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        int refundPercent = 0;
        Map<String, Object> appliedRule = new HashMap<>();

        if (booking.getStatus() == BookingStatus.CONFIRMED) {
            // Compute time elapsed since booking creation (for GRACE_HOURS rule)
            long hoursSinceCreated = 0;
            if (booking.getCreatedAt() != null) {
                hoursSinceCreated = Math.max(0, Duration.between(booking.getCreatedAt(), now).toHours());
            }

            // Compute hours before start
            long hoursBeforeStart = 0;
            if (booking.getStartAt().isAfter(now)) {
                hoursBeforeStart = Duration.between(now, booking.getStartAt()).toHours();
            }

            // Find matching policy: branch-specific first, then global (highest priority first)
            CancellationPolicy matchedPolicy = findApplicablePolicy(booking.getBranchId(), hoursSinceCreated, hoursBeforeStart);

            if (matchedPolicy != null) {
                refundPercent = matchedPolicy.getRefundPercent().intValue();
                appliedRule.put("policy_id", matchedPolicy.getId().toString());
                appliedRule.put("policy_name", matchedPolicy.getName());
                appliedRule.put("refund_percent", refundPercent);
                appliedRule.put("rule_type", matchedPolicy.getRuleType());
                appliedRule.put("hours_since_created", hoursSinceCreated);
                appliedRule.put("hours_before_start", hoursBeforeStart);
            } else {
                // Rule #39: Default 0% refund
                appliedRule.put("policy_name", "DEFAULT_NO_REFUND");
                appliedRule.put("refund_percent", 0);
                appliedRule.put("hours_since_created", hoursSinceCreated);
                appliedRule.put("hours_before_start", hoursBeforeStart);
            }
        } else {
            // PENDING_PAYMENT -> no refund
            appliedRule.put("policy_name", "PENDING_PAYMENT_CANCEL");
            appliedRule.put("refund_percent", 0);
        }

        // Add-ons that were never paid are dropped from the bill. The policy percentage applies to the
        // rental only: add-ons already paid for were never consumed, so they are returned in full.
        bookingAddonService.voidUnpaid(booking, userId);
        long totalAmount = booking.getTotalAmount();
        long paidAddons = booking.getStatus() == BookingStatus.CONFIRMED ? booking.getAddonAmount() : 0;
        long rentalAmount = Math.max(0, totalAmount - booking.getAddonAmount());
        // Never promise back more than the customer actually paid.
        long refundAmount = Math.min((rentalAmount * refundPercent) / 100L + paidAddons, refundService.refundableAmount(bookingId));
        // Rule #40: Cancellation Amount Invariant: refund_amount + penalty_amount == booking.total_amount
        long penaltyAmount = totalAmount - refundAmount;

        BookingStateMachine.transition(booking, BookingStatus.CANCELLED);
        bookingRepository.save(booking);
        // A gateway payment still in flight must not silently confirm a cancelled booking later.
        refundService.cancelOpenPayments(bookingId);

        String cancelReason = reason != null ? reason : "Khách hàng yêu cầu hủy";
        BookingCancellation cancellation = cancellationRepository.save(BookingCancellation.builder()
                .bookingId(booking.getId())
                .userId(userId)
                .reason(cancelReason)
                .refundPercent(refundPercent)
                .refundAmount(refundAmount)
                .penaltyAmount(penaltyAmount)
                .refundStatus(refundAmount > 0 ? Refund.STATUS_PENDING : Refund.STATUS_PROCESSED)
                .appliedRuleJson(appliedRule)
                .processedAt(refundAmount == 0 ? now : null)
                .build());

        refundService.requestRefund(booking, null, refundAmount, Refund.REASON_CANCELLATION,
                "Hủy đơn theo chính sách (" + refundPercent + "%).");

        // Rule #20: Send in-app notification
        String notiContent = String.format("Đơn đặt chỗ %s đã được hủy thành công. Tỷ lệ hoàn tiền: %d%% (%d VNĐ).",
                booking.getBookingCode(), refundPercent, refundAmount);
        notificationService.createNotification(
                userId,
                "Hủy đặt chỗ thành công",
                notiContent,
                "BOOKING",
                booking.getId(),
                "BOOKING"
        );

        return cancellation;
    }

    /**
     * Cancels a not-yet-used booking because its workspace goes into maintenance. The customer is
     * not at fault, so everything they paid is refunded regardless of the cancellation policy.
     */
    @Transactional
    public void cancelForMaintenance(Booking booking, String maintenanceReason) {
        if (booking.getStatus() != BookingStatus.PENDING_PAYMENT && booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new IllegalStateException("Chỉ hủy do bảo trì với đơn chưa sử dụng.");
        }
        if (cancellationRepository.findByBookingId(booking.getId()).isPresent()) {
            return;
        }
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        bookingAddonService.voidUnpaid(booking, null);
        long refundAmount = booking.getStatus() == BookingStatus.CONFIRMED ? refundService.refundableAmount(booking.getId()) : 0;
        String reason = "Không gian bảo trì đột xuất" + (maintenanceReason != null && !maintenanceReason.isBlank() ? ": " + maintenanceReason : "");

        BookingStateMachine.transition(booking, BookingStatus.CANCELLED);
        bookingRepository.save(booking);
        refundService.cancelOpenPayments(booking.getId());

        cancellationRepository.save(BookingCancellation.builder()
                .bookingId(booking.getId())
                .userId(booking.getUserId())
                .reason(reason)
                .refundPercent(refundAmount > 0 ? 100 : 0)
                .refundAmount(refundAmount)
                .penaltyAmount(0)
                .refundStatus(refundAmount > 0 ? Refund.STATUS_PENDING : Refund.STATUS_PROCESSED)
                .appliedRuleJson(Map.of("policy_name", "MAINTENANCE_FULL_REFUND", "refund_percent", refundAmount > 0 ? 100 : 0))
                .processedAt(refundAmount == 0 ? now : null)
                .build());

        refundService.requestRefund(booking, null, refundAmount, Refund.REASON_MAINTENANCE, reason + ".");

        notificationService.createNotification(booking.getUserId(),
                "Đơn đặt chỗ bị hủy do bảo trì",
                String.format("Rất tiếc, đơn %s đã bị hủy vì %s.%s", booking.getBookingCode(), reason.toLowerCase(Locale.ROOT),
                        refundAmount > 0 ? " Bạn sẽ được hoàn toàn bộ " + RefundService.vnd(refundAmount) + "." : ""),
                "BOOKING", booking.getId(), "BOOKING");
    }

    /**
     * For a booking in use that maintenance cuts short: refunds the paid share of the time the
     * customer loses, i.e. rental × (time left ÷ booked time). Add-ons were consumed and are not
     * part of it. Call before the booking's end is truncated.
     *
     * @return the amount requested for refund
     */
    @Transactional
    public long refundUnusedTimeForMaintenance(Booking booking, OffsetDateTime cutAt, String maintenanceReason) {
        if (!cutAt.isBefore(booking.getEndAt()) || !booking.getEndAt().isAfter(booking.getStartAt())) {
            return 0;
        }
        long bookedSeconds = Duration.between(booking.getStartAt(), booking.getEndAt()).getSeconds();
        OffsetDateTime lostFrom = cutAt.isAfter(booking.getStartAt()) ? cutAt : booking.getStartAt();
        long lostSeconds = Duration.between(lostFrom, booking.getEndAt()).getSeconds();
        long rentalAmount = Math.max(0, booking.getTotalAmount() - booking.getAddonAmount());
        long proRata = (long) Math.floor((double) rentalAmount * lostSeconds / bookedSeconds);
        long amount = Math.min(proRata, refundService.refundableAmount(booking.getId()));

        String reason = "Bảo trì đột xuất khi đang sử dụng, hoàn phần thời gian chưa dùng"
                + (maintenanceReason != null && !maintenanceReason.isBlank() ? " (" + maintenanceReason + ")" : "");
        refundService.requestRefund(booking, null, amount, Refund.REASON_MAINTENANCE, reason + ".");
        return Math.max(0, amount);
    }

    private CancellationPolicy findApplicablePolicy(UUID branchId, long hoursSinceCreated, long hoursBeforeStart) {
        // 1. Check branch-specific rules first (ordered by priority DESC)
        if (branchId != null) {
            List<CancellationPolicy> branchPolicies = policyRepository.findByBranchIdAndIsActiveTrueOrderByPriorityDesc(branchId);
            CancellationPolicy matched = matchPolicy(branchPolicies, hoursSinceCreated, hoursBeforeStart);
            if (matched != null) {
                return matched;
            }
        }

        // 2. Fallback to global defaults (ordered by priority DESC)
        List<CancellationPolicy> globalPolicies = policyRepository.findByBranchIdIsNullAndIsActiveTrueOrderByPriorityDesc();
        return matchPolicy(globalPolicies, hoursSinceCreated, hoursBeforeStart);
    }

    private CancellationPolicy matchPolicy(List<CancellationPolicy> policies, long hoursSinceCreated, long hoursBeforeStart) {
        for (CancellationPolicy p : policies) {
            String ruleType = p.getRuleType() != null ? p.getRuleType().trim().toUpperCase() : "";
            if ("GRACE_HOURS".equals(ruleType)) {
                // Rule: Hủy trong N giờ đầu sau khi đặt (VD: min 0, max 2)
                if (hoursSinceCreated >= p.getMinValue() && hoursSinceCreated <= p.getMaxValue()) {
                    return p;
                }
            } else if ("BEFORE_START_DAYS".equals(ruleType)) {
                long daysBefore = hoursBeforeStart / 24;
                if (daysBefore >= p.getMinValue() && daysBefore <= p.getMaxValue()) {
                    return p;
                }
            } else if ("BEFORE_START_HOURS".equals(ruleType) || "HOURS_BEFORE".equals(ruleType)) {
                if (hoursBeforeStart >= p.getMinValue() && hoursBeforeStart <= p.getMaxValue()) {
                    return p;
                }
            }
        }
        return null;
    }
}
