package com.cospace.app.repository;

import com.cospace.app.entity.BookingGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface BookingGroupRepository extends JpaRepository<BookingGroup, UUID> {

    Optional<BookingGroup> findByIdAndUserId(UUID id, UUID userId);

    boolean existsByGroupCode(String groupCode);
}
