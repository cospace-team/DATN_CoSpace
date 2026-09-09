package com.cospace.app.repository;

import com.cospace.app.entity.ExtraServiceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ExtraServiceRepository extends JpaRepository<ExtraServiceEntity, UUID> {

    List<ExtraServiceEntity> findByBranchIdAndIsActiveTrue(UUID branchId);

    List<ExtraServiceEntity> findByBranchIdIsNullAndIsActiveTrue();

    List<ExtraServiceEntity> findByBranchIdOrBranchIdIsNullAndIsActiveTrue(UUID branchId);
}
