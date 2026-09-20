package com.cospace.app.repository;

import com.cospace.app.entity.Booking;
import com.cospace.app.entity.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BookingRepository extends JpaRepository<Booking, UUID> {

    List<Booking> findByUserIdOrderByCreatedAtDesc(UUID userId);

    org.springframework.data.domain.Page<Booking> findByUserIdOrderByCreatedAtDesc(UUID userId, org.springframework.data.domain.Pageable pageable);

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

    /**
     * Bookings still holding a promotion redemption. A booking that expired unpaid gives its
     * redemption back, and so does a cancelled booking nobody ever paid for — but a cancelled
     * booking that WAS paid keeps it, otherwise a single-use code could be reused for ever by
     * booking and cancelling.
     */
    String PROMOTION_STILL_REDEEMED = "b.promotionId = :promotionId "
            + "AND b.status <> com.cospace.app.entity.BookingStatus.EXPIRED "
            + "AND (b.status <> com.cospace.app.entity.BookingStatus.CANCELLED OR EXISTS ("
            + "  SELECT 1 FROM Payment p WHERE p.bookingId = b.id "
            + "  AND p.status = com.cospace.app.entity.PaymentStatus.PAID))";

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(b) FROM Booking b WHERE " + PROMOTION_STILL_REDEEMED)
    long countPromotionUsage(@org.springframework.data.repository.query.Param("promotionId") UUID promotionId);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(b) FROM Booking b WHERE " + PROMOTION_STILL_REDEEMED
            + " AND b.userId = :userId")
    long countPromotionUsageByUser(@org.springframework.data.repository.query.Param("promotionId") UUID promotionId,
                                   @org.springframework.data.repository.query.Param("userId") UUID userId);

    long countByPromotionId(UUID promotionId);

    /** [count, sum(total_amount)] of a customer's bookings in the given (paid) statuses. */
    @org.springframework.data.jpa.repository.Query("SELECT COUNT(b), COALESCE(SUM(b.totalAmount), 0L) FROM Booking b WHERE b.userId = :userId AND b.status IN :statuses")
    List<Object[]> sumSpendByUser(@org.springframework.data.repository.query.Param("userId") UUID userId,
                                  @org.springframework.data.repository.query.Param("statuses") Collection<BookingStatus> statuses);

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT b.userId FROM Booking b")
    List<UUID> findDistinctUserIds();

    /** Ids of bookings in a status whose end time is already past — candidates for lifecycle clean-up. */
    @org.springframework.data.jpa.repository.Query("SELECT b.id FROM Booking b WHERE b.status = :status AND b.endAt < :before")
    List<UUID> findIdsByStatusAndEndAtBefore(@org.springframework.data.repository.query.Param("status") BookingStatus status,
                                             @org.springframework.data.repository.query.Param("before") OffsetDateTime before);

    int countByBranchIdAndStatus(UUID branchId, BookingStatus status);

    int countByUserIdAndStatus(UUID userId, BookingStatus status);

    List<Booking> findByBranchIdAndStatus(UUID branchId, BookingStatus status);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT b FROM Booking b WHERE b.id = :id")
    Optional<Booking> findByIdWithLock(@org.springframework.data.repository.query.Param("id") UUID id);
}
