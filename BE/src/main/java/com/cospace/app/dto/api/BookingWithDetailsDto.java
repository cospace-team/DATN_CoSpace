package com.cospace.app.dto.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
