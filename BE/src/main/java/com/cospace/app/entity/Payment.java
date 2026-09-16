package com.cospace.app.entity;

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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import org.hibernate.annotations.Type;
import io.hypersistence.utils.hibernate.type.basic.PostgreSQLEnumType;


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

    /** Pays for the booking itself (rental and add-ons ordered with it). */
    public static final String PURPOSE_BOOKING = "booking";
    /** Settles add-ons put on the running tab after the booking was paid. */
    public static final String PURPOSE_ADDON = "addon";

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "booking_id", nullable = false)
    private UUID bookingId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

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

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 32, nullable = false)
    private PaymentStatus status;

    @Column(name = "pay_url", length = 2048)
    private String payUrl;

    @Column(name = "gateway_transaction_id", length = 64)
    private String gatewayTransactionId;

    @Column(name = "paid_at")
    private OffsetDateTime paidAt;
    
    @Column(name = "refunded_at")
    private OffsetDateTime refundedAt;

    @Column(name = "raw_callback", columnDefinition = "text")
    private String rawCallback;

    @Column(name = "purpose", nullable = false, length = 16)
    @Builder.Default
    private String purpose = PURPOSE_BOOKING;

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
        if (status == null) {
            status = PaymentStatus.INITIATED;
        }
        if (purpose == null) {
            purpose = PURPOSE_BOOKING;
        }
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = OffsetDateTime.now(ZoneOffset.UTC);
    }
}
