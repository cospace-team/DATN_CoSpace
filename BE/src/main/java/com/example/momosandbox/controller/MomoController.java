package com.example.momosandbox.controller;

import com.example.momosandbox.dto.MomoRequest;
import com.example.momosandbox.dto.MomoResponse;
import com.example.momosandbox.service.MomoService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/momo")
public class MomoController {
    private static final Logger logger = LoggerFactory.getLogger(MomoController.class);

    private final MomoService momoService;

    public MomoController(MomoService momoService) {
        this.momoService = momoService;
    }

    @PostMapping("/create")
    public ResponseEntity<MomoResponse> createPayment(@Valid @RequestBody MomoRequest req) {
        logger.info("Nhận request tạo payment: {}", req);
        MomoResponse res = momoService.createPayment(req);
        return ResponseEntity.ok(res);
    }

    @GetMapping("/return")
    public ResponseEntity<Map<String, Object>> returnUrl(
            @RequestParam String orderId,
            @RequestParam String requestId,
            @RequestParam(required = false) String resultCode,
            @RequestParam(required = false) String payUrl) {

        logger.info("Return từ MoMo: orderId={}, requestId={}, resultCode={}",
                orderId, requestId, resultCode);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "success");
        response.put("message", "Đã trả về từ MoMo");
        response.put("orderId", orderId);
        response.put("requestId", requestId);
        response.put("resultCode", resultCode);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/notify")
    public ResponseEntity<Map<String, Object>> notifyUrl(@RequestBody String body) {
        logger.info("Nhận notify callback từ MoMo: {}", body);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "ok");
        response.put("message", "Đã nhận notify");

        return ResponseEntity.ok(response);
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "UP");
        response.put("message", "MoMo Sandbox Demo is running");
        return ResponseEntity.ok(response);
    }
}
