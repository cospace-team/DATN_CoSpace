package com.cospace.app.service;

import com.cospace.app.entity.Booking;
import com.cospace.app.entity.BookingStatus;
import com.cospace.app.entity.DurationUnit;
import com.cospace.app.repository.BookingRepository;
import com.cospace.app.repository.CheckinLogRepository;
import com.cospace.app.repository.WorkspaceEntityRepository;
import com.cospace.app.repository.WorkspaceMaintenanceRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class StaffBookingOpsServiceTest {

    @Mock private BookingRepository bookingRepository;
    @Mock private CheckinLogRepository checkinLogRepository;
    @Mock private WorkspaceEntityRepository workspaceEntityRepository;
    @Mock private WorkspaceMaintenanceRepository workspaceMaintenanceRepository;
    @Mock private BookingService bookingService;
    @Mock private BookingAddonService bookingAddonService;
    @Mock private ReputationService reputationService;
    @Mock private NotificationService notificationService;
    @Mock private PricingService pricingService;
    @Mock private EntityManager entityManager;
    @Mock private Query query;

    @InjectMocks
    private StaffBookingOpsService service;

    private final UUID staffId = UUID.randomUUID();
    private final OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

    @BeforeEach
    void locks() {
        when(entityManager.createNativeQuery(anyString())).thenReturn(query);
        when(query.setParameter(anyString(), any())).thenReturn(query);
        when(reputationService.checkinDeadlineMinutes()).thenReturn(30L);
    }

    private Booking booking(BookingStatus status, OffsetDateTime startAt, OffsetDateTime endAt) {
        Booking b = Booking.builder().id(UUID.randomUUID()).bookingCode("WH-ABC234").userId(UUID.randomUUID())
                .workspaceId(UUID.randomUUID()).branchId(UUID.randomUUID()).status(status).unit(DurationUnit.hour)
                .startAt(startAt).endAt(endAt).build();
        when(bookingRepository.findByIdWithLock(b.getId())).thenReturn(Optional.of(b));
        return b;
    }

    @Test
    void noShowIsRefusedBeforeTheCheckinDeadline() {
        Booking b = booking(BookingStatus.CONFIRMED, now.minusMinutes(10), now.plusMinutes(50));
        when(reputationService.checkinDeadline(b)).thenReturn(b.getStartAt().plusMinutes(30));

        assertThatThrownBy(() -> service.markNoShow(staffId, b.getId(), "không đến"))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("Chưa quá hạn check-in");
        assertThat(b.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void noShowAfterTheDeadlineFreesTheSeatAndDocksPoints() {
        Booking b = booking(BookingStatus.CONFIRMED, now.minusMinutes(45), now.plusMinutes(15));
        when(reputationService.checkinDeadline(b)).thenReturn(b.getStartAt().plusMinutes(30));
        when(checkinLogRepository.existsByBookingId(b.getId())).thenReturn(false);
        when(reputationService.hasMissedCheckinPenalty(b.getId())).thenReturn(false);
        when(reputationService.penalizeMissedCheckin(b, true)).thenReturn(true);

        service.markNoShow(staffId, b.getId(), "đã gọi điện");

        assertThat(b.getStatus()).isEqualTo(BookingStatus.NO_SHOW);
        verify(bookingAddonService).voidUnpaid(b, staffId);
        verify(bookingRepository).save(b);
    }

    @Test
    void noShowNeedsAReason() {
        assertThatThrownBy(() -> service.markNoShow(staffId, UUID.randomUUID(), "  "))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void aGuestWhoIsInsideCannotBeMarkedNoShow() {
        Booking b = booking(BookingStatus.CHECKED_IN, now.minusHours(1), now.plusHours(1));

        assertThatThrownBy(() -> service.markNoShow(staffId, b.getId(), "x"))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void undoRestoresTheBookingAndGivesPointsBackOnce() {
        Booking b = booking(BookingStatus.NO_SHOW, now.minusMinutes(45), now.plusMinutes(15));
        when(bookingRepository.findOverlappingBookings(any(), any(), any(), any())).thenReturn(List.of());
        when(workspaceMaintenanceRepository.findOverlappingMaintenances(any(), any(), any(), any())).thenReturn(List.of());
        when(bookingRepository.findOtherGuestsInside(any(), any())).thenReturn(List.of());
        when(reputationService.hasMissedCheckinPenalty(b.getId())).thenReturn(true);
        when(reputationService.hasRevertedMissedCheckinPenalty(b.getId())).thenReturn(false);

        service.undoNoShow(staffId, b.getId(), "quên check-in");

        assertThat(b.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
        verify(reputationService).revertMissedCheckinPenalty(eq(staffId), eq(b.getId()), anyString());
    }

    @Test
    void undoDoesNotRevertPointsThatCameBackAlready() {
        Booking b = booking(BookingStatus.NO_SHOW, now.minusMinutes(45), now.plusMinutes(15));
        when(bookingRepository.findOverlappingBookings(any(), any(), any(), any())).thenReturn(List.of());
        when(workspaceMaintenanceRepository.findOverlappingMaintenances(any(), any(), any(), any())).thenReturn(List.of());
        when(bookingRepository.findOtherGuestsInside(any(), any())).thenReturn(List.of());
        when(reputationService.hasMissedCheckinPenalty(b.getId())).thenReturn(true);
        when(reputationService.hasRevertedMissedCheckinPenalty(b.getId())).thenReturn(true);

        service.undoNoShow(staffId, b.getId(), "lần hai");

        verify(reputationService, never()).revertMissedCheckinPenalty(any(), any(), anyString());
    }

    @Test
    void undoIsRefusedOnceTheBookedTimeIsOver() {
        Booking b = booking(BookingStatus.NO_SHOW, now.minusHours(3), now.minusHours(1));

        assertThatThrownBy(() -> service.undoNoShow(staffId, b.getId(), "x"))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("quá giờ kết thúc");
        assertThat(b.getStatus()).isEqualTo(BookingStatus.NO_SHOW);
    }

    @Test
    void moveNeedsAChange() {
        assertThatThrownBy(() -> service.moveBooking(staffId, UUID.randomUUID(), null, null, "lý do"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void aGuestAlreadyInsideCannotChangeTime() {
        Booking b = booking(BookingStatus.CHECKED_IN, now.minusHours(1), now.plusHours(1));

        assertThatThrownBy(() -> service.moveBooking(staffId, b.getId(), null, now.plusHours(3), "xin dời"))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("đã check-in");
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void anUnpaidOrFinishedBookingCannotBeMoved() {
        Booking b = booking(BookingStatus.PENDING_PAYMENT, now.plusHours(2), now.plusHours(3));

        assertThatThrownBy(() -> service.moveBooking(staffId, b.getId(), UUID.randomUUID(), null, "x"))
                .isInstanceOf(IllegalStateException.class);
    }
}
