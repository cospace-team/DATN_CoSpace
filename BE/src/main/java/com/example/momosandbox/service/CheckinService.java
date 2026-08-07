package com.example.momosandbox.service;

import com.example.momosandbox.dto.api.BookingWithDetailsDto;
import com.example.momosandbox.dto.api.CheckinLogDto;
import com.example.momosandbox.entity.Booking;
import com.example.momosandbox.entity.BookingStatus;
import com.example.momosandbox.entity.CheckinLog;
import com.example.momosandbox.repository.BookingRepository;
import com.example.momosandbox.repository.CheckinLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class CheckinService {

    private final CheckinLogRepository checkinLogRepository;
    private final BookingRepository bookingRepository;
    private final BookingService bookingService;

    public CheckinService(CheckinLogRepository checkinLogRepository, BookingRepository bookingRepository, BookingService bookingService) {
        this.checkinLogRepository = checkinLogRepository;
        this.bookingRepository = bookingRepository;
        this.bookingService = bookingService;
    }

    @Transactional
    public CheckinLogDto checkin(UUID staffId, UUID bookingId, String note) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));

        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new IllegalArgumentException("Booking is not confirmed");
        }

        if (checkinLogRepository.existsByBookingIdAndCheckoutAtIsNull(bookingId)) {
            throw new IllegalArgumentException("Booking is already checked in");
        }

        CheckinLog checkinLog = CheckinLog.builder()
                .id(UUID.randomUUID())
                .bookingId(bookingId)
                .staffUserId(staffId)
                .checkinAt(OffsetDateTime.now(ZoneOffset.UTC))
                .note(note)
                .build();

        checkinLog = checkinLogRepository.save(checkinLog);

        booking.setStatus(BookingStatus.CHECKED_IN);
        bookingRepository.save(booking);

        return toDto(checkinLog);
    }

    @Transactional
    public CheckinLogDto checkout(UUID staffId, UUID checkinId) {
        CheckinLog checkinLog = checkinLogRepository.findById(checkinId)
                .orElseThrow(() -> new IllegalArgumentException("Checkin log not found"));

        if (checkinLog.getCheckoutAt() != null) {
            throw new IllegalArgumentException("Already checked out");
        }

        checkinLog.setCheckoutAt(OffsetDateTime.now(ZoneOffset.UTC));
        checkinLog = checkinLogRepository.save(checkinLog);

        Booking booking = bookingRepository.findById(checkinLog.getBookingId())
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));

        booking.setStatus(BookingStatus.COMPLETED);
        bookingRepository.save(booking);

        return toDto(checkinLog);
    }

    @Transactional(readOnly = true)
    public List<BookingWithDetailsDto> getActiveCheckins(UUID branchId) {
        List<CheckinLog> activeLogs = checkinLogRepository.findActiveCheckinsByBranchId(branchId);
        
        return activeLogs.stream()
                .map(log -> bookingService.getBookingByCode(
                        bookingRepository.findById(log.getBookingId()).orElseThrow().getBookingCode(), 
                        branchId))
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
