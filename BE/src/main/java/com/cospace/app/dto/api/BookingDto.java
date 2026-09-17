package com.cospace.app.dto.api;

import com.cospace.app.entity.BookingStatus;
import com.cospace.app.entity.DurationUnit;
import com.cospace.app.entity.PaymentStatus;
import lombok.Builder;
import lombok.Data;
import java.util.UUID;

@Data
@Builder(toBuilder = true)
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
    private String membershipTierCode;
    private long membershipDiscountAmount;
    private String promotionCode;
    private long promotionDiscountAmount;
    private long addonAmount;
    private long taxAmount;
    private long serviceFeeAmount;
    private long totalAmount;

    // Payment Info
    private String paymentDeadlineAt;
    private PaymentStatus paymentStatus;
    private UUID latestPaymentId;

    // Cancellation Details
    private String cancellationReason;
    private Integer refundPercent;
    private Long refundAmount;
    private Long penaltyAmount;
    private String refundStatus;
    private String policyName;
    private String cancelledAt;

    private String createdAt;
}
