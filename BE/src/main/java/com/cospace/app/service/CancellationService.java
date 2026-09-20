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
        Booking booking = lockCancellableBooking(bookingId);

        // Check ownership
        if (!booking.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Bạn không có quyền hủy đặt chỗ này.");
        }

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        // Once the booked time has started, a paid booking can no longer be cancelled by the
        // customer: a guest who does not turn up becomes a no-show and forfeits the fee (Rule #28).
        // Without this, a grace period measured from the order time still matched hours into the
        // booking, and a weekly or monthly contract — which returns to CONFIRMED between daily
        // check-outs — stayed cancellable after weeks of use, add-ons already served included. An
        // unpaid hold is left alone: there is no money at stake and letting the customer drop it is
        // better than waiting for the timeout. Staff can still cancel a started booking at the
        // counter, which is what {@link #cancelByStaff} is for.
        if (booking.getStatus() == BookingStatus.CONFIRMED && !now.isBefore(booking.getStartAt())) {
            throw new IllegalStateException(
                    "Đơn đặt chỗ đã đến giờ sử dụng nên không thể hủy trực tuyến. Vui lòng liên hệ quầy lễ tân.");
        }

        return applyCancellation(booking, userId, reason != null ? reason : "Khách hàng yêu cầu hủy",
                resolveRefundPercent(booking, now), now);
    }

    /**
     * Cancels a booking on the customer's behalf at the counter. Staff reach cases the customer no
     * longer can — a booking whose time has started, a branch-side failure — so a reason is required
     * and, when the fault is ours, the penalty can be waived entirely. The caller is responsible for
     * checking that the staff member belongs to the booking's branch, and for writing the audit entry.
     */
    @Transactional
    public BookingCancellation cancelByStaff(UUID staffId, UUID bookingId, String reason, boolean waivePenalty) {
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("Vui lòng nhập lý do hủy đơn thay khách.");
        }
        Booking booking = lockCancellableBooking(bookingId);
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        RefundOutcome outcome;
        if (waivePenalty) {
            Map<String, Object> rule = new HashMap<>();
            rule.put("policy_name", "STAFF_WAIVED_PENALTY");
            rule.put("refund_percent", 100);
            outcome = new RefundOutcome(100, rule);
        } else {
            outcome = resolveRefundPercent(booking, now);
        }
        outcome.appliedRule().put("cancelled_by_staff_id", staffId.toString());

        return applyCancellation(booking, staffId, reason.trim(), outcome, now);
    }

    /** A booking that exists, may still be cancelled, and is locked for the rest of the transaction. */
    private Booking lockCancellableBooking(UUID bookingId) {
        // Rule #44: Pessimistic Lock on parent booking
        Booking booking = bookingRepository.findByIdWithLock(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thông tin đặt chỗ."));

        // A booking in use is checked out, never cancelled.
        if (booking.getStatus() != BookingStatus.CONFIRMED && booking.getStatus() != BookingStatus.PENDING_PAYMENT) {
            throw new IllegalStateException("Không thể hủy đặt chỗ ở trạng thái hiện tại: "
                    + BookingStateMachine.label(booking.getStatus()));
        }
        if (cancellationRepository.findByBookingId(bookingId).isPresent()) {
            throw new IllegalStateException("Đơn đặt chỗ này đã được xử lý hủy trước đó.");
        }
        return booking;
    }

    /** The refund percentage a booking earns, with the policy snapshot that justified it. */
    private record RefundOutcome(int refundPercent, Map<String, Object> appliedRule) {
    }

    private RefundOutcome resolveRefundPercent(Booking booking, OffsetDateTime now) {
        int refundPercent = 0;
        Map<String, Object> appliedRule = new HashMap<>();

        if (booking.getStatus() == BookingStatus.CONFIRMED) {
            // Minutes, not truncated hours: `toHours()` stretched a two-hour grace period to two
            // hours and fifty-nine minutes, and made two adjacent day ranges both match at exactly
            // 72 hours.
            long minutesSinceCreated = 0;
            if (booking.getCreatedAt() != null) {
                minutesSinceCreated = Math.max(0, Duration.between(booking.getCreatedAt(), now).toMinutes());
            }

            long minutesBeforeStart = Math.max(0, Duration.between(now, booking.getStartAt()).toMinutes());

            // Find matching policy: branch-specific first, then global (highest priority first)
            CancellationPolicy matchedPolicy = findApplicablePolicy(booking.getBranchId(), minutesSinceCreated, minutesBeforeStart);

            if (matchedPolicy != null) {
                refundPercent = matchedPolicy.getRefundPercent().intValue();
                appliedRule.put("policy_id", matchedPolicy.getId().toString());
                appliedRule.put("policy_name", matchedPolicy.getName());
                appliedRule.put("refund_percent", refundPercent);
                appliedRule.put("rule_type", matchedPolicy.getRuleType());
                appliedRule.put("min_value", matchedPolicy.getMinValue());
                appliedRule.put("max_value", matchedPolicy.getMaxValue());
                appliedRule.put("hours_since_created", minutesSinceCreated / 60);
                appliedRule.put("hours_before_start", minutesBeforeStart / 60);
            } else {
                // Rule #39: Default 0% refund
                appliedRule.put("policy_name", "DEFAULT_NO_REFUND");
                appliedRule.put("refund_percent", 0);
                appliedRule.put("hours_since_created", minutesSinceCreated / 60);
                appliedRule.put("hours_before_start", minutesBeforeStart / 60);
            }
        } else {
            // PENDING_PAYMENT -> no refund
            appliedRule.put("policy_name", "PENDING_PAYMENT_CANCEL");
            appliedRule.put("refund_percent", 0);
        }
        return new RefundOutcome(refundPercent, appliedRule);
    }

    /** Shared tail of every cancellation: money, status, records and the notice to the customer. */
    private BookingCancellation applyCancellation(Booking booking, UUID actorId, String cancelReason,
                                                  RefundOutcome outcome, OffsetDateTime now) {
        UUID bookingId = booking.getId();
        int refundPercent = outcome.refundPercent();
        Map<String, Object> appliedRule = outcome.appliedRule();

        // Add-ons that were never paid are dropped from the bill. The policy percentage applies to the
        // rental only: add-ons already paid for were never consumed, so they are returned in full.
        bookingAddonService.voidUnpaid(booking, actorId);
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

        BookingCancellation cancellation = cancellationRepository.save(BookingCancellation.builder()
                .bookingId(booking.getId())
                .userId(booking.getUserId())
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
        // Always the customer, even when a staff member pressed the button for them.
        notificationService.createNotification(
                booking.getUserId(),
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
     * Refunds the share of a booking that a maintenance window takes away: rental × (overlapping
     * time ÷ booked time). Only the part of the window still ahead counts, so a booking already
     * under way is never refunded for time the customer has had. Add-ons were consumed and stay out
     * of it.
     *
     * <p>This is what a maintenance window costs a booking it does not fully cover — a two-hour
     * repair must not end a monthly contract, so the booking itself is left untouched.
     *
     * @return the amount requested for refund
     */
    @Transactional
    public long refundTimeLostToMaintenance(Booking booking, OffsetDateTime maintenanceStart,
                                            OffsetDateTime maintenanceEnd, String maintenanceReason) {
        if (!booking.getEndAt().isAfter(booking.getStartAt())) {
            return 0;
        }
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime lostFrom = latest(maintenanceStart, booking.getStartAt(), now);
        OffsetDateTime lostTo = maintenanceEnd.isBefore(booking.getEndAt()) ? maintenanceEnd : booking.getEndAt();
        if (!lostTo.isAfter(lostFrom)) {
            return 0;
        }

        long bookedSeconds = Duration.between(booking.getStartAt(), booking.getEndAt()).getSeconds();
        long lostSeconds = Duration.between(lostFrom, lostTo).getSeconds();
        long rentalAmount = Math.max(0, booking.getTotalAmount() - booking.getAddonAmount());
        long proRata = (long) Math.floor((double) rentalAmount * lostSeconds / bookedSeconds);
        long amount = Math.min(proRata, refundService.refundableAmount(booking.getId()));

        String reason = "Bảo trì đột xuất, hoàn phần thời gian không sử dụng được"
                + (maintenanceReason != null && !maintenanceReason.isBlank() ? " (" + maintenanceReason + ")" : "");
        refundService.requestRefund(booking, null, amount, Refund.REASON_MAINTENANCE, reason + ".");
        return Math.max(0, amount);
    }

    private static OffsetDateTime latest(OffsetDateTime a, OffsetDateTime b, OffsetDateTime c) {
        OffsetDateTime max = a.isAfter(b) ? a : b;
        return max.isAfter(c) ? max : c;
    }

    /**
     * The branch's own policies are searched first and the global ones only if none of them covers
     * the moment of cancellation: a branch policy overrides the default for the windows it defines,
     * and leaves the rest to the system-wide table, the same way branch prices work.
     */
    private CancellationPolicy findApplicablePolicy(UUID branchId, long minutesSinceCreated, long minutesBeforeStart) {
        // 1. Check branch-specific rules first (ordered by priority DESC)
        if (branchId != null) {
            List<CancellationPolicy> branchPolicies = policyRepository.findByBranchIdAndIsActiveTrueOrderByPriorityDesc(branchId);
            CancellationPolicy matched = matchPolicy(branchPolicies, minutesSinceCreated, minutesBeforeStart);
            if (matched != null) {
                return matched;
            }
        }

        // 2. Fallback to global defaults (ordered by priority DESC)
        List<CancellationPolicy> globalPolicies = policyRepository.findByBranchIdIsNullAndIsActiveTrueOrderByPriorityDesc();
        return matchPolicy(globalPolicies, minutesSinceCreated, minutesBeforeStart);
    }

    /**
     * First policy whose window contains the moment of cancellation, measured in minutes so a rule
     * means what its name says. Windows are half-open — {@code [min, max)} — so "trong 2 giờ đầu"
     * ends exactly at 02:00:00 and two adjacent windows can never both claim the same instant.
     */
    private CancellationPolicy matchPolicy(List<CancellationPolicy> policies, long minutesSinceCreated, long minutesBeforeStart) {
        for (CancellationPolicy p : policies) {
            String ruleType = p.getRuleType() != null ? p.getRuleType().trim().toUpperCase() : "";
            if ("GRACE_HOURS".equals(ruleType)) {
                // Hủy trong N giờ đầu sau khi đặt (VD: min 0, max 2)
                if (withinWindow(minutesSinceCreated, p.getMinValue(), p.getMaxValue(), 60)) {
                    return p;
                }
            } else if ("BEFORE_START_DAYS".equals(ruleType)) {
                if (withinWindow(minutesBeforeStart, p.getMinValue(), p.getMaxValue(), 24 * 60)) {
                    return p;
                }
            } else if ("BEFORE_START_HOURS".equals(ruleType) || "HOURS_BEFORE".equals(ruleType)) {
                if (withinWindow(minutesBeforeStart, p.getMinValue(), p.getMaxValue(), 60)) {
                    return p;
                }
            }
        }
        return null;
    }

    /** {@code minutes ∈ [min, max)} with the bounds given in {@code unitMinutes}-sized units. */
    private static boolean withinWindow(long minutes, int minValue, int maxValue, long unitMinutes) {
        return minutes >= minValue * unitMinutes && minutes < maxValue * unitMinutes;
    }
}
