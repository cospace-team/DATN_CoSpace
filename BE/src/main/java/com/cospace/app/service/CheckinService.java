package com.cospace.app.service;

import com.cospace.app.dto.api.BookingWithDetailsDto;
import com.cospace.app.dto.api.CheckinLogDto;
import com.cospace.app.entity.Booking;
import com.cospace.app.entity.BookingStatus;
import com.cospace.app.entity.CheckinLog;
import com.cospace.app.repository.BookingRepository;
import com.cospace.app.repository.CheckinLogRepository;
import com.cospace.app.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class CheckinService {

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

    private final CheckinLogRepository checkinLogRepository;
    private final BookingRepository bookingRepository;
    private final BookingService bookingService;
    private final UserRepository userRepository;
    private final BookingAddonService bookingAddonService;
    private final BookingExtensionService bookingExtensionService;
    private final ReputationService reputationService;

    public CheckinService(CheckinLogRepository checkinLogRepository,
                          BookingRepository bookingRepository,
                          BookingService bookingService,
                          UserRepository userRepository,
                          BookingAddonService bookingAddonService,
                          BookingExtensionService bookingExtensionService,
                          ReputationService reputationService) {
        this.checkinLogRepository = checkinLogRepository;
        this.bookingRepository = bookingRepository;
        this.bookingService = bookingService;
        this.userRepository = userRepository;
        this.bookingAddonService = bookingAddonService;
        this.bookingExtensionService = bookingExtensionService;
        this.reputationService = reputationService;
    }

    @Transactional
    public CheckinLogDto checkin(UUID staffId, UUID bookingId, String note) {
        Booking booking = bookingRepository.findByIdWithLock(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thông tin đặt chỗ"));

        // 1. Validate branch matching if staff is bound to a specific branch
        if (staffId != null) {
            userRepository.findById(staffId).ifPresent(staff -> {
                if (staff.getBranchId() != null && !staff.getBranchId().equals(booking.getBranchId())) {
                    throw new IllegalArgumentException("Nhân viên không thuộc chi nhánh của vé đặt chỗ này.");
                }
            });
        }

        boolean isMultiDayPass = BookingExtensionService.isMultiDayPass(booking);

        // 2. Already checked in (checked first: a CHECKED_IN booking would otherwise be reported
        // by the status check below as "not paid or already finished", which misleads the counter)
        if (checkinLogRepository.existsByBookingIdAndCheckoutAtIsNull(bookingId)) {
            throw new IllegalArgumentException("Khách hàng này đã được Check-in và đang sử dụng không gian.");
        }

        // 3. Validate booking status
        if (!isMultiDayPass && booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new IllegalArgumentException("Vé chưa được thanh toán/xác nhận hoặc đã hoàn tất (Trạng thái: "
                    + BookingStateMachine.label(booking.getStatus()) + ").");
        }
        if (isMultiDayPass && booking.getStatus() != BookingStatus.CONFIRMED && booking.getStatus() != BookingStatus.CHECKED_IN) {
            throw new IllegalArgumentException("Gói đặt chỗ dài hạn chưa hợp lệ để Check-in (Trạng thái: "
                    + BookingStateMachine.label(booking.getStatus()) + ").");
        }

        // 4. Validate time window (Rule #9 & UC-CHK-01)
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        if (now.isBefore(booking.getStartAt().minusMinutes(30))) {
            throw new IllegalArgumentException("Chưa đến giờ Check-in. Hệ thống chỉ cho phép Check-in trước giờ bắt đầu tối đa 30 phút.");
        }
        // A multi-day pass is closed by the lifecycle job only every few minutes; until then it is
        // still CONFIRMED, so its end has to be enforced here as well.
        if (now.isAfter(booking.getEndAt())) {
            throw new IllegalArgumentException("Vé đặt chỗ đã quá hạn giờ kết thúc. Không thể Check-in.");
        }

        // 5. The seat must be empty: a previous guest who overstayed and was never checked out is
        // still sitting there, and checking someone else in would put two guests on one seat.
        List<Booking> inside = bookingRepository.findOtherGuestsInside(booking.getWorkspaceId(), bookingId);
        if (!inside.isEmpty()) {
            throw new IllegalArgumentException("Vị trí vẫn còn khách của đơn " + inside.get(0).getBookingCode()
                    + " chưa check-out. Hãy check-out khách đó trước khi nhận khách mới.");
        }

        CheckinLog checkinLog = CheckinLog.builder()
                .id(UUID.randomUUID())
                .bookingId(bookingId)
                .staffUserId(staffId != null ? staffId : booking.getUserId())
                .checkinAt(now)
                .note(note)
                .build();

        checkinLog = checkinLogRepository.save(checkinLog);

        // A multi-day pass may already be CHECKED_IN from an earlier day whose log was closed.
        if (booking.getStatus() != BookingStatus.CHECKED_IN) {
            BookingStateMachine.transition(booking, BookingStatus.CHECKED_IN);
        }
        bookingRepository.save(booking);
        reputationService.rewardOnTimeCheckin(booking, now);
        audit(staffId, "CHECKIN", "bookings", booking.getId(), AuditLogService.values(
                "bookingCode", booking.getBookingCode(), "workspaceId", booking.getWorkspaceId()));

        return toDto(checkinLog);
    }

    /** Branch a check-in belongs to, for the caller's access check. */
    @Transactional(readOnly = true)
    public UUID branchOfCheckin(UUID checkinId) {
        CheckinLog checkinLog = checkinLogRepository.findById(checkinId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy lượt Check-in"));
        return bookingRepository.findById(checkinLog.getBookingId())
                .map(Booking::getBranchId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thông tin đặt chỗ"));
    }

    @Transactional
    public CheckinLogDto checkout(UUID staffId, UUID checkinId, String note) {
        CheckinLog checkinLog = checkinLogRepository.findById(checkinId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy lượt Check-in"));

        if (checkinLog.getCheckoutAt() != null) {
            throw new IllegalArgumentException("Lượt Check-in này đã được giải phóng (Check-out) trước đó.");
        }

        Booking booking = bookingRepository.findByIdWithLock(checkinLog.getBookingId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thông tin đặt chỗ"));
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        if (bookingExtensionService.isLateFeePending(booking, now)) {
            throw new IllegalStateException("Khách trả chỗ muộn hơn giờ kết thúc. Vui lòng tính phụ phí check-out muộn "
                    + "(hoặc tính rồi hủy để miễn phí) trước khi check-out.");
        }

        long owed = bookingAddonService.unpaidAmount(checkinLog.getBookingId());
        if (owed > 0) {
            throw new IllegalStateException("Khách còn " + RefundService.vnd(owed)
                    + " tiền dịch vụ / phụ phí chưa thanh toán. Vui lòng thu tiền (tiền mặt hoặc QR) trước khi check-out.");
        }

        checkinLog.setCheckoutAt(now);

        if (note != null && !note.isBlank()) {
            String currentNote = checkinLog.getNote();
            checkinLog.setNote(currentNote != null && !currentNote.isBlank() ? currentNote + " | Checkout: " + note : "Checkout: " + note);
        }
        checkinLog = checkinLogRepository.save(checkinLog);

        // Validate branch matching if staff is bound to a specific branch (same rule as checkin)
        if (staffId != null) {
            userRepository.findById(staffId).ifPresent(staff -> {
                if (staff.getBranchId() != null && !staff.getBranchId().equals(booking.getBranchId())) {
                    throw new IllegalArgumentException("Nhân viên không thuộc chi nhánh của vé đặt chỗ này.");
                }
            });
        }

        // Multi-day pass: if still within valid period, maintain status CONFIRMED for future days, do not truncate endAt
        boolean isMultiDayPass = BookingExtensionService.isMultiDayPass(booking);

        if (isMultiDayPass && now.isBefore(booking.getEndAt())) {
            if (booking.getStatus() != BookingStatus.CONFIRMED) {
                BookingStateMachine.transition(booking, BookingStatus.CONFIRMED);
            }
        } else {
            BookingStateMachine.transition(booking, BookingStatus.COMPLETED);
            // Early checkout: Truncate endAt to actual checkout time to immediately release the physical space
            if (now.isBefore(booking.getEndAt())) {
                booking.setEndAt(now);
            }
        }
        bookingRepository.save(booking);
        audit(staffId, "CHECKOUT", "bookings", booking.getId(), AuditLogService.values(
                "bookingCode", booking.getBookingCode(), "workspaceId", booking.getWorkspaceId(), "note", note));

        return toDto(checkinLog);
    }

    @Transactional(readOnly = true)
    public List<BookingWithDetailsDto> getActiveCheckins(UUID branchId) {
        List<CheckinLog> activeLogs = checkinLogRepository.findActiveCheckinsByBranchId(branchId);
        if (activeLogs.isEmpty()) return List.of();

        List<UUID> bookingIds = activeLogs.stream()
                .map(CheckinLog::getBookingId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        List<Booking> bookings = bookingRepository.findAllById(bookingIds);
        return bookingService.toBookingWithDetailsDtoList(bookings, activeLogs);
    }

    private CheckinLogDto toDto(CheckinLog c) {
        return CheckinLogDto.builder()
                .id(c.getId())
                .bookingId(c.getBookingId())
                .staffUserId(c.getStaffUserId())
                .checkinAt(c.getCheckinAt().toString())
                .checkoutAt(c.getCheckoutAt() != null ? c.getCheckoutAt().toString() : null)
                .note(c.getNote())
                .build();
    }
}

