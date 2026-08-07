package com.example.momosandbox.dto.api;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.UUID;

import com.example.momosandbox.entity.DurationUnit;

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
}
