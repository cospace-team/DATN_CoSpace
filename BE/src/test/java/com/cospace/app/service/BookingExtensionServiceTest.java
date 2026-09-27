package com.cospace.app.service;

import com.cospace.app.dto.api.BookingExtensionDto;
import com.cospace.app.entity.Booking;
import com.cospace.app.entity.BookingServiceItem;
import com.cospace.app.entity.BookingStatus;
import com.cospace.app.entity.DurationUnit;
import com.cospace.app.repository.BookingRepository;
import com.cospace.app.repository.BranchEntityRepository;
import com.cospace.app.repository.WorkspaceMaintenanceRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookingExtensionServiceTest {

    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private WorkspaceMaintenanceRepository maintenanceRepository;
    @Mock
    private BranchEntityRepository branchRepository;
    @Mock
    private PricingService pricingService;
    @Mock
    private BookingAddonService bookingAddonService;
    @Mock
    private EntityManager entityManager;

    @InjectMocks
    private BookingExtensionService service;

    private final OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
    private final UUID branchId = UUID.randomUUID();
    private final UUID workspaceId = UUID.randomUUID();
    private final String typeId = UUID.randomUUID().toString();

    private Booking booking(BookingStatus status, OffsetDateTime start, OffsetDateTime end) {
        Booking b = Booking.builder().id(UUID.randomUUID()).bookingCode("WH-EXT234").userId(UUID.randomUUID())
                .branchId(branchId).workspaceId(workspaceId).workspaceTypeId(typeId)
                .status(status).unit(DurationUnit.hour).unitCount(2).startAt(start).endAt(end).build();
        lenient().when(pricingService.getUnitPriceVnd(branchId, typeId, "hour")).thenReturn(50_000L);
        return b;
    }

    @Test
    void extensionIsPricedAtTheHourlyRate() {
        Booking b = booking(BookingStatus.CHECKED_IN, now.minusHours(1), now.plusHours(1));
        when(bookingRepository.findOverlappingBookings(eq(workspaceId), any(), any(), any())).thenReturn(List.of());
        when(maintenanceRepository.findOverlappingMaintenances(eq(workspaceId), any(), any(), any())).thenReturn(List.of());

        BookingExtensionDto.QuoteResponse q = service.buildQuote(b, 2, now);

        assertThat(q.isAvailable()).isTrue();
        assertThat(q.getAmount()).isEqualTo(100_000L);
        assertThat(q.getNewEndAt()).isEqualTo(b.getEndAt().plusHours(2));
    }

    @Test
    void extensionStopsAtTheNextBooking() {
        Booking b = booking(BookingStatus.CHECKED_IN, now.minusHours(1), now.plusHours(1));
        Booking next = Booking.builder().id(UUID.randomUUID()).status(BookingStatus.CONFIRMED)
                .startAt(b.getEndAt().plusHours(1)).endAt(b.getEndAt().plusHours(3)).build();
        when(bookingRepository.findOverlappingBookings(eq(workspaceId), any(), any(), any())).thenReturn(List.of(b, next));
        when(maintenanceRepository.findOverlappingMaintenances(eq(workspaceId), any(), any(), any())).thenReturn(List.of());

        BookingExtensionDto.QuoteResponse q = service.buildQuote(b, 2, now);

        assertThat(q.isAvailable()).isFalse();
        assertThat(q.getMaxHours()).isEqualTo(1);
    }

    @Test
    void endedBookingCannotBeExtended() {
        Booking b = booking(BookingStatus.CHECKED_IN, now.minusHours(3), now.minusMinutes(5));

        assertThat(service.buildQuote(b, 1, now).isAvailable()).isFalse();
    }

    @Test
    void extendMovesTheEndAndChargesTheTab() {
        Booking b = booking(BookingStatus.CONFIRMED, now.plusHours(1), now.plusHours(3));
        OffsetDateTime originalEnd = b.getEndAt();
        when(bookingRepository.findByIdWithLock(b.getId())).thenReturn(Optional.of(b));
        when(entityManager.createNativeQuery(any())).thenReturn(org.mockito.Mockito.mock(jakarta.persistence.Query.class, org.mockito.Mockito.RETURNS_SELF));
        when(bookingRepository.findOverlappingBookings(eq(workspaceId), any(), any(), any())).thenReturn(List.of());
        when(maintenanceRepository.findOverlappingMaintenances(eq(workspaceId), any(), any(), any())).thenReturn(List.of());

        service.extend(b.getUserId(), b.getId(), 1);

        assertThat(b.getEndAt()).isEqualTo(originalEnd.plusHours(1));
        verify(bookingAddonService).addCharge(eq(b), eq(BookingServiceItem.LINE_EXTENSION), any(), eq(1), eq(50_000L), eq(b.getUserId()));
    }

    @Test
    void lateFeeIsFreeWithinTheGracePeriod() {
        Booking b = booking(BookingStatus.CHECKED_IN, now.minusHours(2), now.minusMinutes(10));

        BookingExtensionDto.LateFeeResponse fee = service.computeLateFee(b, now);

        assertThat(fee.isDue()).isFalse();
        assertThat(fee.getAmount()).isZero();
    }

    @Test
    void lateFeeBillsStartedHoursAtOneAndAHalfTimesTheRate() {
        Booking b = booking(BookingStatus.CHECKED_IN, now.minusHours(3), now.minusMinutes(70));

        BookingExtensionDto.LateFeeResponse fee = service.computeLateFee(b, now);

        assertThat(fee.isDue()).isTrue();
        assertThat(fee.getBillableHours()).isEqualTo(2);
        assertThat(fee.getAmount()).isEqualTo(150_000L);
    }

    @Test
    void waivedLateFeeIsNotChargedAgain() {
        Booking b = booking(BookingStatus.CHECKED_IN, now.minusHours(3), now.minusMinutes(70));
        when(bookingRepository.findByIdWithLock(b.getId())).thenReturn(Optional.of(b));
        when(bookingAddonService.hasAnyLine(b.getId(), BookingServiceItem.LINE_LATE_FEE)).thenReturn(true);

        assertThat(service.chargeLateFee(UUID.randomUUID(), b.getId())).isZero();
        verify(bookingAddonService, never()).addCharge(any(), any(), any(), org.mockito.ArgumentMatchers.anyInt(),
                org.mockito.ArgumentMatchers.anyLong(), any());
    }

    @Test
    void noHourlyPriceMeansNoExtensionInsteadOfAnError() {
        Booking b = booking(BookingStatus.CHECKED_IN, now.minusHours(1), now.plusHours(1));
        when(pricingService.getUnitPriceVnd(branchId, typeId, "hour")).thenThrow(new IllegalArgumentException("no price"));

        BookingExtensionDto.QuoteResponse q = service.buildQuote(b, 1, now);

        assertThat(q.isAvailable()).isFalse();
        assertThat(q.getReason()).contains("giá theo giờ");
    }

    @Test
    void rejectsTooManyHours() {
        Booking b = booking(BookingStatus.CHECKED_IN, now.minusHours(1), now.plusHours(1));

        assertThatThrownBy(() -> service.buildQuote(b, 9, now)).isInstanceOf(IllegalArgumentException.class);
    }
}
