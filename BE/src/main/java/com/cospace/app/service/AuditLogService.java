package com.cospace.app.service;

import com.cospace.app.entity.AuditLogEntity;
import com.cospace.app.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(UUID userId, String action, String entityName, UUID entityId,
                    Map<String, Object> oldValues, Map<String, Object> newValues,
                    String ipAddress, String userAgent) {
        try {
            AuditLogEntity auditLog = AuditLogEntity.builder()
                    .userId(userId)
                    .action(action)
                    .entityName(entityName)
                    .entityId(entityId)
                    .oldValues(oldValues)
                    .newValues(newValues)
                    .ipAddress(ipAddress)
                    .userAgent(userAgent)
                    .createdAt(OffsetDateTime.now(ZoneOffset.UTC))
                    .build();
            auditLogRepository.save(auditLog);
        } catch (Exception e) {
            log.error("Lỗi khi ghi audit log: {}", e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public Page<AuditLogEntity> searchAuditLogs(UUID userId, String entityName, String action, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)));
        return auditLogRepository.searchAuditLogs(userId, entityName, action, pageable);
    }
}
