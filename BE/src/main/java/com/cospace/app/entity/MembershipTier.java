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

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "membership_tiers")
public class MembershipTier {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(nullable = false, unique = true, length = 32)
    private String code;

    @Column(nullable = false, length = 80)
    private String name;

    @Column(columnDefinition = "text")
    private String description;

    /** Qualifies once total paid spend reaches this (0 = condition ignored). */
    @Column(name = "min_total_spent", nullable = false)
    private long minTotalSpent;

    /** Qualifies once the paid booking count reaches this (0 = condition ignored). */
    @Column(name = "min_bookings", nullable = false)
    private int minBookings;

    @Column(name = "discount_percent", nullable = false)
    private int discountPercent;

    /** Newline-separated list of benefits shown to customers. */
    @Column(columnDefinition = "text")
    private String benefits;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String color = "#94a3b8";

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    /** A tier with no thresholds at all is the entry tier every customer starts in. */
    public boolean isEntryTier() {
        return minTotalSpent <= 0 && minBookings <= 0;
    }

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
