package com.example.momosandbox.entity;

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

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "bookings")
public class Booking {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "booking_code", nullable = false, unique = true, length = 32)
    private String bookingCode;

    @Column(name = "user_id", nullable = false, length = 64)
    private String userId;

    @Column(name = "workspace_id", nullable = false, length = 64)
    private String workspaceId;

    @Column(name = "branch_id", nullable = false, length = 64)
    private String branchId;

    @Column(name = "workspace_type_id", nullable = false, length = 64)
    private String workspaceTypeId;

    @Column(name = "start_at", nullable = false)
    private OffsetDateTime startAt;

    @Column(name = "end_at", nullable = false)
    private OffsetDateTime endAt;

    @Column(name = "unit", nullable = false, length = 16)
    private String unit;

    @Column(name = "unit_count", nullable = false)
    private int unitCount;

    @Column(name = "status", nullable = false, length = 32)
    private String status;

    @Column(name = "subtotal_amount", nullable = false)
    private long subtotalAmount;

    @Column(name = "discount_amount", nullable = false)
    private long discountAmount;

    @Column(name = "addon_amount", nullable = false)
    private long addonAmount;

    @Column(name = "total_amount", nullable = false)
    private long totalAmount;

    @Column(name = "payment_deadline_at")
    private OffsetDateTime paymentDeadlineAt;

    @Column(name = "source", nullable = false, length = 16)
    private String source;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    void prePersist() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = createdAt;
        }
        if (status == null || status.isBlank()) {
            status = "pending_payment";
        }
        if (source == null || source.isBlank()) {
            source = "web";
        }
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = OffsetDateTime.now(ZoneOffset.UTC);
    }
}
