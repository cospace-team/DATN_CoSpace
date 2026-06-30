package com.example.momosandbox.repository;

import com.example.momosandbox.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BookingRepository extends JpaRepository<Booking, UUID> {

    List<Booking> findByUserIdOrderByCreatedAtDesc(String userId);

    Optional<Booking> findByIdAndUserId(UUID id, String userId);

    boolean existsByWorkspaceIdAndStartAtAfterAndStatusNotIn(
            String workspaceId, OffsetDateTime after, Collection<String> excludedStatuses);
}
