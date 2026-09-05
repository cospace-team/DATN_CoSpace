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
public class NetworkingProfileDto {

    private UUID userId;
    private String fullName;
    private String avatarUrl;
    private String bio;
    private String profession;
    private String company;
    private String contactEmail;
    private String contactPhone;
    private String contactLink;
    private boolean contactPublic;
    private UUID primaryBranchId;

    private List<SkillItemDto> skills;
    private List<InterestItemDto> interests;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SkillItemDto {
        private UUID tagId;
        private String tagName;
        private short level;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class InterestItemDto {
        private UUID tagId;
        private String tagName;
        private short priority;
    }
}
