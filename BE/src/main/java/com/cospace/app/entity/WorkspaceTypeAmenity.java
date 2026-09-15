package com.cospace.app.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

/** An amenity assigned to a workspace type; every workspace of that type inherits it. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "workspace_type_amenities")
@IdClass(WorkspaceTypeAmenity.Key.class)
public class WorkspaceTypeAmenity {

    @Id
    @Column(name = "workspace_type_id", nullable = false)
    private UUID workspaceTypeId;

    @Id
    @Column(name = "amenity_id", nullable = false)
    private UUID amenityId;

    @Column(nullable = false)
    @Builder.Default
    private int quantity = 1;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Key implements Serializable {
        private UUID workspaceTypeId;
        private UUID amenityId;
    }
}
