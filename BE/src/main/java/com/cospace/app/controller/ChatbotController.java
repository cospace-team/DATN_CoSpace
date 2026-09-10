package com.cospace.app.controller;

import com.cospace.app.dto.api.ChatDto.ChatActionConfirmRequest;
import com.cospace.app.dto.api.ChatDto.ChatActionResult;
import com.cospace.app.dto.api.ChatDto.ChatMessageRequest;
import com.cospace.app.dto.api.ChatDto.ChatMessageResponse;
import com.cospace.app.service.ChatbotService;
import jakarta.annotation.PreDestroy;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@RestController
@RequestMapping("/api/chatbot")
@Slf4j
public class ChatbotController {

    /** A turn runs several Gemini round trips, so allow well past a single call's latency. */
    private static final long STREAM_TIMEOUT_MS = 180_000L;

    private final ChatbotService chatbotService;
    private final ExecutorService executor = Executors.newFixedThreadPool(8);

    public ChatbotController(ChatbotService chatbotService) {
        this.chatbotService = chatbotService;
    }

    /**
     * Streams the turn as Server-Sent Events: a "progress" event per real step the assistant takes,
     * then one "result" event, or an "error" event. Response status is already committed once the
     * stream opens, so failures travel as an event rather than an HTTP error code.
     */
    @PostMapping(value = "/message", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter message(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ChatMessageRequest req) {
        UUID userId = requireSubject(jwt);
        SseEmitter emitter = new SseEmitter(STREAM_TIMEOUT_MS);

        executor.execute(() -> {
            try {
                ChatMessageResponse res = chatbotService.chat(userId, req,
                        label -> emit(emitter, "progress", Map.of("label", label)));
                emit(emitter, "result", res);
                emitter.complete();
            } catch (Exception e) {
                log.warn("Chatbot turn failed: " + e.getMessage());
                String message = e.getMessage() != null ? e.getMessage() : "Trợ lý AI đang gặp sự cố.";
                emit(emitter, "error", Map.of("message", message));
                emitter.complete();
            }
        });

        return emitter;
    }

    @PostMapping("/actions/confirm")
    public ChatActionResult confirm(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ChatActionConfirmRequest req) {
        return chatbotService.confirmAction(requireSubject(jwt), req);
    }

    private void emit(SseEmitter emitter, String event, Object data) {
        try {
            emitter.send(SseEmitter.event().name(event).data(data, MediaType.APPLICATION_JSON));
        } catch (IOException | IllegalStateException e) {
            // The client hung up (closed the widget, navigated away). Nothing left to send to.
            log.debug("Dropped chatbot SSE event " + event + ": " + e.getMessage());
        }
    }

    @PreDestroy
    void shutdown() {
        executor.shutdown();
    }

    private UUID requireSubject(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            throw new IllegalArgumentException("Missing JWT subject");
        }
        return UUID.fromString(jwt.getSubject());
    }
}
