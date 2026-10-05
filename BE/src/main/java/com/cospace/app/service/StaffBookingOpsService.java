package com.cospace.app.service;

import com.cospace.app.entity.Booking;
import com.cospace.app.entity.BookingSource;
import com.cospace.app.entity.BookingStatus;
import com.cospace.app.entity.MaintenanceStatus;
import com.cospace.app.entity.WorkspaceEntity;
import com.cospace.app.repository.BookingRepository;
import com.cospace.app.repository.CheckinLogRepository;
import com.cospace.app.repository.WorkspaceEntityRepository;
import com.cospace.app.repository.WorkspaceMaintenanceRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;

/**
 * Counter operations on a customer's booking that the automatic lifecycle does not cover: marking a
 * guest who did not come as a no-show (and undoing it), and moving a booking to another seat or
 * start time. Each runs under the booking's row lock, so it cannot race a check-in or the schedulers.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StaffBookingOpsService {

    private static final List<BookingStatus> ACTIVE =
            List.of(BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN);
    private static final List<MaintenanceStatus> ACTIVE_MAINTENANCE =
            List.of(MaintenanceStatus.active, MaintenanceStatus.in_progress, MaintenanceStatus.scheduled);

    private final BookingRepository bookingRepository;
    private final CheckinLogRepository checkinLogRepository;
    private final WorkspaceEntityRepository workspaceEntityRepository;
    private final WorkspaceMaintenanceRepository workspaceMaintenanceRepository;
    private final BookingService bookingService;
    private final BookingAddonService bookingAddonService;
    private final ReputationService reputationService;
    private final NotificationService notificationService;
    private final PricingService pricingService;
    private final EntityManager entityManager;

    /** Branch a booking belongs to, for the caller's access check. */
    @Transactional(readOnly = true)
    public UUID branchOf(UUID bookingId) {
        return bookingRepository.findById(bookingId)
                .map(Booking::getBranchId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn đặt chỗ."));
    }

    /* ─────────────── No-show ─────────────── */

    /**
     * Closes a paid booking whose guest never came, once the check-in deadline has passed, instead of
     * letting the seat sit blocked until the booked end. The payment is kept (as with an automatic
     * no-show) and the customer's reputation is docked unless it already was.
     */
    @Transactional
    public Booking markNoShow(UUID staffId, UUID bookingId, String reason) {
        requireReason(reason);
        Booking booking = lockBooking(bookingId);
        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new IllegalStateException("Chỉ đánh dấu không đến được với đơn đã xác nhận (hiện: "
                    + BookingStateMachine.label(booking.getStatus()) + ").");
        }
        if (BookingExtensionService.isMultiDayPass(booking)) {
            throw new IllegalStateException("Gói nhiều ngày không đánh dấu không đến được: khách có thể đến bất kỳ ngày nào, "
                    + "hệ thống tự đóng khi gói hết hạn.");
        }
        if (checkinLogRepository.existsByBookingId(bookingId)) {
            throw new IllegalStateException("Khách của đơn " + booking.getBookingCode() + " đã check-in, không thể đánh dấu không đến.");
        }
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        if (now.isBefore(reputationService.checkinDeadline(booking))) {
            throw new IllegalStateException("Chưa quá hạn check-in (" + reputationService.checkinDeadlineMinutes()
                    + " phút sau giờ bắt đầu). Hãy chờ thêm hoặc check-in cho khách khi họ đến.");
        }

        BookingStateMachine.transition(booking, BookingStatus.NO_SHOW);
        bookingAddonService.voidUnpaid(booking, staffId); // nothing was served to a guest who never came
        bookingRepository.save(booking);

        boolean notifiedEarlier = reputationService.hasMissedCheckinPenalty(booking.getId());
        boolean penalizedNow = !notifiedEarlier && reputationService.penalizeMissedCheckin(booking, true);
        if (!notifiedEarlier && !penalizedNow) {
            notificationService.createNotification(booking.getUserId(),
                    "Bạn đã bỏ lỡ lượt đặt chỗ",
                    "Đơn " + booking.getBookingCode() + " được quầy ghi nhận là không đến. "
                            + "Theo chính sách, đơn không đến sẽ không được hoàn tiền. "
                            + "Nếu bạn đã đến, vui lòng liên hệ quầy để được hỗ trợ.",
                    "BOOKING", booking.getId(), "BOOKING");
        }
        log.info("Booking {} marked as no-show by staff {}", booking.getBookingCode(), staffId);
        return booking;
    }

    /**
     * Reopens a no-show while the booked time has not run out, e.g. the guest did come but nobody
     * checked them in. The seat must still be free; the missed check-in penalty is given back.
     */
    @Transactional
    public Booking undoNoShow(UUID staffId, UUID bookingId, String reason) {
        requireReason(reason);
        Booking booking = lockBooking(bookingId);
        if (booking.getStatus() != BookingStatus.NO_SHOW) {
            throw new IllegalStateException("Đơn " + booking.getBookingCode() + " không ở trạng thái không đến (hiện: "
                    + BookingStateMachine.label(booking.getStatus()) + ").");
        }
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        if (!booking.getEndAt().isAfter(now)) {
            throw new IllegalStateException("Đơn đã quá giờ kết thúc nên không thể khôi phục. "
                    + "Nếu khách có đến, bạn vẫn có thể hoàn lại điểm uy tín cho khách.");
        }
        lockWorkspaces(booking.getWorkspaceId());
        requireSeatFree(booking.getWorkspaceId(), booking.getId(), booking.getStartAt(), booking.getEndAt(), now);

        BookingStateMachine.transition(booking, BookingStatus.CONFIRMED);
        bookingRepository.save(booking);
        giveBackMissedCheckinPoints(staffId, booking, "Khôi phục đơn không đến: " + reason.trim());

        notificationService.createNotification(booking.getUserId(),
                "Đơn đặt chỗ được khôi phục",
                "Đơn " + booking.getBookingCode() + " đã được quầy khôi phục, bạn có thể check-in như bình thường.",
                "BOOKING", booking.getId(), "BOOKING");
        log.info("No-show of booking {} undone by staff {}", booking.getBookingCode(), staffId);
        return booking;
    }

    /* ─────────────── Move ─────────────── */

    /**
     * Moves a paid booking to another seat of the branch and/or another start time, for instance a
     * room that broke down mid-session. The length stays, so the price stays: the new seat must hold
     * at least as many people and cost the same per unit.
     */
    @Transactional
    public MoveResult moveBooking(UUID staffId, UUID bookingId, UUID newWorkspaceId, OffsetDateTime newStartAt, String reason) {
        requireReason(reason);
        if (newWorkspaceId == null && newStartAt == null) {
            throw new IllegalArgumentException("Hãy chọn chỗ mới hoặc giờ bắt đầu mới.");
        }
        Booking booking = lockBooking(bookingId);
        if (booking.getStatus() != BookingStatus.CONFIRMED && booking.getStatus() != BookingStatus.CHECKED_IN) {
            throw new IllegalStateException("Chỉ đổi được đơn đã xác nhận hoặc đang sử dụng (hiện: "
                    + BookingStateMachine.label(booking.getStatus()) + ").");
        }
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        UUID oldWorkspaceId = booking.getWorkspaceId();
        OffsetDateTime oldStart = booking.getStartAt();
        OffsetDateTime oldEnd = booking.getEndAt();

        UUID targetWorkspaceId = newWorkspaceId != null ? newWorkspaceId : oldWorkspaceId;
        boolean changesSeat = !targetWorkspaceId.equals(oldWorkspaceId);
        boolean changesTime = newStartAt != null && !newStartAt.toInstant().equals(oldStart.toInstant());
        if (!changesSeat && !changesTime) {
            throw new IllegalArgumentException("Chỗ và giờ mới trùng với đơn hiện tại.");
        }

        OffsetDateTime targetStart = oldStart;
        OffsetDateTime targetEnd = oldEnd;
        if (changesTime) {
            if (booking.getStatus() == BookingStatus.CHECKED_IN || checkinLogRepository.existsByBookingId(bookingId)) {
                throw new IllegalStateException("Khách đã check-in nên không đổi giờ được. "
                        + "Hãy kết thúc sớm đơn này và tạo đơn mới nếu cần.");
            }
            if (BookingExtensionService.isMultiDayPass(booking)) {
                throw new IllegalStateException("Gói nhiều ngày không đổi giờ ở quầy.");
            }
            targetStart = newStartAt.withOffsetSameInstant(ZoneOffset.UTC);
            targetEnd = targetStart.plus(Duration.between(oldStart, oldEnd));
            bookingService.validateSchedule(booking.getBranchId(), booking.getUnit(), targetStart, targetEnd, now);
        }

        WorkspaceEntity target = workspaceEntityRepository.findById(targetWorkspaceId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chỗ ngồi mới."));
        WorkspaceEntity current = workspaceEntityRepository.findById(oldWorkspaceId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chỗ ngồi hiện tại."));
        String targetTypeId = target.getWorkspaceTypeId() != null ? target.getWorkspaceTypeId().toString() : booking.getWorkspaceTypeId();
        if (changesSeat) {
            if (!booking.getBranchId().equals(bookingService.resolveBranchIdForWorkspace(targetWorkspaceId))) {
                throw new IllegalArgumentException("Chỉ đổi sang chỗ trong cùng chi nhánh.");
            }
            if (target.getStatus() != WorkspaceEntity.Status.active) {
                throw new IllegalArgumentException("Chỗ \"" + target.getName() + "\" đang bảo trì hoặc ngừng hoạt động.");
            }
            if (target.getCapacity() < current.getCapacity()) {
                throw new IllegalArgumentException("Chỗ \"" + target.getName() + "\" nhỏ hơn chỗ hiện tại ("
                        + target.getCapacity() + " < " + current.getCapacity() + " chỗ), không đủ cho khách.");
            }
            if (!targetTypeId.equals(booking.getWorkspaceTypeId())) {
                long newPrice = pricingService.getUnitPriceVnd(booking.getBranchId(), targetTypeId, booking.getUnit().name());
                if (newPrice != booking.getPricePerUnit()) {
                    throw new IllegalArgumentException("Chỗ \"" + target.getName()
                            + "\" khác loại và khác giá với đơn hiện tại. Chỉ đổi sang chỗ cùng loại hoặc cùng mức giá; "
                            + "nếu không, hãy hủy đơn và hoàn tiền.");
                }
            }
        }

        lockWorkspaces(oldWorkspaceId, targetWorkspaceId);
        requireSeatFree(targetWorkspaceId, bookingId, targetStart, targetEnd, now);

        booking.setWorkspaceId(targetWorkspaceId);
        booking.setWorkspaceTypeId(targetTypeId);
        booking.setStartAt(targetStart);
        booking.setEndAt(targetEnd);
        bookingRepository.save(booking);
        entityManager.flush();

        if (changesTime) {
            giveBackMissedCheckinPoints(staffId, booking, "Đổi giờ đơn: " + reason.trim());
        }

        notificationService.createNotification(booking.getUserId(),
                changesSeat ? "Đơn đặt chỗ được chuyển chỗ" : "Đơn đặt chỗ được đổi giờ",
                "Đơn " + booking.getBookingCode() + " đã được quầy "
                        + (changesSeat ? "chuyển sang \"" + target.getName() + "\"" : "đổi giờ")
                        + (changesTime ? " , bắt đầu lúc " + targetStart.atZoneSameInstant(BookingService.BUSINESS_ZONE).toLocalDateTime().toString().replace('T', ' ') : "")
                        + ". Lý do: " + reason.trim(),
                "BOOKING", booking.getId(), "BOOKING");
        log.info("Booking {} moved by staff {}: {} {}-{} -> {} {}-{}", booking.getBookingCode(), staffId,
                oldWorkspaceId, oldStart, oldEnd, targetWorkspaceId, targetStart, targetEnd);
        return new MoveResult(booking, oldWorkspaceId, oldStart, oldEnd, current.getName(), target.getName());
    }

    public record MoveResult(Booking booking, UUID fromWorkspaceId, OffsetDateTime fromStart, OffsetDateTime fromEnd,
                             String fromWorkspaceName, String toWorkspaceName) {
        public Map<String, Object> oldValues() {
            return AuditLogService.values("workspaceId", fromWorkspaceId, "workspaceName", fromWorkspaceName,
                    "startAt", fromStart, "endAt", fromEnd);
        }
    }

    /* ─────────────── helpers ─────────────── */

    private static void requireReason(String reason) {
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("Vui lòng nhập lý do.");
        }
    }

    private Booking lockBooking(UUID bookingId) {
        return bookingRepository.findByIdWithLock(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn đặt chỗ."));
    }

    /** Same advisory lock as booking creation, taken in a fixed order so two moves cannot deadlock. */
    private void lockWorkspaces(UUID... workspaceIds) {
        Stream.of(workspaceIds).map(UUID::toString).distinct().sorted(Comparator.naturalOrder()).forEach(id ->
                entityManager.createNativeQuery("SELECT pg_advisory_xact_lock(hashtext(:key))")
                        .setParameter("key", "booking:" + id)
                        .getSingleResult());
    }

    /** The seat has no other booking, maintenance or overstaying guest in [start, end). */
    private void requireSeatFree(UUID workspaceId, UUID ignoreBookingId, OffsetDateTime start, OffsetDateTime end, OffsetDateTime now) {
        boolean taken = bookingRepository.findOverlappingBookings(workspaceId, start, end, ACTIVE).stream()
                .anyMatch(b -> !b.getId().equals(ignoreBookingId)
                        && !(BookingExpiryService.isExpiredHold(b, now)));
        if (taken) {
            throw new IllegalArgumentException("Chỗ này đã có người đặt trong khoảng thời gian đó.");
        }
        if (!workspaceMaintenanceRepository.findOverlappingMaintenances(
                workspaceId, start.toZonedDateTime(), end.toZonedDateTime(), ACTIVE_MAINTENANCE).isEmpty()) {
            throw new IllegalArgumentException("Chỗ này đang được bảo trì trong khoảng thời gian đó.");
        }
        if (!bookingRepository.findOtherGuestsInside(workspaceId, ignoreBookingId).isEmpty()) {
            throw new IllegalArgumentException("Chỗ này vẫn đang có khách ngồi. Hãy check-out khách đó trước hoặc chọn chỗ khác.");
        }
        bookingService.requireNotOccupiedByOverstayingGuest(workspaceId, start, now, BookingSource.counter);
    }

    /** Returns the missed check-in penalty of the booking, if it cost any and was not given back already. */
    private void giveBackMissedCheckinPoints(UUID staffId, Booking booking, String reason) {
        if (!reputationService.hasMissedCheckinPenalty(booking.getId())
                || reputationService.hasRevertedMissedCheckinPenalty(booking.getId())) {
            return;
        }
        reputationService.revertMissedCheckinPenalty(staffId, booking.getId(),
                reason.length() > 200 ? reason.substring(0, 200) : reason);
    }
}
