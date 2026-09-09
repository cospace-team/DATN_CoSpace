package com.cospace.app.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "profile_interests")
@IdClass(ProfileInterest.ProfileInterestId.class)
public class ProfileInterest {

    @Id
    @Column(name = "profile_user_id", nullable = false)
    private UUID profileUserId;

    @Id
    @Column(name = "tag_id", nullable = false)
    private UUID tagId;

    @Column(nullable = false)
    @Builder.Default
    private short priority = 3;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProfileInterestId implements Serializable {
        private UUID profileUserId;
        private UUID tagId;
    }
}
