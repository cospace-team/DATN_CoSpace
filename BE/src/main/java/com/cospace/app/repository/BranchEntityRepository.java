package com.cospace.app.repository;

import com.cospace.app.entity.BranchEntity;
import com.cospace.app.entity.BranchEntity.BranchStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface BranchEntityRepository extends JpaRepository<BranchEntity, UUID> {

    List<BranchEntity> findByStatusOrderByNameAsc(BranchStatus status);

    List<BranchEntity> findAllByOrderByNameAsc();

    boolean existsByCode(String code);
}
