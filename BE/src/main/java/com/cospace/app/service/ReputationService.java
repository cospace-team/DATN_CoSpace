package com.cospace.app.service;

import com.cospace.app.dto.api.ReputationDto.EventResponse;
import com.cospace.app.dto.api.ReputationDto.MyReputationResponse;
import com.cospace.app.entity.Booking;
import com.cospace.app.entity.BookingStatus;
import com.cospace.app.entity.ReputationEvent;
import com.cospace.app.entity.User;
import com.cospace.app.repository.BookingRepository;
import com.cospace.app.repository.ReputationEventRepository;
import com.cospace.app.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Customer reputation score (điểm uy tín). Every account starts at {@link #MAX_SCORE}:
 * <ul>
 *   <li>not checking in within {@code checkin-deadline-minutes} of the booked start costs
 *       {@code missed-checkin-penalty} points, once per booking;</li>
 *   <li>checking in on time earns {@code on-time-checkin-reward} points back, once per booking;</li>
 *   <li>staff can revert a penalty given by mistake (e.g. the guest came but was never checked in);</li>
 *   <li>a low score restricts online booking: below {@code limited-below} only one upcoming booking
 *       at a time, below {@code blocked-below} none at all (the counter can still book for them).</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReputationService {

    public static final int MAX_SCORE = 100;
    public static final int MIN_SCORE = 0;

    /** Bookings that still hold a seat in the future, counted against the limited-score cap. */
    private static final List<BookingStatus> UPCOMING_STATUSES = List.of(
            BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN);

    private final ReputationEventRepository reputationEventRepository;
    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

    @Value("${app.reputation.checkin-deadline-minutes:30}")
    private long checkinDeadlineMinutes = 30;

    @Value("${app.reputation.missed-checkin-penalty:10}")
    private int missedCheckinPenalty = 10;

    @Value("${app.reputation.on-time-checkin-reward:2}")
    private int onTimeCheckinReward = 2;

    @Value("${app.reputation.limited-below:50}")
    private int limitedBelow = 50;

    @Value("${app.reputation.blocked-below:30}")
    private int blockedBelow = 30;

    public long checkinDeadlineMinutes() {
        return checkinDeadlineMinutes;
    }

    /** The latest moment a check-in still counts as on time. */
    public OffsetDateTime checkinDeadline(Booking booking) {
        return booking.getStartAt().plusMinutes(checkinDeadlineMinutes);
    }

    /* ─────────────── Penalty / reward ─────────────── */

    /**
     * Deducts the missed check-in penalty for this booking unless it was already applied. The caller
     * must hold the booking's row lock, which makes the exists-check and the insert race-free.
     *
     * @return true if points were deducted
     */
    @Transactional
    public boolean penalizeMissedCheckin(Booking booking) {
        return penalizeMissedCheckin(booking, false);
    }

    /**
     * As {@link #penalizeMissedCheckin(Booking)}. With {@code bookingEnded}, the booking has just been
     * closed as a no-show, and the one notification sent says so as well, instead of the customer
     * getting a "missed booking" and a "points deducted" message for the same booking.
     */
    @Transactional
    public boolean penalizeMissedCheckin(Booking booking, boolean bookingEnded) {
        if (missedCheckinPenalty <= 0 || hasMissedCheckinPenalty(booking.getId())) {
            return false;
        }
        User user = lockCustomer(booking.getUserId());
        if (user == null) {
            return false;
        }

        int before = user.getReputationScore();
        int after = applyDelta(user, -missedCheckinPenalty, booking.getId(), ReputationEvent.REASON_MISSED_CHECKIN,
                "Không check-in trong " + checkinDeadlineMinutes + " phút sau giờ bắt đầu đơn " + booking.getBookingCode());

        String penalty = "bạn bị trừ " + (before - after) + " điểm uy tín. "
                + "Điểm uy tín hiện tại: " + after + "/" + MAX_SCORE + "."
                + restrictionHint(after);
        String title;
        String body;
        if (bookingEnded) {
            title = "Bạn đã bỏ lỡ lượt đặt chỗ";
            body = "Đơn " + booking.getBookingCode() + " đã kết thúc mà không có lượt check-in nào nên " + penalty
                    + " Theo chính sách, đơn không đến sẽ không được hoàn tiền.";
        } else {
            title = "Bạn bị trừ điểm uy tín";
            body = "Đơn " + booking.getBookingCode() + " không được check-in trong vòng " + checkinDeadlineMinutes
                    + " phút sau giờ bắt đầu nên " + penalty
                    + " Nếu đơn kết thúc mà bạn không đến, đơn sẽ không được hoàn tiền.";
        }
        notificationService.createNotification(user.getId(), title,
                body + " Nếu bạn đã đến nhưng chưa được check-in, vui lòng liên hệ quầy để được hoàn điểm.",
                "REPUTATION", booking.getId(), "BOOKING");
        log.info("Reputation of user {} lowered {} -> {} for missed check-in on {}",
                user.getId(), before, after, booking.getBookingCode());
        return true;
    }

    /** Whether this booking has already cost its customer the missed check-in penalty (and its notification). */
    public boolean hasMissedCheckinPenalty(UUID bookingId) {
        return reputationEventRepository.existsByBookingIdAndReason(bookingId, ReputationEvent.REASON_MISSED_CHECKIN);
    }

    /**
     * Gives back a few points when a booking is checked in on time, once per booking (a multi-day
     * pass is rewarded for its first visit only). Bookings already penalised earn nothing.
     *
     * @return true if points were added
     */
    @Transactional
    public boolean rewardOnTimeCheckin(Booking booking, OffsetDateTime checkinAt) {
        if (onTimeCheckinReward <= 0 || checkinAt.isAfter(checkinDeadline(booking))
                || reputationEventRepository.existsByBookingIdAndReason(booking.getId(), ReputationEvent.REASON_MISSED_CHECKIN)
                || reputationEventRepository.existsByBookingIdAndReason(booking.getId(), ReputationEvent.REASON_ON_TIME_CHECKIN)) {
            return false;
        }
        User user = lockCustomer(booking.getUserId());
        if (user == null || user.getReputationScore() >= MAX_SCORE) {
            return false; // nothing to earn back
        }
        applyDelta(user, onTimeCheckinReward, booking.getId(), ReputationEvent.REASON_ON_TIME_CHECKIN,
                "Check-in đúng giờ đơn " + booking.getBookingCode());
        return true;
    }

    /**
     * Reverts the missed check-in penalty of a booking, e.g. when the guest did come but staff never
     * checked them in. The points come back once; the revert is audited.
     *
     * @return the customer whose points came back
     */
    @Transactional
    public UUID revertMissedCheckinPenalty(UUID staffId, UUID bookingId, String reason) {
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("Vui lòng nhập lý do hoàn điểm.");
        }
        Booking booking = bookingRepository.findByIdWithLock(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn đặt chỗ."));
        ReputationEvent penalty = reputationEventRepository
                .findByBookingIdAndReason(bookingId, ReputationEvent.REASON_MISSED_CHECKIN)
                .orElseThrow(() -> new IllegalStateException("Đơn " + booking.getBookingCode() + " không bị trừ điểm uy tín."));
        if (reputationEventRepository.existsByBookingIdAndReason(bookingId, ReputationEvent.REASON_PENALTY_REVERTED)) {
            throw new IllegalStateException("Điểm phạt của đơn " + booking.getBookingCode() + " đã được hoàn trước đó.");
        }
        User user = userRepository.findByIdWithLock(penalty.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy khách hàng."));

        int before = user.getReputationScore();
        String note = "Hoàn điểm phạt đơn " + booking.getBookingCode() + ": " + reason.trim();
        int after = applyDelta(user, -penalty.getDelta(), bookingId, ReputationEvent.REASON_PENALTY_REVERTED,
                note.length() > 255 ? note.substring(0, 255) : note);

        auditLogService.log(staffId, "REPUTATION_PENALTY_REVERTED", "users", user.getId(),
                Map.of("reputationScore", before, "bookingCode", booking.getBookingCode()),
                Map.of("reputationScore", after, "reason", reason.trim()),
                null, null);
        notificationService.createNotification(user.getId(),
                "Bạn được hoàn điểm uy tín",
                "Điểm phạt của đơn " + booking.getBookingCode() + " đã được hoàn lại. "
                        + "Điểm uy tín hiện tại: " + after + "/" + MAX_SCORE + ".",
                "REPUTATION", bookingId, "BOOKING");
        return user.getId();
    }

    @Transactional(readOnly = true)
    public UUID bookingBranchId(UUID bookingId) {
        return bookingRepository.findById(bookingId)
                .map(Booking::getBranchId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn đặt chỗ."));
    }

    /* ─────────────── Booking restrictions ─────────────── */

    /**
     * Refuses an online booking a low score does not allow. Called inside the booking transaction,
     * after the per-user advisory lock, so two concurrent requests cannot both pass the cap.
     */
    @Transactional(readOnly = true)
    public void requireCanBookOnline(UUID userId) {
        requireCanBookOnline(userId, 1);
    }

    /**
     * Same as {@link #requireCanBookOnline(UUID)} for a request of several seats at once: a limited
     * score may hold one unused seat, so it cannot book a group of more than one either.
     */
    @Transactional(readOnly = true)
    public void requireCanBookOnline(UUID userId, int seatCount) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null || user.getRole() != User.Role.customer) {
            return;
        }
        int score = user.getReputationScore();
        if (score < blockedBelow) {
            throw new IllegalStateException("Điểm uy tín của bạn (" + score + "/" + MAX_SCORE + ") dưới " + blockedBelow
                    + " nên tạm thời không thể đặt chỗ online. Vui lòng đặt trực tiếp tại quầy.");
        }
        if (score < limitedBelow && seatCount > 1) {
            throw new IllegalStateException("Điểm uy tín của bạn (" + score + "/" + MAX_SCORE + ") dưới " + limitedBelow
                    + " nên mỗi lần chỉ được đặt 1 chỗ.");
        }
        if (score < limitedBelow && bookingRepository.countByUserIdAndStatusIn(userId, UPCOMING_STATUSES) >= 1) {
            throw new IllegalStateException("Điểm uy tín của bạn (" + score + "/" + MAX_SCORE + ") dưới " + limitedBelow
                    + " nên chỉ được giữ 1 đơn chưa sử dụng tại một thời điểm. Vui lòng dùng hoặc hủy đơn hiện tại trước.");
        }
    }

    /* ─────────────── Read ─────────────── */

    @Transactional(readOnly = true)
    public MyReputationResponse getReputation(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng."));
        int score = user.getReputationScore();
        List<ReputationEvent> events = reputationEventRepository.findTop20ByUserIdOrderByCreatedAtDesc(userId);
        return MyReputationResponse.builder()
                .userId(userId)
                .fullName(user.getFullName())
                .score(score)
                .maxScore(MAX_SCORE)
                .checkinDeadlineMinutes(checkinDeadlineMinutes)
                .missedCheckinPenalty(missedCheckinPenalty)
                .onTimeCheckinReward(onTimeCheckinReward)
                .limitedBelow(limitedBelow)
                .blockedBelow(blockedBelow)
                .restriction(score < blockedBelow ? "blocked" : score < limitedBelow ? "limited" : "none")
                .missedCheckinCount(reputationEventRepository.countByUserIdAndReason(userId, ReputationEvent.REASON_MISSED_CHECKIN))
                .recentEvents(events.stream().map(e -> EventResponse.builder()
                        .id(e.getId())
                        .bookingId(e.getBookingId())
                        .reason(e.getReason())
                        .delta(e.getDelta())
                        .scoreAfter(e.getScoreAfter())
                        .note(e.getNote())
                        .createdAt(e.getCreatedAt())
                        .reverted(ReputationEvent.REASON_MISSED_CHECKIN.equals(e.getReason()) && e.getBookingId() != null
                                && reputationEventRepository.existsByBookingIdAndReason(e.getBookingId(), ReputationEvent.REASON_PENALTY_REVERTED))
                        .build())
                        .toList())
                .build();
    }

    /* ─────────────── Internals ─────────────── */

    /** Locks the booking's owner, or null if it is not a customer (only customers carry a reputation). */
    private User lockCustomer(UUID userId) {
        User user = userRepository.findByIdWithLock(userId).orElse(null);
        return user != null && user.getRole() == User.Role.customer ? user : null;
    }

    /** Applies a signed change, clamped to [MIN_SCORE, MAX_SCORE], and logs it. Returns the new score. */
    private int applyDelta(User user, int delta, UUID bookingId, String reason, String note) {
        int before = user.getReputationScore();
        int after = Math.max(MIN_SCORE, Math.min(MAX_SCORE, before + delta));
        user.setReputationScore(after);
        userRepository.save(user);
        reputationEventRepository.save(ReputationEvent.builder()
                .userId(user.getId())
                .bookingId(bookingId)
                .reason(reason)
                .delta(after - before)
                .scoreAfter(after)
                .note(note)
                .build());
        return after;
    }

    private String restrictionHint(int score) {
        if (score < blockedBelow) {
            return " Với điểm dưới " + blockedBelow + ", bạn tạm thời không thể đặt chỗ online.";
        }
        if (score < limitedBelow) {
            return " Với điểm dưới " + limitedBelow + ", bạn chỉ được giữ 1 đơn chưa sử dụng tại một thời điểm.";
        }
        return "";
    }
}
