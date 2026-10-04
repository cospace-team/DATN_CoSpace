package com.cospace.app.service;

import com.cospace.app.entity.CheckinLog;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class BookingVisitMinutesTest {

    @Test
    void timeOnSiteAddsUpVisitsAndCountsAnOpenOneUpToNow() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        CheckinLog morning = CheckinLog.builder().checkinAt(now.minusHours(8)).checkoutAt(now.minusHours(5)).build();
        CheckinLog current = CheckinLog.builder().checkinAt(now.minusMinutes(90)).build();

        long minutes = BookingService.visitMinutes(List.of(morning, current));

        assertThat(minutes).isBetween(270L, 271L); // 180 + 90
    }

    @Test
    void aBookingNeverVisitedHasNoTimeOnSite() {
        assertThat(BookingService.visitMinutes(List.of())).isZero();
    }
}
