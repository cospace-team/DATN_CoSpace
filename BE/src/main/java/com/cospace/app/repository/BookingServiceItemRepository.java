package com.cospace.app.repository;

import com.cospace.app.entity.BookingServiceItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface BookingServiceItemRepository extends JpaRepository<BookingServiceItem, UUID> {

    List<BookingServiceItem> findByBookingIdOrderByCreatedAtAsc(UUID bookingId);

    void deleteByBookingId(UUID bookingId);

    boolean existsByServiceId(UUID serviceId);
}
