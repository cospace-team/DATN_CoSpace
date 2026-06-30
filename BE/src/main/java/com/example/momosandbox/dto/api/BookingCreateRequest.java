package com.example.momosandbox.dto.api;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class BookingCreateRequest {

    @JsonProperty("workspace_id")
    @NotBlank
    private String workspaceId;

    @JsonProperty("workspace_type_id")
    @NotBlank
    private String workspaceTypeId;

    @JsonProperty("branch_id")
    @NotBlank
    private String branchId;

    @JsonProperty("start_at")
    @NotNull
    private OffsetDateTime startAt;

    @JsonProperty("end_at")
    @NotNull
    private OffsetDateTime endAt;

    /** one of: hour, day, week, month */
    @JsonProperty("unit")
    @NotBlank
    private String unit;

    @JsonProperty("unit_count")
    @Min(1)
    private int unitCount;
}
