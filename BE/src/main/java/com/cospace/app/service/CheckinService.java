package com.cospace.app.service;

import com.cospace.app.dto.api.BookingWithDetailsDto;
import com.cospace.app.dto.api.CheckinLogDto;
import com.cospace.app.entity.Booking;
import com.cospace.app.entity.BookingStatus;
import com.cospace.app.entity.CheckinLog;
import com.cospace.app.entity.DurationUnit;
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

    private final CheckinLogRepository checkinLogRepository;
    private final BookingRepository bookingRepository;
    private final BookingService bookingService;
    private final UserRepository userRepository;
    private final BookingAddonService bookingAddonService;
    private final BookingExtensionService bookingExtensionService;

    public CheckinService(CheckinLogRepository checkinLogRepository,
                          BookingRepository bookingRepository,
                          BookingService bookingService,
                          UserRepository userRepository,
                          BookingAddonService bookingAddonService,
                          BookingExtensionService bookingExtensionService) {
        this.checkinLogRepository = checkinLogRepository;
        this.bookingRepository = bookingRepository;
        this.bookingService = bookingService;
        this.userRepository = userRepository;
        this.bookingAddonService = bookingAddonService;
        this.bookingExtensionService = bookingExtensionService;
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

        boolean isMultiDayPass = booking.isContract() 
                || booking.getUnit() == DurationUnit.week 
                || booking.getUnit() == DurationUnit.month 
                || (booking.getUnit() == DurationUnit.day && booking.getUnitCount() > 1);

        // 2. Validate booking status
        if (!isMultiDayPass && booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new IllegalArgumentException("Vé chưa được thanh toán/xác nhận hoặc đã hoàn tất (Trạng thái: " + booking.getStatus() + ").");
        }
        if (isMultiDayPass && booking.getStatus() != BookingStatus.CONFIRMED && booking.getStatus() != BookingStatus.CHECKED_IN) {
            throw new IllegalArgumentException("Gói đặt chỗ dài hạn chưa hợp lệ để Check-in (Trạng thái: " + booking.getStatus() + ").");
        }

        // 3. Check if already checked in
        if (checkinLogRepository.existsByBookingIdAndCheckoutAtIsNull(bookingId)) {
            throw new IllegalArgumentException("Khách hàng này đã được Check-in và đang sử dụng không gian.");
        }

        // 4. Validate time window (Rule #9 & UC-CHK-01)
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        if (now.isBefore(booking.getStartAt().minusMinutes(30))) {
            throw new IllegalArgumentException("Chưa đến giờ Check-in. Hệ thống chỉ cho phép Check-in trước giờ bắt đầu tối đa 30 phút.");
        }
        if (!isMultiDayPass && now.isAfter(booking.getEndAt())) {
            throw new IllegalArgumentException("Vé đặt chỗ đã quá hạn giờ kết thúc. Không thể Check-in.");
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

        return toDto(checkinLog);
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
        boolean isMultiDayPass = booking.isContract() 
                || booking.getUnit() == DurationUnit.week 
                || booking.getUnit() == DurationUnit.month 
                || (booking.getUnit() == DurationUnit.day && booking.getUnitCount() > 1);

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

        return toDto(checkinLog);
    }

    @Transactional(readOnly = true)
    public List<BookingWithDetailsDto> getActiveCheckins(UUID branchId) {
        List<CheckinLog> activeLogs = checkinLogRepository.findActiveCheckinsByBranchId(branchId);
        
        return activeLogs.stream()
                .map(log -> {
                    Booking b = bookingRepository.findById(log.getBookingId()).orElse(null);
                    if (b == null) return null;
                    return bookingService.toBookingWithDetailsDto(b);
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
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

