package com.cospace.app.dto.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

/** One booking a planned maintenance window would affect, and what would happen to it. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MaintenanceImpactDto {
    private String bookingCode;
    private String customerName;
    private OffsetDateTime startAt;
    private OffsetDateTime endAt;
    private String status;
    /** What creating the window does to this booking, in words for the person confirming it. */
    private String outcome;
}
