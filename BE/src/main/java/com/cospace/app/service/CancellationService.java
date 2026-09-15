package com.cospace.app.service;

import com.cospace.app.entity.Booking;
import com.cospace.app.entity.BookingCancellation;
import com.cospace.app.entity.BookingStatus;
import com.cospace.app.entity.CancellationPolicy;
import com.cospace.app.repository.BookingCancellationRepository;
import com.cospace.app.repository.BookingRepository;
import com.cospace.app.repository.CancellationPolicyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
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
            throw new IllegalStateException("Không thể hủy đặt chỗ ở trạng thái hiện tại: " + booking.getStatus());
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

        long totalAmount = booking.getTotalAmount();
        long refundAmount = (totalAmount * refundPercent) / 100L;
        // Rule #40: Cancellation Amount Invariant: refund_amount + penalty_amount == booking.total_amount
        long penaltyAmount = totalAmount - refundAmount;

        // Update booking status
        booking.setStatus(BookingStatus.CANCELLED);
        bookingRepository.save(booking);

        // Record cancellation
        BookingCancellation cancellation = BookingCancellation.builder()
                .bookingId(booking.getId())
                .userId(userId)
                .reason(reason != null ? reason : "Khách hàng yêu cầu hủy")
                .refundPercent(refundPercent)
                .refundAmount(refundAmount)
                .penaltyAmount(penaltyAmount)
                .refundStatus(refundAmount > 0 ? "pending" : "processed")
                .appliedRuleJson(appliedRule)
                .processedAt(refundAmount == 0 ? now : null)
                .build();

        cancellation = cancellationRepository.save(cancellation);

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
