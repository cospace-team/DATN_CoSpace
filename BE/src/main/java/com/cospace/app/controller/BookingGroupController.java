package com.cospace.app.controller;

import com.cospace.app.dto.api.BookingGroupDto.CreateRequest;
import com.cospace.app.dto.api.BookingGroupDto.GroupResponse;
import com.cospace.app.dto.api.BookingGroupDto.QuoteRequest;
import com.cospace.app.dto.api.BookingGroupDto.QuoteResponse;
import com.cospace.app.dto.api.PayosCreatePaymentResponse;
import com.cospace.app.service.BookingService;
import com.cospace.app.service.CancellationService;
import com.cospace.app.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

/** Booking several seats at once (đơn nhóm): price, create, pay for and cancel them together. */
@RestController
@RequestMapping("/api/bookings/groups")
@RequiredArgsConstructor
public class BookingGroupController {

    private final BookingService bookingService;
    private final PaymentService paymentService;
    private final CancellationService cancellationService;

    @PostMapping("/quote")
    public QuoteResponse quote(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody QuoteRequest req) {
        return bookingService.quoteGroup(requireSubject(jwt), req);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public GroupResponse create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateRequest req) {
        return bookingService.createGroupBooking(requireSubject(jwt), req);
    }

    @GetMapping("/{groupId}")
    public GroupResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID groupId) {
        return bookingService.getMyGroup(requireSubject(jwt), groupId);
    }

    /** One VietQR payment for every seat of the group still awaiting payment. */
    @PostMapping("/{groupId}/pay/payos")
    public PayosCreatePaymentResponse pay(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID groupId) {
        return paymentService.createPayosGroupPayment(requireSubject(jwt), groupId);
    }

    @PostMapping("/{groupId}/cancel")
    public GroupResponse cancel(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID groupId,
                                @RequestBody(required = false) Map<String, String> body) {
        UUID userId = requireSubject(jwt);
        cancellationService.cancelGroup(userId, groupId, body != null ? body.get("reason") : null);
        return bookingService.getMyGroup(userId, groupId);
    }

    private UUID requireSubject(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            throw new IllegalArgumentException("Missing JWT subject");
        }
        return UUID.fromString(jwt.getSubject());
    }
}
