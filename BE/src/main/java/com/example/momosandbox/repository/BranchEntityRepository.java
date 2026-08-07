package com.example.momosandbox.repository;

import com.example.momosandbox.entity.BranchEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface BranchEntityRepository extends JpaRepository<BranchEntity, UUID> {
}
