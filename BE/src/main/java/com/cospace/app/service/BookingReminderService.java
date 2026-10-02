package com.cospace.app.service;

import com.cospace.app.entity.Booking;
import com.cospace.app.entity.BookingStatus;
import com.cospace.app.repository.BookingRepository;
import com.cospace.app.repository.CheckinLogRepository;
import com.cospace.app.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * Reminds customers of their bookings: once ahead of the start, and once more at the start while the
 * check-in window is open, so nobody loses reputation points simply for forgetting. Each reminder is
 * sent at most once per booking (the notification itself is the record).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BookingReminderService {

    public static final String TYPE_UPCOMING = "BOOKING_REMINDER";
    public static final String TYPE_CHECKIN = "CHECKIN_REMINDER";

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm dd/MM");

    private final BookingRepository bookingRepository;
    private final CheckinLogRepository checkinLogRepository;
    private final NotificationRepository notificationRepository;
    private final NotificationService notificationService;
    private final ReputationService reputationService;

    @Value("${app.reputation.reminder-before-minutes:60}")
    private long reminderBeforeMinutes = 60;

    public long reminderBeforeMinutes() {
        return reminderBeforeMinutes;
    }

    /** "Your booking starts at …" — for a CONFIRMED booking starting within the reminder window. */
    @Transactional
    public boolean remindUpcoming(UUID bookingId, OffsetDateTime now) {
        Booking b = bookingRepository.findById(bookingId).orElse(null);
        if (b == null || b.getStatus() != BookingStatus.CONFIRMED || !b.getStartAt().isAfter(now)
                || b.getStartAt().isAfter(now.plusMinutes(reminderBeforeMinutes))
                || notificationRepository.existsByReferenceIdAndType(bookingId, TYPE_UPCOMING)) {
            return false;
        }
        String deadlineHint = BookingExtensionService.isMultiDayPass(b) ? ""
                : " Vui lòng check-in tại quầy trước " + local(reputationService.checkinDeadline(b))
                + " để không bị trừ điểm uy tín.";
        notificationService.createNotification(b.getUserId(),
                "Sắp đến giờ đặt chỗ",
                "Đơn " + b.getBookingCode() + " bắt đầu lúc " + local(b.getStartAt()) + "." + deadlineHint,
                TYPE_UPCOMING, b.getId(), "BOOKING");
        return true;
    }

    /** "Check in before …" — for a started, not yet checked-in booking still inside the window. */
    @Transactional
    public boolean remindCheckin(UUID bookingId, OffsetDateTime now) {
        Booking b = bookingRepository.findById(bookingId).orElse(null);
        if (b == null || b.getStatus() != BookingStatus.CONFIRMED || BookingExtensionService.isMultiDayPass(b)
                || b.getStartAt().isAfter(now) || !reputationService.checkinDeadline(b).isAfter(now)
                || checkinLogRepository.existsByBookingId(bookingId)
                || notificationRepository.existsByReferenceIdAndType(bookingId, TYPE_CHECKIN)) {
            return false;
        }
        long minutesLeft = Math.max(1, java.time.Duration.between(now, reputationService.checkinDeadline(b)).toMinutes());
        notificationService.createNotification(b.getUserId(),
                "Đã đến giờ check-in",
                "Đơn " + b.getBookingCode() + " đã bắt đầu. Bạn còn khoảng " + minutesLeft + " phút (đến "
                        + local(reputationService.checkinDeadline(b)) + ") để check-in, nếu không sẽ bị trừ điểm uy tín.",
                TYPE_CHECKIN, b.getId(), "BOOKING");
        return true;
    }

    private static String local(OffsetDateTime at) {
        return at.atZoneSameInstant(BookingService.BUSINESS_ZONE).format(TIME);
    }
}
