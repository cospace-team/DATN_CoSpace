package com.example.momosandbox.controller;

import com.example.momosandbox.dto.api.BookingWithDetailsDto;
import com.example.momosandbox.dto.api.CheckinLogDto;
import com.example.momosandbox.service.CheckinService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/checkins")
public class CheckinController {

    private final CheckinService checkinService;

    public CheckinController(CheckinService checkinService) {
        this.checkinService = checkinService;
    }

    @PostMapping("/booking/{bookingId}")
    public CheckinLogDto checkin(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("bookingId") UUID bookingId,
            @RequestParam(value = "note", required = false) String note) {
        UUID staffId = requireSubject(jwt);
        return checkinService.checkin(staffId, bookingId, note);
    }

    @PostMapping("/{id}/checkout")
    public CheckinLogDto checkout(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("id") UUID checkinId,
            @RequestParam(value = "note", required = false) String note) {
        UUID staffId = requireSubject(jwt);
        return checkinService.checkout(staffId, checkinId, note);
    }


    @GetMapping("/active")
    public List<BookingWithDetailsDto> getActiveCheckins(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam("branchId") UUID branchId) {
        return checkinService.getActiveCheckins(branchId);
    }

    private UUID requireSubject(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            throw new IllegalArgumentException("Missing JWT subject");
        }
        return UUID.fromString(jwt.getSubject());
    }
}
