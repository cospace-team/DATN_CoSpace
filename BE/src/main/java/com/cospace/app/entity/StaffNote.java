package com.cospace.app.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

/** One line of a branch's counter log: a handover note, an incident, a lost item or a note about a customer. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "staff_notes")
public class StaffNote {

    public static final String HANDOVER = "handover";
    public static final String INCIDENT = "incident";
    public static final String LOST_FOUND = "lost_found";
    public static final String CUSTOMER = "customer";
    public static final java.util.Set<String> KINDS = java.util.Set.of(HANDOVER, INCIDENT, LOST_FOUND, CUSTOMER);

    public static final String OPEN = "open";
    public static final String RESOLVED = "resolved";

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "branch_id", nullable = false)
    private UUID branchId;

    @Column(nullable = false, length = 16)
    private String kind;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(columnDefinition = "text")
    private String body;

    @Column(name = "customer_id")
    private UUID customerId;

    @Column(name = "booking_id")
    private UUID bookingId;

    @Column(name = "workspace_id")
    private UUID workspaceId;

    @Column(name = "photo_url", columnDefinition = "text")
    private String photoUrl;

    @Column(nullable = false, length = 12)
    private String status;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "resolved_by")
    private UUID resolvedBy;

    @Column(name = "resolved_at")
    private OffsetDateTime resolvedAt;

    @Column(name = "resolution_note", length = 255)
    private String resolutionNote;

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (status == null) status = OPEN;
        if (createdAt == null) createdAt = OffsetDateTime.now(ZoneOffset.UTC);
    }
}
