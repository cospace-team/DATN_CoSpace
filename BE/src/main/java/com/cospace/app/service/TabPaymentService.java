package com.cospace.app.service;

import com.cospace.app.dto.api.BookingAddonDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * VietQR payment for what is owed on a booking's running tab. The PayOS request is made between two
 * short transactions, never while the booking row is locked.
 */
@Service
@RequiredArgsConstructor
public class TabPaymentService {

    private final PaymentService paymentService;
    private final PayosService payosService;

    public BookingAddonDto.TabPaymentResponse createPayosPayment(UUID bookingId) {
        PaymentService.PreparedTabPayment prepared = paymentService.prepareTabPayment(bookingId);
        Map<String, Object> payosRes;
        try {
            payosRes = payosService.createPaymentLink(prepared.orderCode(), prepared.amount(), "DV " + prepared.bookingCode(), null);
        } catch (RuntimeException e) {
            paymentService.failTabPayment(prepared.paymentId());
            throw e;
        }
        String checkoutUrl = Objects.toString(payosRes.get("checkoutUrl"), "");
        paymentService.attachTabPaymentLink(prepared.paymentId(), checkoutUrl);
        return BookingAddonDto.TabPaymentResponse.builder()
                .paymentId(prepared.paymentId())
                .bookingId(prepared.bookingId())
                .orderCode(prepared.orderCode())
                .orderId(prepared.orderId())
                .amount(prepared.amount())
                .checkoutUrl(checkoutUrl)
                .qrCode(Objects.toString(payosRes.get("qrCode"), ""))
                .status("PENDING")
                .build();
    }
}
