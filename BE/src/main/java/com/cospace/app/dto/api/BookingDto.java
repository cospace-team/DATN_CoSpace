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
    /** Still owed on the tab (extra services, extra hours, late fee) after the booking was paid. */
    private long unpaidAmount;
    /** Part of addonAmount that is extra hours bought after booking, and how many hours. */
    private long extensionAmount;
    private int extensionHours;
    /** Part of addonAmount that is a late check-out fee. */
    private long lateFeeAmount;

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

    /* Details for the customer's booking list (filled by BookingService.toDtoList). */
    private String workspaceCode;
    private String workspaceTypeName;
    private Integer workspaceCapacity;
    private String floorName;
    private Integer floorNo;
    private String branchAddress;
    private String branchCity;
    /** Provider of the payment that settled the booking: payos | momo | cash | bank_transfer. */
    private String paidVia;
    private String paidAt;
    /** First check-in and last check-out recorded for the booking, and how many visits it had. */
    private String firstCheckinAt;
    private String lastCheckoutAt;
    private Integer checkinCount;
    /** Booking group (several seats booked together) this seat belongs to, with its size. */
    private UUID groupId;
    private String groupCode;
    private Integer groupSize;
    /** Net reputation points this booking earned (+) or cost (-), null when none. */
    private Integer reputationDelta;
}
