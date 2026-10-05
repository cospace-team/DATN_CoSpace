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

    /**
     * Optional so unit tests that build this service by hand need not supply it; always present in
     * the running application.
     */
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private AuditLogService auditLogService;

    private void audit(UUID actorId, String action, String entityName, UUID entityId, java.util.Map<String, Object> values) {
        if (auditLogService != null) {
            auditLogService.record(actorId, action, entityName, entityId, values);
        }
    }

    private final BookingRepository bookingRepository;
    private final BookingCancellationRepository cancellationRepository;
    private final CancellationPolicyRepository policyRepository;
    private final NotificationService notificationService;
    private final RefundService refundService;
    private final BookingAddonService bookingAddonService;
    private final com.cospace.app.repository.CheckinLogRepository checkinLogRepository;

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
     * Cancels every seat of a customer's booking group that can still be cancelled online (awaiting
     * payment, or paid and not started yet), each under the normal cancellation policy. Seats already
     * in use, finished or cancelled are left as they are.
     *
     * @return the cancellations made, one per seat
     */
    @Transactional
    public List<BookingCancellation> cancelGroup(UUID userId, UUID groupId, String reason) {
        List<Booking> seats = bookingRepository.findByGroupIdOrderByCreatedAtAsc(groupId);
        if (seats.isEmpty() || !seats.get(0).getUserId().equals(userId)) {
            throw new IllegalArgumentException("Không tìm thấy đơn nhóm.");
        }
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        List<BookingCancellation> done = new ArrayList<>();
        for (Booking seat : seats) {
            boolean cancellable = seat.getStatus() == BookingStatus.PENDING_PAYMENT
                    || (seat.getStatus() == BookingStatus.CONFIRMED && now.isBefore(seat.getStartAt()));
            if (cancellable) {
                done.add(cancelBooking(userId, seat.getId(), reason != null ? reason : "Khách hàng hủy đơn nhóm"));
            }
        }
        if (done.isEmpty()) {
            throw new IllegalStateException("Đơn nhóm không còn chỗ nào hủy được trực tuyến. Vui lòng liên hệ quầy lễ tân.");
        }
        return done;
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

    /* ─────────────── Staff: refund preview & ending a booking in use ─────────────── */

    /**
     * What staff may refund on a booking: what was paid and is still refundable, the policy refund if
     * it were cancelled now, and — for a booking in use — the share of the rental for the time left.
     */
    public record StaffRefundPreview(String bookingCode, String status, boolean inUse, long paid, long refundable,
                                     int policyPercent, String policyName, long policyRefund, long unusedRefund,
                                     long unpaidAddons, String startAt, String endAt) {
    }

    @Transactional(readOnly = true)
    public StaffRefundPreview previewStaffRefund(UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thông tin đặt chỗ."));
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        long refundable = refundService.refundableAmount(bookingId);
        long paid = refundable + refundRepositoryAmount(bookingId);
        long rental = Math.max(0, booking.getTotalAmount() - booking.getAddonAmount());

        int policyPercent = 0;
        String policyName = null;
        long policyRefund = 0;
        if (booking.getStatus() == BookingStatus.CONFIRMED || booking.getStatus() == BookingStatus.PENDING_PAYMENT) {
            RefundOutcome outcome = resolveRefundPercent(booking, now);
            policyPercent = outcome.refundPercent();
            Object name = outcome.appliedRule().get("policy_name");
            policyName = name != null ? name.toString() : null;
            long paidAddons = booking.getStatus() == BookingStatus.CONFIRMED ? booking.getAddonAmount() : 0;
            policyRefund = Math.min(rental * policyPercent / 100L + paidAddons, refundable);
        }
        boolean inUse = isInUse(booking, now);
        long unusedRefund = inUse ? Math.min(unusedShare(booking, rental, now), refundable) : 0;
        return new StaffRefundPreview(booking.getBookingCode(), booking.getStatus().name(), inUse, paid, refundable,
                policyPercent, policyName, policyRefund, unusedRefund, bookingAddonService.unpaidAmount(bookingId),
                booking.getStartAt().toString(), booking.getEndAt().toString());
    }

    /** How staff choose the refund when ending a booking early. */
    public enum EndEarlyRefund { UNUSED, FULL, CUSTOM }

    /**
     * Ends a booking that is in use right now — an outage, an incident, a guest asked to leave — checks
     * the guest out and queues a refund: the unused share of the rental, everything refundable, or an
     * amount staff enter (0 for none). The caller checks branch access and writes the audit entry.
     *
     * @return the amount queued for refund
     */
    @Transactional
    public long endEarlyByStaff(UUID staffId, UUID bookingId, String reason, EndEarlyRefund mode, Long customAmount) {
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("Vui lòng nhập lý do kết thúc sớm.");
        }
        Booking booking = bookingRepository.findByIdWithLock(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thông tin đặt chỗ."));
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        if (!isInUse(booking, now)) {
            throw new IllegalStateException(booking.getStatus() == BookingStatus.CONFIRMED && now.isBefore(booking.getStartAt())
                    ? "Đơn chưa đến giờ sử dụng, hãy dùng chức năng Hủy đơn."
                    : "Chỉ kết thúc sớm được đơn đang sử dụng (trạng thái hiện tại: " + BookingStateMachine.label(booking.getStatus()) + ").");
        }
        long refundable = refundService.refundableAmount(bookingId);
        long rental = Math.max(0, booking.getTotalAmount() - booking.getAddonAmount());
        long amount = switch (mode == null ? EndEarlyRefund.UNUSED : mode) {
            case UNUSED -> Math.min(unusedShare(booking, rental, now), refundable);
            case FULL -> refundable;
            case CUSTOM -> {
                if (customAmount == null || customAmount < 0) {
                    throw new IllegalArgumentException("Số tiền hoàn không hợp lệ.");
                }
                if (customAmount > refundable) {
                    throw new IllegalArgumentException("Số tiền hoàn tối đa là " + RefundService.vnd(refundable) + ".");
                }
                yield customAmount;
            }
        };

        String trimmed = reason.trim();
        checkinLogRepository.findActiveCheckinByBookingId(bookingId).ifPresent(log -> {
            log.setCheckoutAt(now.isAfter(log.getCheckinAt()) ? now : log.getCheckinAt());
            String note = (log.getNote() != null ? log.getNote() + " | " : "") + "Nhân viên kết thúc sớm: " + trimmed;
            log.setNote(note.length() > 255 ? note.substring(0, 255) : note);
            checkinLogRepository.save(log);
        });
        if (now.isAfter(booking.getStartAt()) && now.isBefore(booking.getEndAt())) {
            booking.setEndAt(now);
        }
        BookingStateMachine.transition(booking, BookingStatus.COMPLETED);
        bookingRepository.save(booking);

        refundService.requestRefund(booking, null, amount, Refund.REASON_STAFF_ENDED,
                "Kết thúc sớm: " + trimmed + ".");
        long owed = bookingAddonService.unpaidAmount(bookingId);
        notificationService.createNotification(booking.getUserId(),
                "Đơn đặt chỗ được kết thúc sớm",
                "Đơn " + booking.getBookingCode() + " đã được nhân viên kết thúc sớm. Lý do: " + trimmed + "."
                        + (amount > 0 ? " Bạn sẽ được hoàn " + RefundService.vnd(amount) + "." : "")
                        + (owed > 0 ? " Bạn còn " + RefundService.vnd(owed) + " tiền dịch vụ gọi thêm chưa thanh toán." : ""),
                "BOOKING", booking.getId(), "BOOKING");
        log.info("Staff {} ended booking {} early, refund {}", staffId, booking.getBookingCode(), amount);
        return amount;
    }

    /** In use: checked in, or a started multi-day pass between visits. */
    private static boolean isInUse(Booking booking, OffsetDateTime now) {
        return booking.getStatus() == BookingStatus.CHECKED_IN
                || (booking.getStatus() == BookingStatus.CONFIRMED
                    && !now.isBefore(booking.getStartAt()) && now.isBefore(booking.getEndAt()));
    }

    /** The rental share for the time left in the booking, rounded down to 1.000đ. */
    private static long unusedShare(Booking booking, long rental, OffsetDateTime now) {
        long booked = Duration.between(booking.getStartAt(), booking.getEndAt()).getSeconds();
        OffsetDateTime from = now.isAfter(booking.getStartAt()) ? now : booking.getStartAt();
        long left = Math.max(0, Duration.between(from, booking.getEndAt()).getSeconds());
        if (booked <= 0) return 0;
        long share = (long) Math.floor((double) rental * left / booked);
        return share / 1000 * 1000; // whole thousands of đồng, rounded down

    }

    /** Refunds already owed or paid on the booking (paid = refundable + this). */
    private long refundRepositoryAmount(UUID bookingId) {
        return refundService.refundedOrOwed(bookingId);
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

    /**
     * The policy share of the rental plus the add-ons already paid (never consumed, so returned in
     * full), never more than the customer actually paid. Amounts are after unpaid add-ons are dropped.
     */
    static long refundAmountFor(BookingStatus status, long totalAmount, long addonAmount, int refundPercent, long refundable) {
        long paidAddons = status == BookingStatus.CONFIRMED ? addonAmount : 0;
        long rentalAmount = Math.max(0, totalAmount - addonAmount);
        return Math.min((rentalAmount * refundPercent) / 100L + paidAddons, refundable);
    }

    /** What cancelling now would give back, shown to the customer before they confirm. */
    public record CustomerCancelPreview(String bookingCode, boolean cancellable, String message, long paid,
                                        int refundPercent, String policyName, long refundAmount, long penaltyAmount) {
    }

    @Transactional(readOnly = true)
    public CustomerCancelPreview previewCustomerCancellation(UUID userId, UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thông tin đặt chỗ."));
        if (!booking.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Bạn không có quyền hủy đặt chỗ này.");
        }
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        if (booking.getStatus() == BookingStatus.PENDING_PAYMENT) {
            return new CustomerCancelPreview(booking.getBookingCode(), true,
                    "Đơn chưa được thanh toán nên bạn không mất phí. Chỗ được trả lại ngay khi bạn xác nhận.",
                    0, 0, null, 0, 0);
        }
        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            return new CustomerCancelPreview(booking.getBookingCode(), false,
                    "Đơn ở trạng thái " + BookingStateMachine.label(booking.getStatus()) + " không thể hủy.", 0, 0, null, 0, 0);
        }
        if (!now.isBefore(booking.getStartAt())) {
            return new CustomerCancelPreview(booking.getBookingCode(), false,
                    "Đơn đã đến giờ sử dụng nên không thể hủy trực tuyến. Vui lòng liên hệ quầy lễ tân.", 0, 0, null, 0, 0);
        }
        RefundOutcome outcome = resolveRefundPercent(booking, now);
        long unpaid = bookingAddonService.unpaidAmount(bookingId);
        long total = Math.max(0, booking.getTotalAmount() - unpaid);
        long addons = Math.max(0, booking.getAddonAmount() - unpaid);
        long refundable = refundService.refundableAmount(bookingId);
        long refund = refundAmountFor(booking.getStatus(), total, addons, outcome.refundPercent(), refundable);
        Object policy = outcome.appliedRule().get("policy_name");
        return new CustomerCancelPreview(booking.getBookingCode(), true, null, refundable, outcome.refundPercent(),
                "DEFAULT_NO_REFUND".equals(policy) ? "Không có chính sách hoàn tiền phù hợp" : (String) policy,
                refund, Math.max(0, total - refund));
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
        long refundAmount = refundAmountFor(booking.getStatus(), totalAmount, booking.getAddonAmount(), refundPercent,
                refundService.refundableAmount(bookingId));
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

        // A cancellation made at the counter keeps the reason it was given, so whoever pays the refund
        // (and the counter answering the customer) sees why, not just the percentage.
        boolean byStaff = actorId != null && !actorId.equals(booking.getUserId());
        refundService.requestRefund(booking, null, refundAmount, Refund.REASON_CANCELLATION,
                byStaff
                        ? "Quầy hủy đơn (hoàn " + refundPercent + "%): " + cancelReason
                        : "Hủy đơn theo chính sách (" + refundPercent + "%).");

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

        if (actorId != null && actorId.equals(booking.getUserId())) {
            audit(actorId, "CANCEL_BOOKING", "bookings", booking.getId(), AuditLogService.values(
                    "bookingCode", booking.getBookingCode(), "reason", cancelReason,
                    "refundPercent", refundPercent, "refundAmount", refundAmount));
        }
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
