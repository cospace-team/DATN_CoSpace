package com.cospace.app.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class MomoServiceTest {

    private static final String ACCESS_KEY = "test-access-key";
    private static final String SECRET_KEY = "test-secret-key";
    private static final String PARTNER_CODE = "CSPARTNER";

    private MomoService momoService;

    @BeforeEach
    void setUp() {
        momoService = new MomoService();
        ReflectionTestUtils.setField(momoService, "accessKey", ACCESS_KEY);
        ReflectionTestUtils.setField(momoService, "secretKey", SECRET_KEY);
        ReflectionTestUtils.setField(momoService, "partnerCode", PARTNER_CODE);
    }

    private static Map<String, String> callbackParams() {
        Map<String, String> p = new HashMap<>();
        p.put("partnerCode", PARTNER_CODE);
        p.put("orderId", "PAY-ABCDEFGHJKLM");
        p.put("requestId", "req-1");
        p.put("amount", "150000");
        p.put("orderInfo", "Thanh toan don hang WH-ABC234");
        p.put("orderType", "momo_wallet");
        p.put("transId", "4088878653");
        p.put("resultCode", "0");
        p.put("message", "Successful.");
        p.put("payType", "qr");
        p.put("responseTime", "1721720663942");
        p.put("extraData", "");
        return p;
    }

    /** Raw signature in the exact field order documented by MoMo for return/IPN callbacks. */
    private static String expectedSignature(Map<String, String> p, String secret) throws Exception {
        String raw = "accessKey=" + ACCESS_KEY
                + "&amount=" + p.get("amount")
                + "&extraData=" + p.get("extraData")
                + "&message=" + p.get("message")
                + "&orderId=" + p.get("orderId")
                + "&orderInfo=" + p.get("orderInfo")
                + "&orderType=" + p.get("orderType")
                + "&partnerCode=" + PARTNER_CODE
                + "&payType=" + p.get("payType")
                + "&requestId=" + p.get("requestId")
                + "&responseTime=" + p.get("responseTime")
                + "&resultCode=" + p.get("resultCode")
                + "&transId=" + p.get("transId");
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(raw.getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    void acceptsValidCallbackSignature() throws Exception {
        Map<String, String> params = callbackParams();

        assertThat(momoService.verifyCallbackSignature(params, expectedSignature(params, SECRET_KEY))).isTrue();
    }

    @Test
    void rejectsTamperedResultCode() throws Exception {
        Map<String, String> params = callbackParams();
        params.put("resultCode", "1006");
        String signature = expectedSignature(params, SECRET_KEY);
        params.put("resultCode", "0");

        assertThat(momoService.verifyCallbackSignature(params, signature)).isFalse();
    }

    @Test
    void rejectsTamperedAmount() throws Exception {
        Map<String, String> params = callbackParams();
        String signature = expectedSignature(params, SECRET_KEY);
        params.put("amount", "1000");

        assertThat(momoService.verifyCallbackSignature(params, signature)).isFalse();
    }

    @Test
    void rejectsSignatureMadeWithAnotherSecret() throws Exception {
        Map<String, String> params = callbackParams();

        assertThat(momoService.verifyCallbackSignature(params, expectedSignature(params, "attacker"))).isFalse();
    }

    @Test
    void rejectsMissingSignature() {
        assertThat(momoService.verifyCallbackSignature(callbackParams(), null)).isFalse();
        assertThat(momoService.verifyCallbackSignature(callbackParams(), "")).isFalse();
    }

    @Test
    void handlesNullParamsWithoutThrowing() {
        assertThat(momoService.verifyCallbackSignature(null, "abc")).isFalse();
    }
}
