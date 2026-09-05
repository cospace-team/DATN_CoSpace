package com.cospace.app.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "profile_match_scores")
@IdClass(ProfileMatchScore.ProfileMatchScoreId.class)
public class ProfileMatchScore {

    @Id
    @Column(name = "profile_user_id", nullable = false)
    private UUID profileUserId;

    @Id
    @Column(name = "matched_user_id", nullable = false)
    private UUID matchedUserId;

    @Column(nullable = false, precision = 6, scale = 4)
    private BigDecimal score;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "reasons_json", columnDefinition = "jsonb")
    private Map<String, Object> reasonsJson;

    @Column(name = "computed_at", nullable = false)
    private OffsetDateTime computedAt;

    @PrePersist
    void prePersist() {
        if (computedAt == null) computedAt = OffsetDateTime.now(ZoneOffset.UTC);
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProfileMatchScoreId implements Serializable {
        private UUID profileUserId;
        private UUID matchedUserId;
    }
}
