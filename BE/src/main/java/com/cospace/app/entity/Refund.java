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
 * Money owed back to a customer, whatever the cause. Staff settle it outside the system (bank
 * transfer, cash at the counter) and then mark it processed, or reject it with a reason.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "refunds")
public class Refund {

    /** Customer cancelled a paid booking; amount follows the cancellation policy. */
    public static final String REASON_CANCELLATION = "CANCELLATION";
    /** Maintenance cancelled or cut short a paid booking. */
    public static final String REASON_MAINTENANCE = "MAINTENANCE";
    /** A payment arrived after the booking had already expired or been cancelled. */
    public static final String REASON_LATE_PAYMENT = "LATE_PAYMENT";
    /** A second payment arrived for a booking that was already paid. */
    public static final String REASON_DUPLICATE_PAYMENT = "DUPLICATE_PAYMENT";

    public static final String STATUS_PENDING = "pending";
    public static final String STATUS_PROCESSED = "processed";
    public static final String STATUS_REJECTED = "rejected";

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "booking_id", nullable = false)
    private UUID bookingId;

    /** The specific payment being returned, when the refund is tied to one (late / duplicate payment). */
    @Column(name = "payment_id")
    private UUID paymentId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "branch_id", nullable = false)
    private UUID branchId;

    @Column(nullable = false)
    private long amount;

    @Column(name = "reason_type", nullable = false, length = 32)
    private String reasonType;

    @Column(columnDefinition = "text")
    private String reason;

    @Column(nullable = false, length = 16)
    @Builder.Default
    private String status = STATUS_PENDING;

    @Column(name = "resolution_note", columnDefinition = "text")
    private String resolutionNote;

    @Column(name = "processed_by")
    private UUID processedBy;

    @Column(name = "processed_at")
    private OffsetDateTime processedAt;

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
