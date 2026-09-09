package com.cospace.app.repository;

import com.cospace.app.entity.AuditLogEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLogEntity, UUID> {

    List<AuditLogEntity> findByEntityNameAndEntityIdOrderByCreatedAtDesc(String entityName, UUID entityId);

    List<AuditLogEntity> findByUserIdOrderByCreatedAtDesc(UUID userId);

    Page<AuditLogEntity> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("SELECT a FROM AuditLogEntity a WHERE " +
           "(:userId IS NULL OR a.userId = :userId) AND " +
           "(:entityName IS NULL OR a.entityName = :entityName) AND " +
           "(:action IS NULL OR a.action = :action) " +
           "ORDER BY a.createdAt DESC")
    Page<AuditLogEntity> searchAuditLogs(
            @Param("userId") UUID userId,
            @Param("entityName") String entityName,
            @Param("action") String action,
            Pageable pageable);
}
