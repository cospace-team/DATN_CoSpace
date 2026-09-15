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

    void deleteByBookingId(UUID bookingId);

    boolean existsByServiceId(UUID serviceId);
}
