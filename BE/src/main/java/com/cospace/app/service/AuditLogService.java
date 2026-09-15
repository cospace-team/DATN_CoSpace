package com.cospace.app.service;

import com.cospace.app.config.CacheConfig;
import com.cospace.app.entity.AuditLogEntity;
import com.cospace.app.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
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

    /**
     * Convenience overload for controllers: pulls the IP/user-agent straight off the current
     * request instead of every call site having to extract them itself.
     */
    public void log(HttpServletRequest request, UUID userId, String action, String entityName, UUID entityId,
                    Map<String, Object> oldValues, Map<String, Object> newValues) {
        String ipAddress = request != null ? request.getRemoteAddr() : null;
        String userAgent = request != null ? request.getHeader("User-Agent") : null;
        log(userId, action, entityName, entityId, oldValues, newValues, ipAddress, userAgent);
    }

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
    @Cacheable(CacheConfig.AUDIT_LOGS)
    public Page<AuditLogEntity> searchAuditLogs(UUID userId, String entityName, String action, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)));
        return auditLogRepository.searchAuditLogs(userId, entityName, action, pageable);
    }
}
