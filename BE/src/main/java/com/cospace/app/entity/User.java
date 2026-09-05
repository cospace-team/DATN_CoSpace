package com.cospace.app.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import io.hypersistence.utils.hibernate.type.basic.PostgreSQLEnumType;
import org.hibernate.annotations.Type;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "users")
public class User {

    public enum Status { active, suspended }
    public enum Role { admin, staff, customer }

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @Column(length = 255)
    private String password;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Column(length = 20)
    private String phone;

    @Column(name = "avatar_url", length = 2048)
    private String avatarUrl;

    @Enumerated(EnumType.STRING)
    @Type(PostgreSQLEnumType.class)
    @Column(columnDefinition = "user_status", nullable = false, length = 20)
    @Builder.Default
    private Status status = Status.active;

    @Enumerated(EnumType.STRING)
    @Type(PostgreSQLEnumType.class)
    @Column(columnDefinition = "user_role", nullable = false, length = 20)
    @Builder.Default
    private Role role = Role.customer;

    @Column(name = "branch_id")
    private UUID branchId;

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
        if (status == null) status = Status.active;
        if (role == null) role = Role.customer;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = OffsetDateTime.now(ZoneOffset.UTC);
    }
}
