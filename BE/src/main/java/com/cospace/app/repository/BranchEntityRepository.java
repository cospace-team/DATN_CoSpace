package com.cospace.app.repository;

import com.cospace.app.entity.BranchEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface BranchEntityRepository extends JpaRepository<BranchEntity, UUID> {
}
