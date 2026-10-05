package com.cospace.app.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Type;
import io.hypersistence.utils.hibernate.type.basic.PostgreSQLEnumType;

import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "workspace_maintenance")
@Getter
@Setter
public class WorkspaceMaintenanceEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "workspace_id", nullable = false)
    private UUID workspaceId;

    @Column(name = "start_at", nullable = false)
    private ZonedDateTime startAt;

    @Column(name = "end_at", nullable = false)
    private ZonedDateTime endAt;

    @Column(name = "reason")
    private String reason;

    @Enumerated(EnumType.STRING)
    @Type(PostgreSQLEnumType.class)
    @Column(name = "status", nullable = false, columnDefinition = "maintenance_status")
    private MaintenanceStatus status = MaintenanceStatus.scheduled;

    /** low, normal, high or urgent: how soon the seat needs attention. */
    @Column(name = "priority", nullable = false, length = 12)
    private String priority = "normal";

    /** Photo of the problem, taken by the staff who reported it. */
    @Column(name = "photo_url", columnDefinition = "text")
    private String photoUrl;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = ZonedDateTime.now();
        }
    }
}
