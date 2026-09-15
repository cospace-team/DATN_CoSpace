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

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "booking_services")
public class BookingServiceItem {

    /** Ordered but not paid yet: owed on the running tab (or covered by the booking's pending payment). */
    public static final String STATUS_UNPAID = "unpaid";
    public static final String STATUS_PAID = "paid";
    /** Cancelled line: no longer counted in the booking's add-on amount. */
    public static final String STATUS_VOID = "void";

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "booking_id", nullable = false)
    private UUID bookingId;

    @Column(name = "service_id", nullable = false)
    private UUID serviceId;

    @Column(nullable = false)
    @Builder.Default
    private int quantity = 1;

    @Column(name = "unit_price", nullable = false)
    private long unitPrice;

    @Column(nullable = false)
    private long subtotal;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(nullable = false, length = 16)
    @Builder.Default
    private String status = STATUS_UNPAID;

    @Column(name = "payment_id")
    private UUID paymentId;

    @Column(name = "paid_at")
    private OffsetDateTime paidAt;

    @Column(name = "voided_at")
    private OffsetDateTime voidedAt;

    @Column(name = "voided_by")
    private UUID voidedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = OffsetDateTime.now(ZoneOffset.UTC);
        if (status == null) status = STATUS_UNPAID;
        if (subtotal == 0 && unitPrice > 0 && quantity > 0) {
            subtotal = unitPrice * (long) quantity;
        }
    }
}
