package com.cospace.app.service;

import com.cospace.app.dto.api.MaintenanceRequestDto;
import com.cospace.app.entity.Booking;
import com.cospace.app.entity.BookingStatus;
import com.cospace.app.entity.User;
import com.cospace.app.exception.MaintenanceImpactException;
import com.cospace.app.repository.BookingRepository;
import com.cospace.app.repository.CheckinLogRepository;
import com.cospace.app.repository.UserRepository;
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
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class StaffMaintenanceServiceTest {

    @Mock private WorkspaceMaintenanceRepository maintenanceRepository;
    @Mock private BookingRepository bookingRepository;
    @Mock private EntityManager entityManager;
    @Mock private WorkspaceEntityRepository workspaceEntityRepository;
    @Mock private CheckinLogRepository checkinLogRepository;
    @Mock private CancellationService cancellationService;
    @Mock private NotificationService notificationService;
    @Mock private UserRepository userRepository;

    @InjectMocks
    private StaffMaintenanceService service;

    private final UUID workspaceId = UUID.randomUUID();
    private final OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
    private Booking tomorrow;

    @BeforeEach
    void setUp() {
        Query lock = mock(Query.class);
        when(entityManager.createNativeQuery(anyString())).thenReturn(lock);
        when(lock.setParameter(anyString(), any())).thenReturn(lock);
        when(maintenanceRepository.findOverlappingMaintenances(any(), any(), any(), any())).thenReturn(List.of());

        UUID customerId = UUID.randomUUID();
        tomorrow = Booking.builder().id(UUID.randomUUID()).bookingCode("WH-387X79").userId(customerId)
                .workspaceId(workspaceId).status(BookingStatus.CONFIRMED)
                .startAt(now.plusHours(15)).endAt(now.plusHours(18)).build();
        when(bookingRepository.findOverlappingBookings(any(), any(), any(), any())).thenReturn(List.of(tomorrow));
        when(bookingRepository.findByIdWithLock(tomorrow.getId())).thenReturn(Optional.of(tomorrow));
        when(userRepository.findById(customerId)).thenReturn(Optional.of(User.builder().id(customerId).fullName("Trần Thị Bình").build()));
    }

    private MaintenanceRequestDto dayLongLock(boolean confirmed) {
        MaintenanceRequestDto req = new MaintenanceRequestDto();
        req.setWorkspaceId(workspaceId);
        req.setStartAt(ZonedDateTime.now(ZoneOffset.UTC));
        req.setEndAt(ZonedDateTime.now(ZoneOffset.UTC).plusDays(1));
        req.setReason("Ghế hỏng chân");
        req.setConfirmAffectedBookings(confirmed);
        return req;
    }

    @Test
    void lockingASeatWithBookingsListsThemInsteadOfCancellingSilently() {
        assertThatThrownBy(() -> service.createMaintenance(UUID.randomUUID(), dayLongLock(false)))
                .isInstanceOfSatisfying(MaintenanceImpactException.class, e -> {
                    assertThat(e.getBookings()).hasSize(1);
                    assertThat(e.getBookings().get(0).getBookingCode()).isEqualTo("WH-387X79");
                    assertThat(e.getBookings().get(0).getCustomerName()).isEqualTo("Trần Thị Bình");
                    assertThat(e.getBookings().get(0).getOutcome()).contains("Hủy đơn");
                });

        verify(cancellationService, never()).cancelForMaintenance(any(), any());
        verify(maintenanceRepository, never()).save(any());
    }

    @Test
    void onceConfirmedTheBookingIsCancelledAndTheSeatLocked() {
        service.createMaintenance(UUID.randomUUID(), dayLongLock(true));

        verify(cancellationService).cancelForMaintenance(tomorrow, "Ghế hỏng chân");
        verify(maintenanceRepository).save(any());
    }

    @Test
    void anOverstayingGuestIsListedEvenWithoutAnOverlappingBooking() {
        when(bookingRepository.findOverlappingBookings(any(), any(), any(), any())).thenReturn(List.of());
        Booking seated = Booking.builder().id(UUID.randomUUID()).bookingCode("CS-OLD-0005").workspaceId(workspaceId)
                .status(BookingStatus.CHECKED_IN).startAt(now.minusHours(10)).endAt(now.minusHours(1)).build();
        when(bookingRepository.findOverstayingGuests(any(), any())).thenReturn(List.of(seated));

        assertThatThrownBy(() -> service.createMaintenance(UUID.randomUUID(), dayLongLock(false)))
                .isInstanceOfSatisfying(MaintenanceImpactException.class,
                        e -> assertThat(e.getBookings().get(0).getOutcome()).contains("check-out"));
    }
}
