package com.cospace.app.dto.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/** A reply under a community post, with who wrote it. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostCommentDto {
    private UUID id;
    private UUID postId;
    private UUID authorId;
    private String authorName;
    private String authorAvatar;
    private String authorProfession;
    private String content;
    private String createdAt;
    /** The viewer wrote it, so they may delete it. */
    private boolean mine;
}
