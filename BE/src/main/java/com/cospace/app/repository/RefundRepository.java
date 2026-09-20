package com.cospace.app.repository;

import com.cospace.app.entity.Refund;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface RefundRepository extends JpaRepository<Refund, UUID> {

    List<Refund> findByBookingIdOrderByCreatedAtAsc(UUID bookingId);

    boolean existsByPaymentIdAndReasonType(UUID paymentId, String reasonType);

    /** Refunds for a branch (or every branch when null), optionally filtered by status, newest first. */
    @Query("SELECT r FROM Refund r WHERE (:branchId IS NULL OR r.branchId = :branchId) "
            + "AND (:status IS NULL OR r.status = :status) ORDER BY r.createdAt DESC")
    List<Refund> search(@Param("branchId") UUID branchId, @Param("status") String status);

    @Query("SELECT COALESCE(SUM(r.amount), 0L) FROM Refund r WHERE r.bookingId = :bookingId AND r.status IN :statuses")
    long sumAmountByBookingAndStatuses(@Param("bookingId") UUID bookingId, @Param("statuses") Collection<String> statuses);

    /** Total already refunded to one customer, used when deriving their membership tier. */
    @Query("SELECT COALESCE(SUM(r.amount), 0) FROM Refund r WHERE r.userId = :userId AND r.status = :status")
    long sumAmountByUserAndStatus(@Param("userId") UUID userId, @Param("status") String status);

    /** [bookingId, refunded amount] for several bookings at once, for reporting. */
    @Query("SELECT r.bookingId, COALESCE(SUM(r.amount), 0) FROM Refund r "
            + "WHERE r.bookingId IN :bookingIds AND r.status = :status GROUP BY r.bookingId")
    List<Object[]> sumAmountByBookingsAndStatus(@Param("bookingIds") Collection<UUID> bookingIds,
                                                @Param("status") String status);
}
