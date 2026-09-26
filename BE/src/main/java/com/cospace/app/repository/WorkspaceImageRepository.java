package com.cospace.app.repository;

import com.cospace.app.entity.WorkspaceImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface WorkspaceImageRepository extends JpaRepository<WorkspaceImage, UUID> {

    List<WorkspaceImage> findByWorkspaceIdOrderBySortOrderAscCreatedAtAsc(UUID workspaceId);

    List<WorkspaceImage> findByWorkspaceIdInOrderBySortOrderAscCreatedAtAsc(Collection<UUID> workspaceIds);

    long countByWorkspaceId(UUID workspaceId);
}
