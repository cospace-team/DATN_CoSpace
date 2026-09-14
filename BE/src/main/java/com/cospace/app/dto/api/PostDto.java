package com.cospace.app.dto.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostDto {

    private UUID id;
    private String title;
    private String content;
    private String postType;
    private UUID branchId;
    private String branchName;
    private String createdAt;

    private UUID authorId;
    private String authorName;
    private String authorAvatar;
    private String authorProfession;
    private String authorCompany;

    private List<String> tags;

    /** 0-100: how well this post lines up with the viewer's own skills, interests and posts. */
    private int relevanceScore;

    /** The tags the viewer has in common with this post — why it surfaced for them. */
    private List<String> matchedTags;

    private boolean mine;
}
