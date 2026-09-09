package com.cospace.app.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "checkin_logs")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckinLog {
    @Id
    @Column(name = "id")
    private UUID id;

    @Column(name = "booking_id", nullable = false)
    private UUID bookingId;

    @Column(name = "staff_user_id", nullable = false)
    private UUID staffUserId;

    @Column(name = "checkin_at", nullable = false)
    private OffsetDateTime checkinAt;

    @Column(name = "checkout_at")
    private OffsetDateTime checkoutAt;

    @Column(name = "note")
    private String note;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
