package com.example.momosandbox.dto.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckinLogDto {
    private UUID id;
    private UUID bookingId;
    private UUID staffUserId;
    private String checkinAt;
    private String checkoutAt;
    private String note;
}
