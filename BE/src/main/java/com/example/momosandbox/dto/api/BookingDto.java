package com.example.momosandbox.dto.api;

import com.example.momosandbox.entity.BookingStatus;
import com.example.momosandbox.entity.DurationUnit;
import com.example.momosandbox.entity.PaymentStatus;
import lombok.Builder;
import lombok.Data;
import java.util.UUID;

@Data
@Builder
public class BookingDto {

    private UUID id;
    private String bookingCode;
    private UUID userId;
    private String customerName;
    private String customerPhone;
    private UUID workspaceId;
    private String workspaceName;

    private String workspaceTypeId;
    private UUID branchId;
    private String branchName;
    private BookingStatus status;
    private String startAt;
    private String endAt;
    private DurationUnit unit;
    private int unitCount;
    private Boolean isContract;


    // Price Snapshot
    private long pricePerUnit;
    private long subtotalAmount;
    private long discountAmount;
    private long addonAmount;
    private long taxAmount;
    private long serviceFeeAmount;
    private long totalAmount;

    // Payment Info
    private String paymentDeadlineAt;
    private PaymentStatus paymentStatus;
    private UUID latestPaymentId;

    private String createdAt;
}
