package com.example.momosandbox.repository;

import com.example.momosandbox.entity.WorkspaceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorkspaceTypeRepository extends JpaRepository<WorkspaceType, UUID> {
    Optional<WorkspaceType> findByCode(String code);
}
