package com.cospace.app.controller;

import com.cospace.app.dto.api.ConnectionDto;
import com.cospace.app.service.PartnerConnectionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** Member connection requests and the profile a member sees of another one. */
@RestController
@RequiredArgsConstructor
public class PartnerConnectionController {

    private final PartnerConnectionService connectionService;

    @GetMapping("/api/connections")
    public ConnectionDto.Overview overview(@AuthenticationPrincipal Jwt jwt) {
        return connectionService.overview(callerId(jwt));
    }

    @PostMapping("/api/connections")
    public ResponseEntity<ConnectionDto.MemberProfile> send(@AuthenticationPrincipal Jwt jwt,
                                                            @Valid @RequestBody ConnectionDto.SendRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(connectionService.send(callerId(jwt), req.getUserId(), req.getMessage()));
    }

    @PostMapping("/api/connections/{id}/accept")
    public ConnectionDto.MemberProfile accept(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return connectionService.respond(callerId(jwt), id, true);
    }

    @PostMapping("/api/connections/{id}/decline")
    public ConnectionDto.MemberProfile decline(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return connectionService.respond(callerId(jwt), id, false);
    }

    @DeleteMapping("/api/connections/{id}")
    public ResponseEntity<Void> remove(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        connectionService.remove(callerId(jwt), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/profiles/{userId}")
    public ConnectionDto.MemberProfile profile(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID userId) {
        return connectionService.profileFor(callerId(jwt), userId);
    }

    private static UUID callerId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            throw new IllegalArgumentException("Người dùng chưa được xác thực");
        }
        return UUID.fromString(jwt.getSubject());
    }
}
