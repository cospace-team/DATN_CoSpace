package com.cospace.app.dto.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PartnerSuggestionDto {

    private String id;
    private String name;
    private String profession;
    private String company;
    private String avatar;
    private int matchScore; // 0 to 100 percentage
    private List<String> commonTags;
    private boolean contactPublic;
    private String email;
    private String phone;
    private String bio;
    private String linkedin;
    private String github;
    private boolean isSameBranch;

    /** One-line, human-readable "why you two should meet" — written by Gemini when configured. */
    private String matchReason;

    /** Tags this person has written posts about that line up with the viewer. */
    private List<String> postTags;
}
