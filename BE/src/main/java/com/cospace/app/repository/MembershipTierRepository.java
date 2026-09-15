package com.cospace.app.repository;

import com.cospace.app.entity.MembershipTier;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MembershipTierRepository extends JpaRepository<MembershipTier, UUID> {

    List<MembershipTier> findAllByOrderBySortOrderAsc();

    List<MembershipTier> findByIsActiveTrueOrderBySortOrderAsc();

    Optional<MembershipTier> findByCode(String code);

    boolean existsByCode(String code);
}
