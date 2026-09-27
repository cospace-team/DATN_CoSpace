package com.cospace.app.repository;

import com.cospace.app.entity.PartnerConnection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PartnerConnectionRepository extends JpaRepository<PartnerConnection, UUID> {

    /** The single record between two members, whoever started it. */
    @Query("SELECT c FROM PartnerConnection c WHERE (c.requesterId = :a AND c.addresseeId = :b) "
            + "OR (c.requesterId = :b AND c.addresseeId = :a)")
    Optional<PartnerConnection> findBetween(@Param("a") UUID a, @Param("b") UUID b);

    @Query("SELECT c FROM PartnerConnection c WHERE c.requesterId = :userId OR c.addresseeId = :userId "
            + "ORDER BY c.updatedAt DESC")
    List<PartnerConnection> findAllInvolving(@Param("userId") UUID userId);
}
