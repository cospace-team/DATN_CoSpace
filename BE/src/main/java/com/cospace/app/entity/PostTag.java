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
@Table(name = "post_tags")
@IdClass(PostTag.PostTagId.class)
public class PostTag {

    @Id
    @Column(name = "post_id", nullable = false)
    private UUID postId;

    @Id
    @Column(name = "tag_id", nullable = false)
    private UUID tagId;

    /** 'ai' when Gemini extracted it from the post text, 'manual' when the author picked it. */
    @Column(nullable = false, length = 16)
    @Builder.Default
    private String source = "ai";

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PostTagId implements Serializable {
        private UUID postId;
        private UUID tagId;
    }
}
