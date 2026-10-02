package com.cospace.app.service;

import com.cospace.app.dto.api.ReputationDto.EventResponse;
import com.cospace.app.dto.api.ReputationDto.MyReputationResponse;
import com.cospace.app.entity.Booking;
import com.cospace.app.entity.ReputationEvent;
import com.cospace.app.entity.User;
import com.cospace.app.repository.ReputationEventRepository;
import com.cospace.app.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Customer reputation score (điểm uy tín). Every account starts at {@link #MAX_SCORE}; a customer
 * who does not check in within {@code app.reputation.checkin-deadline-minutes} of the booked start
 * loses {@code app.reputation.missed-checkin-penalty} points, once per booking.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReputationService {

    public static final int MAX_SCORE = 100;
    public static final int MIN_SCORE = 0;

    private final ReputationEventRepository reputationEventRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Value("${app.reputation.checkin-deadline-minutes:30}")
    private long checkinDeadlineMinutes = 30;

    @Value("${app.reputation.missed-checkin-penalty:10}")
    private int missedCheckinPenalty = 10;

    public long checkinDeadlineMinutes() {
        return checkinDeadlineMinutes;
    }

    /**
     * Deducts the missed check-in penalty for this booking unless it was already applied. The caller
     * must hold the booking's row lock, which makes the exists-check and the insert race-free.
     *
     * @return true if points were deducted
     */
    @Transactional
    public boolean penalizeMissedCheckin(Booking booking) {
        if (missedCheckinPenalty <= 0
                || reputationEventRepository.existsByBookingIdAndReason(booking.getId(), ReputationEvent.REASON_MISSED_CHECKIN)) {
            return false;
        }
        User user = userRepository.findByIdWithLock(booking.getUserId()).orElse(null);
        if (user == null || user.getRole() != User.Role.customer) {
            return false; // only customers carry a reputation
        }

        int before = user.getReputationScore();
        int after = Math.max(MIN_SCORE, before - missedCheckinPenalty);
        user.setReputationScore(after);
        userRepository.save(user);

        reputationEventRepository.save(ReputationEvent.builder()
                .userId(user.getId())
                .bookingId(booking.getId())
                .reason(ReputationEvent.REASON_MISSED_CHECKIN)
                .delta(after - before)
                .scoreAfter(after)
                .note("Không check-in trong " + checkinDeadlineMinutes + " phút sau giờ bắt đầu đơn " + booking.getBookingCode())
                .build());

        notificationService.createNotification(user.getId(),
                "Bạn bị trừ điểm uy tín",
                "Đơn " + booking.getBookingCode() + " không được check-in trong vòng " + checkinDeadlineMinutes
                        + " phút sau giờ bắt đầu nên bạn bị trừ " + (before - after) + " điểm uy tín. "
                        + "Điểm uy tín hiện tại: " + after + "/" + MAX_SCORE + ".",
                "BOOKING", booking.getId(), "BOOKING");
        log.info("Reputation of user {} lowered {} -> {} for missed check-in on {}",
                user.getId(), before, after, booking.getBookingCode());
        return true;
    }

    @Transactional(readOnly = true)
    public MyReputationResponse getMyReputation(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng."));
        return MyReputationResponse.builder()
                .score(user.getReputationScore())
                .maxScore(MAX_SCORE)
                .checkinDeadlineMinutes(checkinDeadlineMinutes)
                .missedCheckinPenalty(missedCheckinPenalty)
                .recentEvents(reputationEventRepository.findTop20ByUserIdOrderByCreatedAtDesc(userId).stream()
                        .map(e -> EventResponse.builder()
                                .id(e.getId())
                                .bookingId(e.getBookingId())
                                .reason(e.getReason())
                                .delta(e.getDelta())
                                .scoreAfter(e.getScoreAfter())
                                .note(e.getNote())
                                .createdAt(e.getCreatedAt())
                                .build())
                        .toList())
                .build();
    }
}
