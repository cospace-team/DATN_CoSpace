package com.cospace.app.repository;

import com.cospace.app.entity.ReputationEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReputationEventRepository extends JpaRepository<ReputationEvent, UUID> {

    boolean existsByBookingIdAndReason(UUID bookingId, String reason);

    Optional<ReputationEvent> findByBookingIdAndReason(UUID bookingId, String reason);

    long countByUserIdAndReason(UUID userId, String reason);

    List<ReputationEvent> findTop20ByUserIdOrderByCreatedAtDesc(UUID userId);
}
