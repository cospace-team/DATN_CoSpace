package com.cospace.app.controller;

import com.cospace.app.dto.api.NetworkingProfileDto;
import com.cospace.app.dto.api.PartnerSuggestionDto;
import com.cospace.app.service.PartnerMatchingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class PartnerMatchingController {

    private final PartnerMatchingService partnerMatchingService;

    @GetMapping({"/api/matching/suggestions", "/api/suggested-partners"})
    public ResponseEntity<?> getSuggestedPartners(@AuthenticationPrincipal Jwt jwt) {
        try {
            UUID userId = extractUserId(jwt);
            List<PartnerSuggestionDto> suggestions = partnerMatchingService.suggestPartners(userId);
            return ResponseEntity.ok(Map.of("data", suggestions));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/api/profiles/me/networking")
    public ResponseEntity<?> getMyNetworkingProfile(@AuthenticationPrincipal Jwt jwt) {
        try {
            UUID userId = extractUserId(jwt);
            NetworkingProfileDto profile = partnerMatchingService.getNetworkingProfile(userId);
            return ResponseEntity.ok(profile);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/api/profiles/me/networking")
    public ResponseEntity<?> updateMyNetworkingProfile(@AuthenticationPrincipal Jwt jwt,
                                                       @RequestBody NetworkingProfileDto req) {
        try {
            UUID userId = extractUserId(jwt);
            NetworkingProfileDto updated = partnerMatchingService.updateNetworkingProfile(userId, req);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private UUID extractUserId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            throw new IllegalArgumentException("Người dùng chưa được xác thực");
        }
        return UUID.fromString(jwt.getSubject());
    }
}
