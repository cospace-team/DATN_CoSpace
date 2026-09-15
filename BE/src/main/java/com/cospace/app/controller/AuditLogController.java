package com.cospace.app.controller;

import com.cospace.app.entity.AuditLogEntity;
import com.cospace.app.entity.User;
import com.cospace.app.repository.UserRepository;
import com.cospace.app.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogService auditLogService;
    private final UserRepository userRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('super_admin', 'admin')")
    public ResponseEntity<?> getAuditLogs(
            @RequestParam(value = "userId", required = false) UUID userId,
            @RequestParam(value = "entityName", required = false) String entityName,
            @RequestParam(value = "action", required = false) String action,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        Page<AuditLogEntity> logs = auditLogService.searchAuditLogs(userId, entityName, action, page, size);
        // Resolve who acted, so the log reads as people rather than raw ids.
        Map<UUID, User> actors = userRepository.findAllById(logs.getContent().stream()
                        .map(AuditLogEntity::getUserId).filter(Objects::nonNull).distinct().toList())
                .stream().collect(Collectors.toMap(User::getId, Function.identity()));
        List<Map<String, Object>> content = logs.getContent().stream().map(l -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", l.getId());
            row.put("userId", l.getUserId());
            User actor = l.getUserId() != null ? actors.get(l.getUserId()) : null;
            row.put("userName", actor != null ? actor.getFullName() : null);
            row.put("userRole", actor != null && actor.getRole() != null ? actor.getRole().name() : null);
            row.put("action", l.getAction());
            row.put("entityName", l.getEntityName());
            row.put("entityId", l.getEntityId());
            row.put("oldValues", l.getOldValues());
            row.put("newValues", l.getNewValues());
            row.put("ipAddress", l.getIpAddress());
            row.put("createdAt", l.getCreatedAt());
            return row;
        }).toList();
        return ResponseEntity.ok(Map.of(
                "content", content,
                "totalElements", logs.getTotalElements(),
                "totalPages", logs.getTotalPages(),
                "page", logs.getNumber(),
                "size", logs.getSize()
        ));
    }
}
