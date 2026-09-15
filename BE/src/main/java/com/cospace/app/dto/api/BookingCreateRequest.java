package com.cospace.app.dto.api;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.UUID;

import com.cospace.app.entity.DurationUnit;

@Data
public class BookingCreateRequest {

    @NotNull
    private UUID workspaceId;

    @NotBlank
    private String workspaceTypeId;

    @NotNull
    private UUID branchId;

    @NotNull
    private OffsetDateTime startAt;

    @NotNull
    private OffsetDateTime endAt;

    /** one of: hour, day, week, month */
    @NotNull
    private DurationUnit unit;

    @Min(1)
    private int unitCount;

    /** Optional promotion code; the membership-tier discount is applied automatically. */
    private String promotionCode;

    /** Add-on services ordered with the booking; priced on the server and paid with the booking. */
    @jakarta.validation.Valid
    private java.util.List<BookingAddonDto.LineRequest> addons;
}
