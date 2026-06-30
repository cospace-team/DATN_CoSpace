package com.example.momosandbox.service;

import com.example.momosandbox.dto.MomoRequest;
import com.example.momosandbox.dto.MomoResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

@Service
public class MomoService {
    private static final Logger logger = LoggerFactory.getLogger(MomoService.class);

    @Value("${momo.endpoint}")
    private String endpoint;

    @Value("${momo.partner-code}")
    private String partnerCode;

    @Value("${momo.access-key}")
    private String accessKey;

    @Value("${momo.secret-key}")
    private String secretKey;

    @Value("${momo.return-url}")
    private String returnUrl;

    @Value("${momo.notify-url}")
    private String notifyUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public MomoResponse createPayment(MomoRequest req) {
        return createPaymentInternal(req.getOrderId(), req.getRequestId(), req.getAmount(), req.getOrderInfo(),
                req.getAutoCapture());
    }

    /** Used by internal APIs (bookings/payments flow). */
    public MomoResponse createPayment(String orderId, String requestId, long amount, String orderInfo) {
        return createPaymentInternal(orderId, requestId, amount, orderInfo, "true");
    }

    /**
     * Verify MoMo callback signature for returnUrl/IPN.
     * raw signature order (MoMo docs):
     * accessKey, amount, extraData, message, orderId, orderInfo, orderType,
     * partnerCode, payType,
     * requestId, responseTime, resultCode, transId
     */
    public boolean verifyCallbackSignature(Map<String, String> params, String providedSignature) {
        if (providedSignature == null || providedSignature.isBlank()) {
            return false;
        }

        String raw = buildCallbackRawSignature(params);
        try {
            String expected = hmacSHA256(raw, secretKey);
            return providedSignature.trim().equalsIgnoreCase(expected);
        } catch (Exception e) {
            logger.warn("Failed to verify MoMo signature: {}", e.getMessage());
            return false;
        }
    }

    private String buildCallbackRawSignature(Map<String, String> params) {
        Map<String, String> p = params == null ? Map.of() : params;

        String amount = Objects.toString(p.get("amount"), "");
        String extraData = Objects.toString(p.get("extraData"), "");
        String message = Objects.toString(p.get("message"), "");
        String orderId = Objects.toString(p.get("orderId"), "");
        String orderInfo = Objects.toString(p.get("orderInfo"), "");
        String orderType = Objects.toString(p.get("orderType"), "");
        String payType = Objects.toString(p.get("payType"), "");
        String requestId = Objects.toString(p.get("requestId"), "");
        String responseTime = Objects.toString(p.get("responseTime"), "");
        String resultCode = Objects.toString(p.get("resultCode"), "");
        String transId = Objects.toString(p.get("transId"), "");

        return "accessKey=" + accessKey +
                "&amount=" + amount +
                "&extraData=" + extraData +
                "&message=" + message +
                "&orderId=" + orderId +
                "&orderInfo=" + orderInfo +
                "&orderType=" + orderType +
                "&partnerCode=" + partnerCode +
                "&payType=" + payType +
                "&requestId=" + requestId +
                "&responseTime=" + responseTime +
                "&resultCode=" + resultCode +
                "&transId=" + transId;
    }

    private MomoResponse createPaymentInternal(String orderId, String requestId, long amountValue, String orderInfo,
            String autoCapture) {
        try {
            String amount = String.valueOf(amountValue);
            String requestType = "captureWallet";
            String extraData = "";

            // Tạo raw signature theo thứ tự của MoMo
            String rawSignature = "accessKey=" + accessKey +
                    "&amount=" + amount +
                    "&extraData=" + extraData +
                    "&ipnUrl=" + notifyUrl +
                    "&orderId=" + orderId +
                    "&orderInfo=" + orderInfo +
                    "&partnerCode=" + partnerCode +
                    "&redirectUrl=" + returnUrl +
                    "&requestId=" + requestId +
                    "&requestType=" + requestType;

            String signature = hmacSHA256(rawSignature, secretKey);

            logger.info("Raw signature: {}", rawSignature);
            logger.info("Signature: {}", signature);

            // Tạo request body
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("partnerCode", partnerCode);
            body.put("accessKey", accessKey);
            body.put("requestId", requestId);
            body.put("amount", amount);
            body.put("orderId", orderId);
            body.put("orderInfo", orderInfo);
            body.put("redirectUrl", returnUrl);
            body.put("ipnUrl", notifyUrl);
            body.put("extraData", extraData);
            body.put("requestType", requestType);
            body.put("autoCapture", autoCapture);
            body.put("signature", signature);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            String jsonBody = objectMapper.writeValueAsString(body);
            logger.info("Request body: {}", jsonBody);

            HttpEntity<String> httpEntity = new HttpEntity<>(jsonBody, headers);

            ResponseEntity<MomoResponse> response = restTemplate.exchange(
                    endpoint,
                    HttpMethod.POST,
                    httpEntity,
                    MomoResponse.class);

            logger.info("MoMo response: {}", response.getBody());
            return response.getBody();

        } catch (Exception ex) {
            logger.error("Lỗi tạo payment: ", ex);
            MomoResponse error = new MomoResponse();
            error.setResultCode(-1);
            error.setErrorCode(-1);
            error.setMessage("Lỗi tạo payment: " + ex.getMessage());
            return error;
        }
    }

    private String hmacSHA256(String data, String key) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKey = new SecretKeySpec(
                key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        mac.init(secretKey);
        byte[] digest = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));

        StringBuilder hex = new StringBuilder();
        for (byte b : digest) {
            hex.append(String.format("%02x", b));
        }
        return hex.toString();
    }
}
