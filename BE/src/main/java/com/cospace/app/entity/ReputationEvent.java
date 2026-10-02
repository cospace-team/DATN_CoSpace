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

/** One change to a customer's reputation score (điểm uy tín), e.g. a penalty for a missed check-in. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "reputation_events")
public class ReputationEvent {

    /** Not checked in within the deadline after the booking started (or never checked in at all). */
    public static final String REASON_MISSED_CHECKIN = "missed_checkin";

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "booking_id")
    private UUID bookingId;

    @Column(nullable = false, length = 32)
    private String reason;

    /** Signed change applied to the score (negative for a penalty). */
    @Column(nullable = false)
    private int delta;

    @Column(name = "score_after", nullable = false)
    private int scoreAfter;

    @Column(length = 255)
    private String note;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = OffsetDateTime.now(ZoneOffset.UTC);
    }
}
