package com.cospace.app.repository;

import com.cospace.app.entity.Promotion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PromotionRepository extends JpaRepository<Promotion, UUID> {

    List<Promotion> findAllByOrderByCreatedAtDesc();

    Optional<Promotion> findByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, UUID id);

    boolean existsByMinTierCode(String minTierCode);

    @Query("SELECT p FROM Promotion p WHERE p.isActive = true AND p.isPublic = true "
            + "AND p.startAt <= :now AND p.endAt > :now ORDER BY p.endAt ASC")
    List<Promotion> findPublicRunning(@Param("now") OffsetDateTime now);
}
