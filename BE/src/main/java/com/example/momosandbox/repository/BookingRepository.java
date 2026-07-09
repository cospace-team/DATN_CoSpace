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

    @org.springframework.data.jpa.repository.Query(
        value = "SELECT EXISTS(SELECT 1 FROM bookings WHERE workspace_id = CAST(:workspaceId AS uuid) AND start_at > :after AND CAST(status AS varchar) NOT IN (:excludedStatuses))",
        nativeQuery = true
    )
    boolean existsByWorkspaceIdAndStartAtAfterAndStatusNotIn(
            @org.springframework.data.repository.query.Param("workspaceId") String workspaceId,
            @org.springframework.data.repository.query.Param("after") OffsetDateTime after,
            @org.springframework.data.repository.query.Param("excludedStatuses") Collection<String> excludedStatuses);
}
