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
public class PostCreateRequest {

    private String title;
    private String content;
    /** sharing, seeking_partner, question, event */
    private String postType;
    private UUID branchId;

    /**
     * Optional. Tags the author picked explicitly; anything they don't supply is filled in by
     * Gemini reading the post text, so posting stays a one-field action.
     */
    private List<UUID> tagIds;
}
