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
@Table(name = "promotions")
public class Promotion {

    public static final String TYPE_PERCENT = "percent";
    public static final String TYPE_FIXED = "fixed";

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(nullable = false, unique = true, length = 40)
    private String code;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(columnDefinition = "text")
    private String description;

    /** percent | fixed */
    @Column(name = "discount_type", nullable = false, length = 16)
    @Builder.Default
    private String discountType = TYPE_PERCENT;

    /** Percent (1-100) for percent promotions, VND amount for fixed ones. */
    @Column(name = "discount_value", nullable = false)
    private long discountValue;

    /** Cap on a percent promotion's discount; null = uncapped. */
    @Column(name = "max_discount_amount")
    private Long maxDiscountAmount;

    @Column(name = "min_order_amount", nullable = false)
    private long minOrderAmount;

    @Column(name = "start_at", nullable = false)
    private OffsetDateTime startAt;

    @Column(name = "end_at", nullable = false)
    private OffsetDateTime endAt;

    /** Total redemptions allowed across all customers; null = unlimited. */
    @Column(name = "usage_limit")
    private Integer usageLimit;

    /** Redemptions allowed per customer; null = unlimited. */
    @Column(name = "per_user_limit")
    private Integer perUserLimit;

    /** null = every branch */
    @Column(name = "branch_id")
    private UUID branchId;

    /** null = every workspace type */
    @Column(name = "workspace_type_id")
    private UUID workspaceTypeId;

    /** Lowest membership tier (by code) allowed to use it; null = everyone. */
    @Column(name = "min_tier_code", length = 32)
    private String minTierCode;

    /** Listed to customers at checkout; a non-public code works only when typed in. */
    @Column(name = "is_public", nullable = false)
    @Builder.Default
    private boolean isPublic = true;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @Column(name = "created_by")
    private UUID createdBy;

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
