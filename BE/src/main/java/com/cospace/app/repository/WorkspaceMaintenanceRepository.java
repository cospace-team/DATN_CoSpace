package com.cospace.app.repository;

import com.cospace.app.entity.MaintenanceStatus;
import com.cospace.app.entity.WorkspaceMaintenanceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface WorkspaceMaintenanceRepository extends JpaRepository<WorkspaceMaintenanceEntity, UUID> {
    
    @Query("SELECT wm FROM WorkspaceMaintenanceEntity wm JOIN WorkspaceEntity w ON wm.workspaceId = w.id JOIN Floor f ON w.floorId = f.id WHERE f.branchId = :branchId ORDER BY wm.createdAt DESC")
    List<WorkspaceMaintenanceEntity> findAllByBranchIdOrderByCreatedAtDesc(@Param("branchId") UUID branchId);

    List<WorkspaceMaintenanceEntity> findByWorkspaceId(UUID workspaceId);

    @Query("SELECT wm FROM WorkspaceMaintenanceEntity wm WHERE wm.workspaceId = :workspaceId AND wm.startAt < :endAt AND wm.endAt > :startAt AND wm.status IN :statuses")
    List<WorkspaceMaintenanceEntity> findOverlappingMaintenances(
            @Param("workspaceId") UUID workspaceId,
            @Param("startAt") java.time.ZonedDateTime startAt,
            @Param("endAt") java.time.ZonedDateTime endAt,
            @Param("statuses") List<MaintenanceStatus> statuses
    );

    @Query("SELECT f.branchId FROM WorkspaceMaintenanceEntity wm JOIN WorkspaceEntity w ON wm.workspaceId = w.id JOIN Floor f ON w.floorId = f.id WHERE wm.id = :maintenanceId")
    java.util.Optional<UUID> findBranchIdByMaintenanceId(@Param("maintenanceId") UUID maintenanceId);
}
