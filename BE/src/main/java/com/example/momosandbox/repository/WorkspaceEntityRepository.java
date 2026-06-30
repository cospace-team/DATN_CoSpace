package com.example.momosandbox.repository;

import com.example.momosandbox.entity.WorkspaceEntity;
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
}
