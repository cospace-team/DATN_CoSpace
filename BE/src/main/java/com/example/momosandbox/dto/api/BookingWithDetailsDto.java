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
public class BookingWithDetailsDto {
    private BookingDto booking;
    private UserProfileDto customer;
    private SpaceDto.WorkspaceResponse workspace;
    private boolean alreadyCheckedIn;
    private CheckinLogDto activeCheckin;
}
