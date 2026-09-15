package com.cospace.app.controller;

import com.cospace.app.dto.api.AuditLogDto;
import com.cospace.app.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    @PreAuthorize("hasAnyRole('super_admin', 'admin', 'branch_admin')")
    public ResponseEntity<?> getAuditLogs(
            @RequestParam(value = "userId", required = false) UUID userId,
            @RequestParam(value = "entityName", required = false) String entityName,
            @RequestParam(value = "action", required = false) String action,
            @RequestParam(value = "branchId", required = false) UUID branchId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        Page<AuditLogDto> logs = auditLogService.searchAuditLogsEnriched(userId, entityName, action, branchId, page, size);
        return ResponseEntity.ok(Map.of(
                "content", logs.getContent(),
                "totalElements", logs.getTotalElements(),
                "totalPages", logs.getTotalPages(),
                "page", logs.getNumber(),
                "size", logs.getSize()
        ));
    }
}

