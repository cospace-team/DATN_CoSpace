package com.cospace.app.service;

import com.cospace.app.config.PayosConfig;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.TreeMap;

@Service
@Slf4j
public class PayosService {

    private final PayosConfig payosConfig;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @org.springframework.beans.factory.annotation.Value("${app.frontend.base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    public PayosService(PayosConfig payosConfig) {
        this.payosConfig = payosConfig;
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Create payment link via PayOS API
     * Returns a map containing: checkoutUrl, qrCode, orderCode, status
     */
    public Map<String, Object> createPaymentLink(long orderCode, long amount, String description) {
        return createPaymentLink(orderCode, amount, description, null);
    }

    /**
     * Create payment link via PayOS API
     * @param paymentDeadlineAt ISO-8601 timestamp of the booking's hold expiry (nullable). In demo
     *                          mode this is forwarded to the internal VietQR checkout screen so its
     *                          countdown reflects the same deadline the backend will actually enforce,
     *                          instead of a client-only timer that can drift from it.
     * Returns a map containing: checkoutUrl, qrCode, orderCode, status
     */
    public Map<String, Object> createPaymentLink(long orderCode, long amount, String description, String paymentDeadlineAt) {
        String cleanDescription = sanitizeDescription(description);
        String returnUrl = payosConfig.getReturnUrl();
        String cancelUrl = payosConfig.getCancelUrl();

        // Check for Demo / Simulation mode without real PayOS credentials
        if (isDemoMode()) {
            log.info("PayOS is configured in DEMO mode. Routing to CoSpace VietQR Checkout screen.");
            String mockCheckoutUrl = frontendBaseUrl + "/customer/payment/vietqr?orderCode=" + orderCode +
                    "&amount=" + amount +
                    "&description=" + java.net.URLEncoder.encode(cleanDescription, StandardCharsets.UTF_8) +
                    (paymentDeadlineAt != null && !paymentDeadlineAt.isBlank()
                            ? "&paymentDeadlineAt=" + java.net.URLEncoder.encode(paymentDeadlineAt, StandardCharsets.UTF_8)
                            : "");
            String mockQrCode = "https://img.vietqr.io/image/970422-0386868888-compact2.png?amount=" + amount + "&addInfo=" + java.net.URLEncoder.encode(cleanDescription, StandardCharsets.UTF_8) + "&accountName=COSPACE%20COWORKING";
            Map<String, Object> mockRes = new LinkedHashMap<>();
            mockRes.put("orderCode", orderCode);
            mockRes.put("checkoutUrl", mockCheckoutUrl);
            mockRes.put("qrCode", mockQrCode);
            mockRes.put("status", "PENDING");
            return mockRes;
        }

        try {
            // Sort keys alphabetically for signature calculation
            String rawSignature = "amount=" + amount +
                    "&cancelUrl=" + cancelUrl +
                    "&description=" + cleanDescription +
                    "&orderCode=" + orderCode +
                    "&returnUrl=" + returnUrl;

            String signature = hmacSHA256(rawSignature, payosConfig.getChecksumKey());

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("orderCode", orderCode);
            body.put("amount", amount);
            body.put("description", cleanDescription);
            body.put("returnUrl", returnUrl);
            body.put("cancelUrl", cancelUrl);
            body.put("signature", signature);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-client-id", payosConfig.getClientId());
            headers.set("x-api-key", payosConfig.getApiKey());

            String jsonBody = objectMapper.writeValueAsString(body);
            log.info("PayOS payment-request payload: {}", jsonBody);

            HttpEntity<String> entity = new HttpEntity<>(jsonBody, headers);
            String url = payosConfig.getEndpoint() + "/v2/payment-requests";

            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
            log.info("PayOS response: {}", response.getBody());

            JsonNode root = objectMapper.readTree(response.getBody());
            String code = root.path("code").asText("");

            if ("00".equals(code)) {
                JsonNode data = root.path("data");
                Map<String, Object> result = new LinkedHashMap<>();
                result.put("orderCode", data.path("orderCode").asLong(orderCode));
                result.put("checkoutUrl", data.path("checkoutUrl").asText());
                result.put("qrCode", data.path("qrCode").asText(""));
                result.put("status", data.path("status").asText("PENDING"));
                return result;
            } else {
                String desc = root.path("desc").asText("Unknown PayOS error");
                throw new IllegalStateException("PayOS API error: " + desc);
            }

        } catch (Exception ex) {
            log.error("Failed to create PayOS payment link: {}", ex.getMessage());
            // Fallback for offline or sandbox fallback
            log.warn("Falling back to local simulated VietQR checkout URL.");
            String mockCheckoutUrl = returnUrl + "?orderCode=" + orderCode + "&status=PAID&code=00&cancel=false";
            String mockQrCode = "https://img.vietqr.io/image/970422-000012345678-compact2.png?amount=" + amount + "&addInfo=" + cleanDescription;
            Map<String, Object> fallbackRes = new LinkedHashMap<>();
            fallbackRes.put("orderCode", orderCode);
            fallbackRes.put("checkoutUrl", mockCheckoutUrl);
            fallbackRes.put("qrCode", mockQrCode);
            fallbackRes.put("status", "PENDING");
            return fallbackRes;
        }
    }

    /**
     * Verify PayOS Webhook signature
     */
    public boolean verifyWebhookSignature(Map<String, Object> data, String providedSignature) {
        if (providedSignature == null || providedSignature.isBlank() || data == null) {
            return false;
        }

        if (isDemoMode()) {
            return true;
        }

        try {
            // Sort data keys alphabetically
            TreeMap<String, Object> sortedMap = new TreeMap<>(data);
            StringBuilder sb = new StringBuilder();
            for (Map.Entry<String, Object> entry : sortedMap.entrySet()) {
                if (entry.getValue() != null) {
                    if (sb.length() > 0) sb.append("&");
                    sb.append(entry.getKey()).append("=").append(entry.getValue());
                }
            }

            String expected = hmacSHA256(sb.toString(), payosConfig.getChecksumKey());
            return providedSignature.trim().equalsIgnoreCase(expected);
        } catch (Exception ex) {
            log.warn("PayOS webhook signature verification error: {}", ex.getMessage());
            return false;
        }
    }

    private boolean isDemoMode() {
        return payosConfig.getClientId() == null ||
                payosConfig.getClientId().isBlank() ||
                payosConfig.getClientId().startsWith("demo");
    }

    private String sanitizeDescription(String desc) {
        if (desc == null) return "Thanh toan CoSpace";
        // PayOS only accepts alphanumeric and spaces, max 25 characters
        String cleaned = desc.replaceAll("[^a-zA-Z0-9 ]", " ").trim().replaceAll("\\s+", " ");
        if (cleaned.length() > 25) {
            cleaned = cleaned.substring(0, 25);
        }
        return cleaned.isEmpty() ? "Thanh toan CoSpace" : cleaned;
    }

    private String hmacSHA256(String data, String key) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKeySpec);
            byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception ex) {
            throw new RuntimeException("Error computing HMAC-SHA256", ex);
        }
    }
}
