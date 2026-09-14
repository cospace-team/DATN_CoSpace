package com.cospace.app.dto.api;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * DTOs for the customer AI chatbot (Gemini-powered).
 * Used by ChatbotController / ChatbotService.
 */
public class ChatDto {

    private ChatDto() {
    }

    /** One turn of the conversation, as kept by the frontend and replayed on every request. */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ChatTurn {
        /** "user" or "model" */
        private String role;
        private String text;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ChatMessageRequest {
        @NotBlank
        private String message;
        private List<ChatTurn> history;
    }

    /** An action the model wants to take but that requires explicit user confirmation. */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PendingAction {
        /** create_booking | cancel_booking | add_extra_service */
        private String type;
        private String summary;
        private Map<String, Object> args;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ChatMessageResponse {
        private String reply;
        private PendingAction pendingAction;
        private List<ChatTurn> history;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ChatActionConfirmRequest {
        @NotBlank
        private String type;
        private Map<String, Object> args;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ChatActionResult {
        private String reply;
        private BookingDto booking;
    }
}
