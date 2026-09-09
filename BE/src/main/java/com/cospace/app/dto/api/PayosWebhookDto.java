package com.cospace.app.dto.api;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.Map;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class PayosWebhookDto {
    private String code;
    private String desc;
    private Map<String, Object> data;
    private String signature;
}
