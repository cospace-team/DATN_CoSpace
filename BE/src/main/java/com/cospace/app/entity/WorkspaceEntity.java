package com.cospace.app.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import io.hypersistence.utils.hibernate.type.basic.PostgreSQLEnumType;
import org.hibernate.annotations.Type;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "workspaces", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"floor_id", "code"}),
    @UniqueConstraint(columnNames = {"floor_id", "svg_element_id"})
})
public class WorkspaceEntity {

    public enum Status { active, maintenance, inactive }

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "floor_id", nullable = false)
    private UUID floorId;

    @Column(name = "workspace_type_id", nullable = false)
    private UUID workspaceTypeId;

    @Column(nullable = false, length = 30)
    private String code;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false)
    @Builder.Default
    private int capacity = 1;

    @Column(name = "svg_element_id", nullable = false, length = 100)
    private String svgElementId;

    @Enumerated(EnumType.STRING)
    @Type(PostgreSQLEnumType.class)
    @Column(columnDefinition = "workspace_status", nullable = false, length = 20)
    @Builder.Default
    private Status status = Status.active;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    void prePersist() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = createdAt;
        if (status == null) status = Status.active;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = OffsetDateTime.now(ZoneOffset.UTC);
    }
}
