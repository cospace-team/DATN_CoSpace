package com.example.momosandbox.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ApiHealthController {

    private final JdbcTemplate jdbcTemplate;

    public ApiHealthController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("service", "momo-sandbox");
        payload.put("timestamp", Instant.now().toString());

        try {
            Integer dbProbe = jdbcTemplate.queryForObject("select 1", Integer.class);
            payload.put("status", "UP");
            payload.put("database", (dbProbe != null && dbProbe == 1) ? "UP" : "UNKNOWN");
            return ResponseEntity.ok(payload);
        } catch (Exception ex) {
            payload.put("status", "DOWN");
            payload.put("database", "DOWN");
            payload.put("error", ex.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(payload);
        }
    }
}
