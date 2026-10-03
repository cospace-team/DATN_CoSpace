package com.cospace.app.dto.api;

import com.cospace.app.entity.DurationUnit;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/** DTOs for booking several seats at once (đơn nhóm). */
public class BookingGroupDto {

    private BookingGroupDto() {
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateRequest {
        /** The seats to book, all at the same branch; at least one. */
        @NotEmpty
        private List<UUID> workspaceIds;
        @NotNull
        private OffsetDateTime startAt;
        @NotNull
        private OffsetDateTime endAt;
        @NotNull
        private DurationUnit unit;
        /** Add-ons ordered with the group; they are attached to the first seat. */
        private List<BookingAddonDto.LineRequest> addons;
        /** Not supported for groups (a code is redeemed per booking); must be empty. */
        private String promotionCode;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class QuoteRequest {
        @NotEmpty
        private List<UUID> workspaceIds;
        @NotNull
        private String unit;
        @NotNull
        private OffsetDateTime startAt;
        @NotNull
        private OffsetDateTime endAt;
        private List<BookingAddonDto.LineRequest> addons;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SeatQuote {
        private UUID workspaceId;
        private String workspaceName;
        private long pricePerUnit;
        private int unitCount;
        private long subtotalAmount;
        private long discountAmount;
        private long totalAmount;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class QuoteResponse {
        private List<SeatQuote> seats;
        private String membershipTierName;
        private int membershipDiscountPercent;
        private long subtotalAmount;
        private long discountAmount;
        private long addonAmount;
        private long totalAmount;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class GroupResponse {
        private UUID id;
        private String groupCode;
        private UUID branchId;
        private String startAt;
        private String endAt;
        private int seatCount;
        private long totalAmount;
        /** What is still to be paid: the seats awaiting payment. */
        private long amountDue;
        /** Earliest payment deadline among the seats awaiting payment, if any. */
        private String paymentDeadlineAt;
        private List<BookingDto> bookings;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreatePaymentRequest {
        @NotNull
        private UUID bookingGroupId;
    }
}
