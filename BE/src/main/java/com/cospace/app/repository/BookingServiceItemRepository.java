package com.cospace.app.repository;

import com.cospace.app.entity.BookingServiceItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface BookingServiceItemRepository extends JpaRepository<BookingServiceItem, UUID> {

    List<BookingServiceItem> findByBookingIdOrderByCreatedAtAsc(UUID bookingId);

    List<BookingServiceItem> findByBookingIdAndStatus(UUID bookingId, String status);

    @Query("SELECT COALESCE(SUM(i.subtotal), 0L) FROM BookingServiceItem i WHERE i.bookingId = :bookingId AND i.status = :status")
    long sumSubtotalByBookingIdAndStatus(@Param("bookingId") UUID bookingId, @Param("status") String status);

    /** [bookingId, amount] for several bookings at once, for reporting. */
    @Query("SELECT i.bookingId, COALESCE(SUM(i.subtotal), 0) FROM BookingServiceItem i "
            + "WHERE i.bookingId IN :bookingIds AND i.status = :status GROUP BY i.bookingId")
    java.util.List<Object[]> sumSubtotalByBookingsAndStatus(@Param("bookingIds") java.util.Collection<UUID> bookingIds,
                                                            @Param("status") String status);

    /** [bookingId, lineType, status, quantity, amount] of the live (not void) lines of several bookings. */
    @Query("SELECT i.bookingId, i.lineType, i.status, COALESCE(SUM(i.quantity), 0), COALESCE(SUM(i.subtotal), 0) "
            + "FROM BookingServiceItem i WHERE i.bookingId IN :bookingIds AND i.status <> 'void' "
            + "GROUP BY i.bookingId, i.lineType, i.status")
    java.util.List<Object[]> sumLiveLinesByBookings(@Param("bookingIds") java.util.Collection<UUID> bookingIds);

    void deleteByBookingId(UUID bookingId);

    boolean existsByServiceId(UUID serviceId);

    /**
     * Units of the given services held by a branch's live bookings whose time overlaps [start, end),
     * leaving out one booking (pass a random id to leave out none).
     */
    @org.springframework.data.jpa.repository.Query("SELECT COALESCE(SUM(i.quantity), 0) FROM BookingServiceItem i, Booking b "
            + "WHERE b.id = i.bookingId AND i.serviceId IN :serviceIds AND i.status <> :voidStatus "
            + "AND b.branchId = :branchId AND b.status IN :statuses AND b.startAt < :end AND b.endAt > :start AND b.id <> :excludeBookingId")
    long sumQuantityInUse(@org.springframework.data.repository.query.Param("serviceIds") java.util.Collection<UUID> serviceIds,
                          @org.springframework.data.repository.query.Param("voidStatus") String voidStatus,
                          @org.springframework.data.repository.query.Param("branchId") UUID branchId,
                          @org.springframework.data.repository.query.Param("statuses") java.util.Collection<com.cospace.app.entity.BookingStatus> statuses,
                          @org.springframework.data.repository.query.Param("start") java.time.OffsetDateTime start,
                          @org.springframework.data.repository.query.Param("end") java.time.OffsetDateTime end,
                          @org.springframework.data.repository.query.Param("excludeBookingId") UUID excludeBookingId);
}
