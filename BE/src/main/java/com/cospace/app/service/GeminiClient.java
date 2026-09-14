package com.cospace.app.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Thin wrapper around the Gemini generateContent REST API.
 * Kept dependency-free (no Google SDK) to match the rest of this codebase's
 * pattern of calling third-party HTTP APIs directly (see PayosService/MomoService).
 */
@Service
@Slf4j
public class GeminiClient {

    /** Gemini returns these when a model is momentarily overloaded rather than when our call is wrong. */
    private static final Set<Integer> RETRYABLE_STATUSES = Set.of(429, 500, 502, 503, 504);
    private static final long BACKOFF_MS = 800;

    @Value("${gemini.api-key:}")
    private String apiKey;

    @Value("${gemini.model:gemini-3.5-flash}")
    private String model;

    @Value("${gemini.fallback-model:gemini-3.7-flash}")
    private String fallbackModel;

    @Value("${gemini.base-url:https://generativelanguage.googleapis.com/v1beta}")
    private String baseUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    /**
     * Calls generateContent with the given conversation and tool declarations.
     * Retries an overloaded model, then falls back to a second model, before giving up.
     */
    public JsonNode generateContent(String systemInstruction, List<Map<String, Object>> contents,
            List<Map<String, Object>> functionDeclarations) {
        if (!isConfigured()) {
            throw new IllegalStateException("GEMINI_API_KEY chưa được cấu hình trên server.");
        }

        String requestJson;
        try {
            requestJson = objectMapper.writeValueAsString(buildBody(systemInstruction, contents, functionDeclarations));
        } catch (Exception e) {
            throw new IllegalStateException("Không dựng được yêu cầu gửi tới trợ lý AI.", e);
        }

        // An overload is transient and usually affects one model at a time, so the second attempt
        // switches models rather than retrying the one that just refused us.
        List<String> attempts = new ArrayList<>();
        attempts.add(model);
        if (fallbackModel != null && !fallbackModel.isBlank() && !fallbackModel.equals(model)) {
            attempts.add(fallbackModel);
        }
        attempts.add(model);

        Set<String> quotaExhausted = new HashSet<>();
        int lastStatus = 0;

        for (int i = 0; i < attempts.size(); i++) {
            String attemptModel = attempts.get(i);
            // A spent free-tier quota resets in tens of seconds, so re-asking the same model within
            // this request only burns time.
            if (quotaExhausted.contains(attemptModel)) {
                continue;
            }
            if (i > 0) {
                sleep(BACKOFF_MS * i);
            }
            try {
                return call(attemptModel, requestJson);
            } catch (HttpStatusCodeException e) {
                int status = e.getStatusCode().value();
                if (!RETRYABLE_STATUSES.contains(status)) {
                    log.warn("Gemini API error " + status + " on " + attemptModel + ": {}",
                            e.getResponseBodyAsString());
                    throw new IllegalStateException(messageFor(status), e);
                }
                lastStatus = status;
                if (status == 429) {
                    quotaExhausted.add(attemptModel);
                }
                log.warn("Gemini model " + attemptModel + " returned " + status + ", retrying (attempt "
                        + (i + 1) + "/" + attempts.size() + ")");
            } catch (Exception e) {
                log.error("Gemini API call failed on {}", attemptModel, e);
                throw new IllegalStateException("Không thể kết nối tới trợ lý AI lúc này.", e);
            }
        }

        throw new IllegalStateException(lastStatus == 429
                ? "Đã chạm giới hạn miễn phí của Gemini (khoảng 20 lượt/phút cho mỗi model). "
                        + "Bạn đợi khoảng một phút rồi thử lại giúp mình nhé."
                : "Trợ lý AI đang quá tải, bạn vui lòng thử lại sau ít phút nhé.");
    }

    private Map<String, Object> buildBody(String systemInstruction, List<Map<String, Object>> contents,
            List<Map<String, Object>> functionDeclarations) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("systemInstruction", Map.of("parts", List.of(Map.of("text", systemInstruction))));
        body.put("contents", contents);
        if (functionDeclarations != null && !functionDeclarations.isEmpty()) {
            body.put("tools", List.of(Map.of("functionDeclarations", functionDeclarations)));
        }
        // Picking a tool from a fixed list does not need deep reasoning, and low thinking cut a
        // measured booking-style call from ~3.4s to ~1.5s on the same model.
        body.put("generationConfig", Map.of(
                "temperature", 0.3,
                "thinkingConfig", Map.of("thinkingLevel", "low")));
        return body;
    }

    private JsonNode call(String targetModel, String requestJson) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String url = baseUrl + "/models/" + targetModel + ":generateContent?key=" + apiKey;
        ResponseEntity<String> response = restTemplate.exchange(
                url, HttpMethod.POST, new HttpEntity<>(requestJson, headers), String.class);
        return objectMapper.readTree(response.getBody());
    }

    private String messageFor(int status) {
        if (status == 401 || status == 403) {
            return "Khóa API của trợ lý AI không hợp lệ hoặc đã hết hạn.";
        }
        if (status == 404) {
            return "Model AI đang cấu hình không khả dụng. Vui lòng kiểm tra lại GEMINI_MODEL.";
        }
        return "Không thể kết nối tới trợ lý AI lúc này (lỗi " + status + ").";
    }

    private void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
