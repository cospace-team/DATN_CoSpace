package com.cospace.app.repository;

import com.cospace.app.entity.BranchServiceLimit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BranchServiceLimitRepository extends JpaRepository<BranchServiceLimit, UUID> {

    List<BranchServiceLimit> findByBranchId(UUID branchId);

    Optional<BranchServiceLimit> findByBranchIdAndServiceCode(UUID branchId, String serviceCode);
}
