package com.cospace.app.repository;

import com.cospace.app.entity.WorkspaceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorkspaceTypeRepository extends JpaRepository<WorkspaceType, UUID> {
    Optional<WorkspaceType> findByCode(String code);

    default Optional<WorkspaceType> findByString(String idStr) {
        try {
            return findById(UUID.fromString(idStr));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
