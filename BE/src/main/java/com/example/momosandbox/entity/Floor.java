package com.example.momosandbox.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "floors", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"branch_id", "floor_no"})
})
public class Floor {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "branch_id", nullable = false)
    private UUID branchId;

    @Column(name = "floor_no", nullable = false)
    private int floorNo;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "svg_url", length = 2048)
    private String svgUrl;

    /** Full SVG content stored in DB for inline rendering */
    @Column(name = "svg_content", columnDefinition = "TEXT")
    private String svgContent;

    /** Structured layout JSON from the drag-and-drop Floor Plan Editor */
    @Column(name = "layout_json", columnDefinition = "JSONB")
    @JdbcTypeCode(SqlTypes.JSON)
    private String layoutJson;

    @Column(name = "map_version", nullable = false)
    @Builder.Default
    private int mapVersion = 1;

    @Column(name = "is_published", nullable = false)
    @Builder.Default
    private boolean isPublished = true;

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
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = OffsetDateTime.now(ZoneOffset.UTC);
    }
}
