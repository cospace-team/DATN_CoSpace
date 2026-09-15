package com.cospace.app.service;

import com.cospace.app.config.PayosConfig;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class PayosServiceTest {

    private static final String CHECKSUM_KEY = "test-checksum-key";

    private static PayosService serviceWithClientId(String clientId) {
        PayosConfig config = new PayosConfig();
        config.setClientId(clientId);
        config.setChecksumKey(CHECKSUM_KEY);
        PayosService service = new PayosService(config);
        ReflectionTestUtils.setField(service, "frontendBaseUrl", "https://cospace.example");
        return service;
    }

    private static String hmacSha256Hex(String data, String key) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
    }

    private static Map<String, Object> webhookData() {
        // Deliberately not in alphabetical order: the signature must be computed over sorted keys.
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("orderCode", 123456789L);
        data.put("amount", 150000);
        data.put("description", "BK WH ABC234");
        data.put("code", "00");
        data.put("reference", "FT123");
        return data;
    }

    private static String signatureOf(Map<String, Object> data) throws Exception {
        String raw = "amount=150000&code=00&description=BK WH ABC234&orderCode=123456789&reference=FT123";
        assertThat(data).hasSize(5);
        return hmacSha256Hex(raw, CHECKSUM_KEY);
    }

    @Nested
    class WebhookSignatureWithRealCredentials {

        private final PayosService service = serviceWithClientId("real-client-id");

        @Test
        void acceptsValidSignature() throws Exception {
            Map<String, Object> data = webhookData();

            assertThat(service.verifyWebhookSignature(data, signatureOf(data))).isTrue();
        }

        @Test
        void acceptsUppercaseSignature() throws Exception {
            Map<String, Object> data = webhookData();

            assertThat(service.verifyWebhookSignature(data, signatureOf(data).toUpperCase())).isTrue();
        }

        @Test
        void rejectsTamperedAmount() throws Exception {
            Map<String, Object> data = webhookData();
            String signature = signatureOf(data);
            data.put("amount", 1000);

            assertThat(service.verifyWebhookSignature(data, signature)).isFalse();
        }

        @Test
        void rejectsSignatureMadeWithAnotherKey() throws Exception {
            String raw = "amount=150000&code=00&description=BK WH ABC234&orderCode=123456789&reference=FT123";

            assertThat(service.verifyWebhookSignature(webhookData(), hmacSha256Hex(raw, "attacker-key"))).isFalse();
        }

        @Test
        void rejectsMissingSignatureOrData() {
            assertThat(service.verifyWebhookSignature(webhookData(), null)).isFalse();
            assertThat(service.verifyWebhookSignature(webhookData(), "  ")).isFalse();
            assertThat(service.verifyWebhookSignature(null, "abc")).isFalse();
        }

        @Test
        void skipsNullValuesWhenBuildingSignature() throws Exception {
            Map<String, Object> data = new HashMap<>(webhookData());
            String signature = signatureOf(webhookData());
            data.put("counterAccountName", null);

            assertThat(service.verifyWebhookSignature(data, signature)).isTrue();
        }
    }

    @Nested
    class DemoMode {

        @Test
        void createPaymentLinkRoutesToInternalVietQrScreen() {
            PayosService service = serviceWithClientId("demo-client-id");

            Map<String, Object> result = service.createPaymentLink(987L, 50_000L, "BK WH-ABC234", "2026-09-14T10:15:00Z");

            assertThat(result.get("status")).isEqualTo("PENDING");
            assertThat(result.get("orderCode")).isEqualTo(987L);
            assertThat((String) result.get("checkoutUrl"))
                    .startsWith("https://cospace.example/customer/payment/vietqr?orderCode=987")
                    .contains("amount=50000")
                    .contains("paymentDeadlineAt=2026-09-14T10%3A15%3A00Z");
        }

        @Test
        void descriptionIsSanitizedToPayosRules() {
            PayosService service = serviceWithClientId("demo-client-id");

            Map<String, Object> result = service.createPaymentLink(1L, 1L, "Thanh toán đơn #WH-ABC234 cho khách hàng rất dài");

            String checkoutUrl = (String) result.get("checkoutUrl");
            String description = java.net.URLDecoder.decode(
                    checkoutUrl.substring(checkoutUrl.indexOf("description=") + "description=".length()),
                    StandardCharsets.UTF_8);
            assertThat(description).matches("[a-zA-Z0-9 ]{1,25}");
        }

        @Test
        void emptyDescriptionFallsBackToDefault() {
            PayosService service = serviceWithClientId("demo-client-id");

            Map<String, Object> result = service.createPaymentLink(1L, 1L, "###");

            assertThat((String) result.get("checkoutUrl")).contains("description=Thanh+toan+CoSpace");
        }

        @Test
        void demoModeMustNotAcceptForgedSignature() {
            PayosService service = serviceWithClientId("demo-client-id");

            assertThat(service.verifyWebhookSignature(webhookData(), "forged-signature")).isFalse();
        }

        @Test
        void demoModeRejectsEvenSignaturesMadeWithTheConfiguredKey() throws Exception {
            // The demo checksum key ships in the repo, so a "valid" signature proves nothing.
            PayosService service = serviceWithClientId("demo-client-id");
            Map<String, Object> data = webhookData();

            assertThat(service.verifyWebhookSignature(data, signatureOf(data))).isFalse();
        }

        @Test
        void demoModeCannotVerifyPaymentStatus() {
            assertThat(serviceWithClientId("demo-client-id").getPaymentLinkStatus(987L)).isNull();
            assertThat(serviceWithClientId("").getPaymentLinkStatus(987L)).isNull();
        }
    }

    @Nested
    class PayosApiWithRealCredentials {

        private final PayosService service = serviceWithClientId("real-client-id");
        private final MockRestServiceServer server = MockRestServiceServer.bindTo(
                (RestTemplate) ReflectionTestUtils.getField(service, "restTemplate")).build();

        @Test
        void paymentLinkStatusIsReadFromPayos() {
            server.expect(requestTo("https://api-merchant.payos.vn/v2/payment-requests/987"))
                    .andExpect(method(HttpMethod.GET))
                    .andExpect(header("x-client-id", "real-client-id"))
                    .andRespond(withSuccess("""
                            {"code":"00","desc":"success","data":{"orderCode":987,"amount":150000,
                             "amountPaid":150000,"amountRemaining":0,"status":"PAID"}}""", MediaType.APPLICATION_JSON));

            PayosService.PaymentLinkStatus status = service.getPaymentLinkStatus(987L);

            server.verify();
            assertThat(status).isNotNull();
            assertThat(status.isPaid()).isTrue();
            assertThat(status.amount()).isEqualTo(150_000L);
            assertThat(status.amountPaid()).isEqualTo(150_000L);
        }

        @Test
        void errorCodeFromPayosMeansUnverified() {
            server.expect(requestTo("https://api-merchant.payos.vn/v2/payment-requests/987"))
                    .andRespond(withSuccess("{\"code\":\"101\",\"desc\":\"not found\",\"data\":null}", MediaType.APPLICATION_JSON));

            assertThat(service.getPaymentLinkStatus(987L)).isNull();
        }

        @Test
        void networkFailureMeansUnverified() {
            server.expect(requestTo("https://api-merchant.payos.vn/v2/payment-requests/987"))
                    .andRespond(withServerError());

            assertThat(service.getPaymentLinkStatus(987L)).isNull();
        }

        @Test
        void createPaymentLinkReturnsPayosCheckoutUrl() {
            server.expect(requestTo("https://api-merchant.payos.vn/v2/payment-requests"))
                    .andExpect(method(HttpMethod.POST))
                    .andRespond(withSuccess("""
                            {"code":"00","data":{"orderCode":987,"checkoutUrl":"https://pay.payos.vn/web/abc",
                             "qrCode":"000201","status":"PENDING"}}""", MediaType.APPLICATION_JSON));

            Map<String, Object> result = service.createPaymentLink(987L, 150_000L, "BK WH ABC234");

            assertThat(result.get("checkoutUrl")).isEqualTo("https://pay.payos.vn/web/abc");
            assertThat(result.get("status")).isEqualTo("PENDING");
        }

        @Test
        void createPaymentLinkFailureNeverFallsBackToAPaidReturnUrl() {
            server.expect(requestTo("https://api-merchant.payos.vn/v2/payment-requests"))
                    .andRespond(withServerError());

            assertThatThrownBy(() -> service.createPaymentLink(987L, 150_000L, "BK WH ABC234"))
                    .isInstanceOf(IllegalStateException.class);
        }
    }
}
