package com.cospace.app.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

/**
 * How many of an extra service a branch can lend out at the same time (e.g. it owns 2 projectors).
 * Keyed by service code so it covers both a global service and a branch's own; no row means the
 * service is unlimited there.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "branch_service_limits")
public class BranchServiceLimit {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "branch_id", nullable = false)
    private UUID branchId;

    /** {@link com.cospace.app.service.ServiceLimitService#limitKey} of the service. */
    @Column(name = "service_code", nullable = false, length = 64)
    private String serviceCode;

    @Column(name = "max_concurrent", nullable = false)
    private int maxConcurrent;

    @Column(name = "updated_by")
    private UUID updatedBy;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    @PreUpdate
    void touch() {
        if (id == null) id = UUID.randomUUID();
        updatedAt = OffsetDateTime.now(ZoneOffset.UTC);
    }
}
