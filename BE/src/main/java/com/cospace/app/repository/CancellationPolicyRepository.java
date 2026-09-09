package com.cospace.app.repository;

import com.cospace.app.entity.CancellationPolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CancellationPolicyRepository extends JpaRepository<CancellationPolicy, UUID> {

    List<CancellationPolicy> findByBranchIdAndIsActiveTrueOrderByPriorityAsc(UUID branchId);

    List<CancellationPolicy> findByBranchIdIsNullAndIsActiveTrueOrderByPriorityAsc();
}
