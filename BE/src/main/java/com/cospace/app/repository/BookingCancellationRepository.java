package com.cospace.app.repository;

import com.cospace.app.entity.BookingCancellation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;
import java.util.List;

@Repository
public interface BookingCancellationRepository extends JpaRepository<BookingCancellation, UUID> {

    Optional<BookingCancellation> findByBookingId(UUID bookingId);

    List<BookingCancellation> findByBookingIdIn(java.util.Collection<UUID> bookingIds);

    List<BookingCancellation> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
