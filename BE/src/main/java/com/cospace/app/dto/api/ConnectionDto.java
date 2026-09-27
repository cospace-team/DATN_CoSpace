package com.cospace.app.dto.api;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/** Member connections and the profile a member sees of another one. */
public final class ConnectionDto {

    private ConnectionDto() {
    }

    /** Where the viewer stands with another member. */
    public static final String STATE_NONE = "none";
    public static final String STATE_OUTGOING = "pending_outgoing";
    public static final String STATE_INCOMING = "pending_incoming";
    public static final String STATE_CONNECTED = "connected";

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SendRequest {
        @NotNull(message = "Vui lòng chọn thành viên muốn kết nối")
        private UUID userId;

        @Size(max = 500, message = "Lời nhắn tối đa 500 ký tự")
        private String message;
    }

    /** Another member's profile as the viewer is allowed to see it. */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MemberProfile {
        private UUID userId;
        private String name;
        private String avatarUrl;
        private String profession;
        private String company;
        private String bio;
        private List<String> skills;
        private String branchName;
        private OffsetDateTime memberSince;
        /** none | pending_outgoing | pending_incoming | connected */
        private String connectionState;
        private UUID connectionId;
        private String connectionMessage;
        /** True when contact details below are filled in (connected, or the member made them public). */
        private boolean contactVisible;
        private boolean contactPublic;
        private String email;
        private String phone;
        private String linkedin;
        private String github;
        private String facebook;
        private String website;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ConnectionItem {
        private UUID id;
        /** pending_outgoing | pending_incoming | connected */
        private String state;
        private String message;
        private OffsetDateTime createdAt;
        private OffsetDateTime respondedAt;
        private MemberProfile member;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Overview {
        private List<ConnectionItem> incoming;
        private List<ConnectionItem> outgoing;
        private List<ConnectionItem> connected;
    }
}
