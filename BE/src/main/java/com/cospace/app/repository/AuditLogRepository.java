package com.cospace.app.repository;

import com.cospace.app.entity.AuditLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLogEntity, UUID> {

    List<AuditLogEntity> findByEntityNameAndEntityIdOrderByCreatedAtDesc(String entityName, UUID entityId);

    List<AuditLogEntity> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
