package com.example.momosandbox.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
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
@Table(name = "payments", indexes = {
        @Index(name = "idx_payments_order_id", columnList = "order_id", unique = true),
        @Index(name = "idx_payments_booking_id", columnList = "booking_id")
})
public class Payment {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "booking_id", nullable = false)
    private UUID bookingId;

    @Column(name = "user_id", nullable = false, length = 64)
    private String userId;

    @Column(name = "provider", nullable = false, length = 16)
    private String provider;

    @Column(name = "method", nullable = false, length = 16)
    private String method;

    @Column(name = "order_id", nullable = false, unique = true, length = 64)
    private String orderId;

    @Column(name = "request_id", length = 64)
    private String requestId;

    @Column(name = "amount", nullable = false)
    private long amount;

    @Column(name = "status", nullable = false, length = 32)
    private String status;

    @Column(name = "pay_url", length = 2048)
    private String payUrl;

    @Column(name = "provider_trans_id", length = 64)
    private String providerTransId;

    @Column(name = "paid_at")
    private OffsetDateTime paidAt;

    @Column(name = "raw_callback", columnDefinition = "text")
    private String rawCallback;

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
            status = "initiated";
        }
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = OffsetDateTime.now(ZoneOffset.UTC);
    }
}
