package com.cospace.app.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "payos")
public class PayosConfig {
    private String endpoint = "https://api-merchant.payos.vn";
    private String clientId = "demo-client-id";
    private String apiKey = "demo-api-key";
    private String checksumKey = "demo-checksum-key";
    private String returnUrl = "http://localhost:8080/api/payments/payos/return";
    private String cancelUrl = "http://localhost:5173/customer/checkout";
}
