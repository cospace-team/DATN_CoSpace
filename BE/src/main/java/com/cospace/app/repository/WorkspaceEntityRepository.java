package com.cospace.app.repository;

import com.cospace.app.entity.WorkspaceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

import java.util.UUID;

@Repository
public interface WorkspaceEntityRepository extends JpaRepository<WorkspaceEntity, UUID> {

    List<WorkspaceEntity> findByFloorIdOrderByCode(UUID floorId);

    boolean existsByFloorIdAndCode(UUID floorId, String code);

    boolean existsByFloorIdAndSvgElementId(UUID floorId, String svgElementId);

    int countByFloorId(UUID floorId);

    List<WorkspaceEntity> findByFloorId(UUID floorId);

    void deleteAllByFloorId(UUID floorId);
    @org.springframework.data.jpa.repository.Query("SELECT COUNT(w) FROM WorkspaceEntity w JOIN Floor f ON w.floorId = f.id WHERE f.branchId = :branchId")
    int countByFloorBranchId(@org.springframework.data.repository.query.Param("branchId") UUID branchId);

    @org.springframework.data.jpa.repository.Query("SELECT SUM(w.capacity) FROM WorkspaceEntity w JOIN Floor f ON w.floorId = f.id WHERE f.branchId = :branchId")
    Integer sumCapacityByFloorBranchId(@org.springframework.data.repository.query.Param("branchId") UUID branchId);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(w) FROM WorkspaceEntity w JOIN Floor f ON w.floorId = f.id WHERE f.branchId = :branchId AND w.status = :status")
    int countByFloorBranchIdAndStatus(@org.springframework.data.repository.query.Param("branchId") UUID branchId, @org.springframework.data.repository.query.Param("status") com.cospace.app.entity.WorkspaceEntity.Status status);

    @org.springframework.data.jpa.repository.Query("SELECT w FROM WorkspaceEntity w JOIN Floor f ON w.floorId = f.id WHERE f.branchId = :branchId ORDER BY w.code")
    List<WorkspaceEntity> findWorkspacesByBranchId(@org.springframework.data.repository.query.Param("branchId") UUID branchId);
}
