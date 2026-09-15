package com.cospace.app.repository;

import com.cospace.app.entity.DurationUnit;
import com.cospace.app.entity.PricePolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PricePolicyRepository extends JpaRepository<PricePolicy, UUID> {

    Optional<PricePolicy> findByBranchIdAndWorkspaceTypeIdAndDurationUnitAndIsActiveTrue(
            UUID branchId, UUID workspaceTypeId, DurationUnit durationUnit);

    Optional<PricePolicy> findByBranchIdIsNullAndWorkspaceTypeIdAndDurationUnitAndIsActiveTrue(
            UUID workspaceTypeId, DurationUnit durationUnit);

    List<PricePolicy> findByBranchIdAndIsActiveTrue(UUID branchId);

    List<PricePolicy> findByBranchIdIsNullAndIsActiveTrue();

    long countByWorkspaceTypeId(UUID workspaceTypeId);
}
