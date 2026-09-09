package com.cospace.app.repository;

import com.cospace.app.entity.CheckinLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CheckinLogRepository extends JpaRepository<CheckinLog, UUID> {
    
    // Find active checkin for a specific booking
    @Query("SELECT c FROM CheckinLog c WHERE c.bookingId = :bookingId AND c.checkoutAt IS NULL")
    Optional<CheckinLog> findActiveCheckinByBookingId(@Param("bookingId") UUID bookingId);

    // Check if there is an active checkin for a booking
    boolean existsByBookingIdAndCheckoutAtIsNull(UUID bookingId);

    // Find all active checkins for a branch where booking status is currently CHECKED_IN
    @Query("SELECT c FROM CheckinLog c JOIN Booking b ON c.bookingId = b.id WHERE b.branchId = :branchId AND c.checkoutAt IS NULL AND b.status = com.cospace.app.entity.BookingStatus.CHECKED_IN ORDER BY c.checkinAt DESC")
    List<CheckinLog> findActiveCheckinsByBranchId(@Param("branchId") UUID branchId);
}

