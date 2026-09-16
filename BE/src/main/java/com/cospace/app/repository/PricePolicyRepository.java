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

    /**
     * The active price of a type/unit at a branch. Old seed data holds duplicate active rows for some
     * combinations, so the most recently updated one wins instead of failing with a non-unique result.
     */
    default Optional<PricePolicy> findByBranchIdAndWorkspaceTypeIdAndDurationUnitAndIsActiveTrue(
            UUID branchId, UUID workspaceTypeId, DurationUnit durationUnit) {
        return findFirstByBranchIdAndWorkspaceTypeIdAndDurationUnitAndIsActiveTrueOrderByUpdatedAtDesc(
                branchId, workspaceTypeId, durationUnit);
    }

    /** The active system-wide price of a type/unit; same duplicate tolerance as the branch lookup. */
    default Optional<PricePolicy> findByBranchIdIsNullAndWorkspaceTypeIdAndDurationUnitAndIsActiveTrue(
            UUID workspaceTypeId, DurationUnit durationUnit) {
        return findFirstByBranchIdIsNullAndWorkspaceTypeIdAndDurationUnitAndIsActiveTrueOrderByUpdatedAtDesc(
                workspaceTypeId, durationUnit);
    }

    Optional<PricePolicy> findFirstByBranchIdAndWorkspaceTypeIdAndDurationUnitAndIsActiveTrueOrderByUpdatedAtDesc(
            UUID branchId, UUID workspaceTypeId, DurationUnit durationUnit);

    Optional<PricePolicy> findFirstByBranchIdIsNullAndWorkspaceTypeIdAndDurationUnitAndIsActiveTrueOrderByUpdatedAtDesc(
            UUID workspaceTypeId, DurationUnit durationUnit);

    List<PricePolicy> findByBranchIdAndIsActiveTrue(UUID branchId);

    List<PricePolicy> findByBranchIdIsNullAndIsActiveTrue();

    long countByWorkspaceTypeId(UUID workspaceTypeId);
}
