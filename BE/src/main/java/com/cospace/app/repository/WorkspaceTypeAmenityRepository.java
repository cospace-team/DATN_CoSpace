package com.cospace.app.repository;

import com.cospace.app.entity.WorkspaceTypeAmenity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface WorkspaceTypeAmenityRepository extends JpaRepository<WorkspaceTypeAmenity, WorkspaceTypeAmenity.Key> {

    List<WorkspaceTypeAmenity> findByWorkspaceTypeId(UUID workspaceTypeId);

    List<WorkspaceTypeAmenity> findByAmenityId(UUID amenityId);

    long countByAmenityId(UUID amenityId);

    @Modifying
    @Query("DELETE FROM WorkspaceTypeAmenity wta WHERE wta.workspaceTypeId = :workspaceTypeId")
    void deleteByWorkspaceTypeId(@Param("workspaceTypeId") UUID workspaceTypeId);
}
