package com.example.momosandbox.repository;

import com.example.momosandbox.entity.Booking;
import com.example.momosandbox.entity.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BookingRepository extends JpaRepository<Booking, UUID> {

    List<Booking> findByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<Booking> findByIdAndUserId(UUID id, UUID userId);

    List<Booking> findAllByStatusAndPaymentDeadlineAtBefore(BookingStatus status, OffsetDateTime now);

    @org.springframework.data.jpa.repository.Query(
        value = "SELECT EXISTS(SELECT 1 FROM bookings WHERE workspace_id = :workspaceId AND start_at > :after)",
        nativeQuery = true
    )
    boolean existsByWorkspaceIdAndStartAtAfter(
            @org.springframework.data.repository.query.Param("workspaceId") UUID workspaceId,
            @org.springframework.data.repository.query.Param("after") OffsetDateTime after);

    Optional<Booking> findByBookingCode(String bookingCode);

    List<Booking> findByBranchIdAndStartAtBetweenOrderByStartAtAsc(UUID branchId, OffsetDateTime start, OffsetDateTime end);

    @org.springframework.data.jpa.repository.Query("SELECT b FROM Booking b WHERE b.branchId = :branchId AND b.startAt < :end AND b.endAt > :start ORDER BY b.startAt ASC")
    List<Booking> findBookingsInInterval(
            @org.springframework.data.repository.query.Param("branchId") UUID branchId, 
            @org.springframework.data.repository.query.Param("start") OffsetDateTime start, 
            @org.springframework.data.repository.query.Param("end") OffsetDateTime end);

    @org.springframework.data.jpa.repository.Query("SELECT b FROM Booking b WHERE b.workspaceId = :workspaceId AND b.startAt < :endAt AND b.endAt > :startAt AND b.status IN :statuses")
    List<Booking> findOverlappingBookings(@org.springframework.data.repository.query.Param("workspaceId") UUID workspaceId, 
                                          @org.springframework.data.repository.query.Param("startAt") OffsetDateTime startAt, 
                                          @org.springframework.data.repository.query.Param("endAt") OffsetDateTime endAt, 
                                          @org.springframework.data.repository.query.Param("statuses") List<BookingStatus> statuses);

    int countByBranchIdAndStatus(UUID branchId, BookingStatus status);

    List<Booking> findByBranchIdAndStatus(UUID branchId, BookingStatus status);
}
