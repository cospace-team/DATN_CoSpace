package com.cospace.app.service;

import com.cospace.app.dto.api.BookingCreateRequest;
import com.cospace.app.dto.api.BookingDto;
import com.cospace.app.entity.Booking;
import com.cospace.app.entity.BookingSource;
import com.cospace.app.entity.BookingServiceItem;
import com.cospace.app.entity.BookingStatus;
import com.cospace.app.entity.BranchEntity;
import com.cospace.app.dto.api.BookingAddonDto;
import com.cospace.app.entity.DurationUnit;
import com.cospace.app.entity.Floor;
import com.cospace.app.entity.Promotion;
import com.cospace.app.dto.api.MembershipDto.TierResponse;
import com.cospace.app.entity.WorkspaceEntity;
import com.cospace.app.entity.WorkspaceMaintenanceEntity;
import com.cospace.app.repository.BookingCancellationRepository;
import com.cospace.app.repository.BookingRepository;
import com.cospace.app.repository.BranchEntityRepository;
import com.cospace.app.repository.CheckinLogRepository;
import com.cospace.app.repository.FloorRepository;
import com.cospace.app.repository.PaymentRepository;
import com.cospace.app.repository.UserRepository;
import com.cospace.app.repository.WorkspaceEntityRepository;
import com.cospace.app.repository.WorkspaceMaintenanceRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private PaymentRepository paymentRepository;
    @Mock
    private PricingService pricingService;
    @Mock
    private WorkspaceEntityRepository workspaceEntityRepository;
    @Mock
    private FloorRepository floorRepository;
    @Mock
    private BranchEntityRepository branchEntityRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private CheckinLogRepository checkinLogRepository;
    @Mock
    private EntityManager entityManager;
    @Mock
    private WorkspaceMaintenanceRepository workspaceMaintenanceRepository;
    @Mock
    private BookingCancellationRepository bookingCancellationRepository;
    @Mock
    private Query advisoryLockQuery;
    @Mock
    private MembershipService membershipService;
    @Mock
    private PromotionService promotionService;
    @Mock
    private BookingAddonService bookingAddonService;

    @InjectMocks
    private BookingService bookingService;

    private final UUID userId = UUID.randomUUID();
    private final UUID workspaceId = UUID.randomUUID();
    private final UUID workspaceTypeId = UUID.randomUUID();
    private final UUID floorId = UUID.randomUUID();
    private final UUID realBranchId = UUID.randomUUID();

    private BookingCreateRequest request(DurationUnit unit, int unitCount) {
        OffsetDateTime start = OffsetDateTime.now(ZoneOffset.UTC).plusDays(1);
        BookingCreateRequest req = new BookingCreateRequest();
        req.setWorkspaceId(workspaceId);
        req.setWorkspaceTypeId("client-supplied-type");
        req.setBranchId(UUID.randomUUID()); // must be ignored: branch is derived server-side
        req.setStartAt(start);
        req.setEndAt(switch (unit) {
            case hour -> start.plusHours(unitCount);
            case day -> start.plusDays(unitCount);
            case week -> start.plusWeeks(unitCount);
            case month -> start.plusMonths(unitCount);
        });
        req.setUnit(unit);
        req.setUnitCount(unitCount);
        return req;
    }

    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        org.mockito.Mockito.lenient().when(entityManager.createNativeQuery(org.mockito.ArgumentMatchers.anyString())).thenReturn(advisoryLockQuery);
        org.mockito.Mockito.lenient().when(advisoryLockQuery.setParameter(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.any())).thenReturn(advisoryLockQuery);
    }

    private void givenWorkspaceExists() {
        when(workspaceEntityRepository.findById(workspaceId)).thenReturn(Optional.of(WorkspaceEntity.builder()
                .id(workspaceId)
                .floorId(floorId)
                .workspaceTypeId(workspaceTypeId)
                .name("Desk A1")
                .build()));
        when(floorRepository.findById(floorId))
                .thenReturn(Optional.of(Floor.builder().id(floorId).branchId(realBranchId).build()));
        when(entityManager.createNativeQuery(anyString())).thenReturn(advisoryLockQuery);
        when(advisoryLockQuery.setParameter(anyString(), any())).thenReturn(advisoryLockQuery);
    }

    private void givenNoMembershipTier() {
        when(membershipService.refreshTier(any())).thenReturn(new MembershipService.Standing(null, null, 0, 0));
    }

    private void givenSaveSucceeds() {
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> {
            Booking b = inv.getArgument(0);
            b.setCreatedAt(OffsetDateTime.now(ZoneOffset.UTC)); // normally set by @PrePersist
            return b;
        });
    }

    @Nested
    class CreateBookingValidation {

        @Test
        void rejectsMissingUser() {
            assertThatThrownBy(() -> bookingService.createBooking(null, request(DurationUnit.hour, 2)))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        void rejectsMissingTimes() {
            BookingCreateRequest req = request(DurationUnit.hour, 2);
            req.setStartAt(null);

            assertThatThrownBy(() -> bookingService.createBooking(userId, req))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        void rejectsEndBeforeStart() {
            BookingCreateRequest req = request(DurationUnit.hour, 2);
            req.setEndAt(req.getStartAt().minusMinutes(1));

            assertThatThrownBy(() -> bookingService.createBooking(userId, req))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        void rejectsEndEqualToStart() {
            BookingCreateRequest req = request(DurationUnit.hour, 2);
            req.setEndAt(req.getStartAt());

            assertThatThrownBy(() -> bookingService.createBooking(userId, req))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        void rejectsNonPositiveUnitCount() {
            BookingCreateRequest req = request(DurationUnit.hour, 2);
            req.setUnitCount(0);
            assertThatThrownBy(() -> bookingService.createBooking(userId, req))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        void rejectsFourthPendingBooking() {
            when(bookingRepository.countByUserIdAndStatus(userId, BookingStatus.PENDING_PAYMENT)).thenReturn(3);

            assertThatThrownBy(() -> bookingService.createBooking(userId, request(DurationUnit.hour, 2)))
                    .isInstanceOf(IllegalStateException.class);
            verify(bookingRepository, never()).save(any());
        }

        @Test
        void rejectsUnknownWorkspace() {
            when(workspaceEntityRepository.findById(workspaceId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> bookingService.createBooking(userId, request(DurationUnit.hour, 2)))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        void rejectsOverlappingBooking() {
            givenWorkspaceExists();
            when(bookingRepository.findOverlappingBookings(eq(workspaceId), any(), any(), anyList()))
                    .thenReturn(List.of(Booking.builder().id(UUID.randomUUID()).build()));

            assertThatThrownBy(() -> bookingService.createBooking(userId, request(DurationUnit.hour, 2)))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("đã có người đặt");
            verify(bookingRepository, never()).save(any());
        }

        @Test
        void rejectsWorkspaceUnderMaintenance() {
            givenWorkspaceExists();
            when(workspaceMaintenanceRepository.findOverlappingMaintenances(eq(workspaceId), any(), any(), anyList()))
                    .thenReturn(List.of(new WorkspaceMaintenanceEntity()));

            assertThatThrownBy(() -> bookingService.createBooking(userId, request(DurationUnit.hour, 2)))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("bảo trì");
            verify(bookingRepository, never()).save(any());
        }

        @Test
        void takesAdvisoryLockBeforeCheckingOverlap() {
            givenWorkspaceExists();
            when(bookingRepository.findOverlappingBookings(eq(workspaceId), any(), any(), anyList()))
                    .thenReturn(List.of(Booking.builder().id(UUID.randomUUID()).build()));

            assertThatThrownBy(() -> bookingService.createBooking(userId, request(DurationUnit.hour, 2)))
                    .isInstanceOf(IllegalArgumentException.class);

            org.mockito.Mockito.verify(entityManager, org.mockito.Mockito.times(2)).createNativeQuery(eq("SELECT pg_advisory_xact_lock(hashtext(:key))"));
            verify(advisoryLockQuery).setParameter("key", "rate_limit:" + userId);
            verify(advisoryLockQuery).setParameter("key", "booking:" + workspaceId);
        }
    }

    @Nested
    class CreateBookingSuccess {

        @Test
        void computesPriceAndBranchOnServer() {
            givenWorkspaceExists();
            givenSaveSucceeds();
            givenNoMembershipTier();
            when(pricingService.getUnitPriceVnd(realBranchId, workspaceTypeId.toString(), "hour")).thenReturn(50_000L);
            BookingCreateRequest req = request(DurationUnit.hour, 3);

            BookingDto dto = bookingService.createBooking(userId, req);

            ArgumentCaptor<Booking> captor = ArgumentCaptor.forClass(Booking.class);
            verify(bookingRepository).save(captor.capture());
            Booking saved = captor.getValue();

            assertThat(saved.getBranchId()).isEqualTo(realBranchId).isNotEqualTo(req.getBranchId());
            assertThat(saved.getWorkspaceTypeId()).isEqualTo(workspaceTypeId.toString());
            assertThat(saved.getPricePerUnit()).isEqualTo(50_000L);
            assertThat(saved.getSubtotalAmount()).isEqualTo(150_000L);
            assertThat(saved.getTotalAmount()).isEqualTo(150_000L);
            assertThat(saved.getStatus()).isEqualTo(BookingStatus.PENDING_PAYMENT);
            assertThat(saved.getSource()).isEqualTo(BookingSource.web);
            assertThat(saved.getUserId()).isEqualTo(userId);
            assertThat(saved.isContract()).isFalse();
            assertThat(saved.getBookingCode()).matches("WH-[A-HJ-NP-Z2-9]{6}");
            assertThat(saved.getPaymentDeadlineAt())
                    .isCloseTo(OffsetDateTime.now(ZoneOffset.UTC).plusMinutes(15), within(30, ChronoUnit.SECONDS));

            assertThat(dto.getTotalAmount()).isEqualTo(150_000L);
            assertThat(dto.getWorkspaceName()).isEqualTo("Desk A1");
        }

        @Test
        void chargesForTheBookedSpanNotTheClientUnitCount() {
            givenWorkspaceExists();
            givenSaveSucceeds();
            givenNoMembershipTier();
            when(pricingService.getUnitPriceVnd(realBranchId, workspaceTypeId.toString(), "hour")).thenReturn(50_000L);
            BookingCreateRequest req = request(DurationUnit.hour, 9); // 9 hours booked...
            req.setUnitCount(1);                                      // ...but the client claims 1

            bookingService.createBooking(userId, req);

            ArgumentCaptor<Booking> captor = ArgumentCaptor.forClass(Booking.class);
            verify(bookingRepository).save(captor.capture());
            assertThat(captor.getValue().getUnitCount()).isEqualTo(9);
            assertThat(captor.getValue().getSubtotalAmount()).isEqualTo(450_000L);
        }

        @Test
        void monthlyBookingIsMarkedAsContract() {
            givenWorkspaceExists();
            givenSaveSucceeds();
            givenNoMembershipTier();
            when(pricingService.getUnitPriceVnd(any(), anyString(), eq("month"))).thenReturn(3_500_000L);

            bookingService.createBooking(userId, request(DurationUnit.month, 1));

            ArgumentCaptor<Booking> captor = ArgumentCaptor.forClass(Booking.class);
            verify(bookingRepository).save(captor.capture());
            assertThat(captor.getValue().isContract()).isTrue();
        }

        @Test
        void walkinBookingIsAttributedToCustomerWithCounterSource() {
            UUID customerId = UUID.randomUUID();
            givenWorkspaceExists();
            givenSaveSucceeds();
            givenNoMembershipTier();
            when(pricingService.getUnitPriceVnd(any(), anyString(), anyString())).thenReturn(50_000L);

            bookingService.createWalkinBooking(UUID.randomUUID(), customerId, request(DurationUnit.hour, 1));

            ArgumentCaptor<Booking> captor = ArgumentCaptor.forClass(Booking.class);
            verify(bookingRepository).save(captor.capture());
            assertThat(captor.getValue().getUserId()).isEqualTo(customerId);
            assertThat(captor.getValue().getSource()).isEqualTo(BookingSource.counter);
        }
    }

    @Nested
    class Discounts {

        private final TierResponse gold = TierResponse.builder()
                .code("gold").name("Gold").discountPercent(5).minTotalSpent(5_000_000).build();

        @Test
        void appliesMembershipDiscountThenPromotionOnRemainder() {
            givenWorkspaceExists();
            givenSaveSucceeds();
            when(pricingService.getUnitPriceVnd(realBranchId, workspaceTypeId.toString(), "hour")).thenReturn(100_000L);
            when(membershipService.refreshTier(userId))
                    .thenReturn(new MembershipService.Standing(gold, null, 6_000_000, 12));
            Promotion promo = Promotion.builder().id(UUID.randomUUID()).code("SALE10").build();
            // 2h x 100k = 200k subtotal, gold -5% = 10k, promotion taken from the remaining 190k.
            when(promotionService.apply("sale10", userId, "gold", realBranchId, workspaceTypeId, 200_000L, 190_000L, true))
                    .thenReturn(new PromotionService.AppliedPromotion(promo, 19_000L));
            BookingCreateRequest req = request(DurationUnit.hour, 2);
            req.setPromotionCode("sale10");

            BookingDto dto = bookingService.createBooking(userId, req);

            ArgumentCaptor<Booking> captor = ArgumentCaptor.forClass(Booking.class);
            verify(bookingRepository).save(captor.capture());
            Booking saved = captor.getValue();
            assertThat(saved.getSubtotalAmount()).isEqualTo(200_000L);
            assertThat(saved.getMembershipTierCode()).isEqualTo("gold");
            assertThat(saved.getMembershipDiscountAmount()).isEqualTo(10_000L);
            assertThat(saved.getPromotionId()).isEqualTo(promo.getId());
            assertThat(saved.getPromotionCode()).isEqualTo("SALE10");
            assertThat(saved.getPromotionDiscountAmount()).isEqualTo(19_000L);
            assertThat(saved.getDiscountAmount()).isEqualTo(29_000L);
            assertThat(saved.getTotalAmount()).isEqualTo(171_000L);
            assertThat(saved.getStatus()).isEqualTo(BookingStatus.PENDING_PAYMENT);
            assertThat(dto.getPromotionDiscountAmount()).isEqualTo(19_000L);
        }

        @Test
        void invalidPromotionCodeAbortsBooking() {
            givenWorkspaceExists();
            givenNoMembershipTier();
            when(pricingService.getUnitPriceVnd(any(), anyString(), anyString())).thenReturn(100_000L);
            when(promotionService.apply(eq("EXPIRED"), any(), any(), any(), any(), any(Long.class), any(Long.class), eq(true)))
                    .thenThrow(new IllegalArgumentException("Mã khuyến mãi đã hết hạn."));
            BookingCreateRequest req = request(DurationUnit.hour, 1);
            req.setPromotionCode("EXPIRED");

            assertThatThrownBy(() -> bookingService.createBooking(userId, req))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("hết hạn");
            verify(bookingRepository, never()).save(any());
        }

        @Test
        void fullyDiscountedBookingIsConfirmedWithoutPaymentDeadline() {
            givenWorkspaceExists();
            givenSaveSucceeds();
            givenNoMembershipTier();
            when(pricingService.getUnitPriceVnd(any(), anyString(), anyString())).thenReturn(50_000L);
            Promotion free = Promotion.builder().id(UUID.randomUUID()).code("FREE").build();
            when(promotionService.apply(eq("FREE"), any(), any(), any(), any(), any(Long.class), any(Long.class), eq(true)))
                    .thenReturn(new PromotionService.AppliedPromotion(free, 50_000L));
            BookingCreateRequest req = request(DurationUnit.hour, 1);
            req.setPromotionCode("FREE");

            bookingService.createBooking(userId, req);

            ArgumentCaptor<Booking> captor = ArgumentCaptor.forClass(Booking.class);
            verify(bookingRepository).save(captor.capture());
            assertThat(captor.getValue().getTotalAmount()).isZero();
            assertThat(captor.getValue().getStatus()).isEqualTo(BookingStatus.CONFIRMED);
            assertThat(captor.getValue().getPaymentDeadlineAt()).isNull();
        }
    }

    @Nested
    class Schedule {

        private final OffsetDateTime now = OffsetDateTime.parse("2026-10-01T10:20:00+07:00");

        private void givenBranchHours(String open, String close) {
            when(branchEntityRepository.findById(realBranchId)).thenReturn(Optional.of(BranchEntity.builder()
                    .id(realBranchId).openTime(LocalTime.parse(open)).closeTime(LocalTime.parse(close)).build()));
        }

        private OffsetDateTime vn(String localDateTime) {
            return OffsetDateTime.parse(localDateTime + "+07:00");
        }

        @Test
        void startInThePastIsRejectedButTheCurrentHourIsStillBookable() {
            assertThatThrownBy(() -> bookingService.validateSchedule(realBranchId, DurationUnit.hour,
                    vn("2026-10-01T09:00:00"), vn("2026-10-01T11:00:00"), now))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("đã qua");

            givenBranchHours("07:00", "22:00");
            bookingService.validateSchedule(realBranchId, DurationUnit.hour, vn("2026-10-01T10:00:00"), vn("2026-10-01T12:00:00"), now);
        }

        @Test
        void hourlyBookingMustFitInsideOpeningHoursInVietnamTime() {
            givenBranchHours("07:00", "22:00");

            // 06:00 in Vietnam is 23:00 UTC the previous day: the check must not be done in UTC.
            assertThatThrownBy(() -> bookingService.validateSchedule(realBranchId, DurationUnit.hour,
                    vn("2026-10-02T06:00:00"), vn("2026-10-02T08:00:00"), now))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("07:00");
            assertThatThrownBy(() -> bookingService.validateSchedule(realBranchId, DurationUnit.hour,
                    vn("2026-10-02T21:00:00"), vn("2026-10-02T23:00:00"), now))
                    .isInstanceOf(IllegalArgumentException.class);
            assertThatThrownBy(() -> bookingService.validateSchedule(realBranchId, DurationUnit.hour,
                    vn("2026-10-02T21:00:00"), vn("2026-10-03T08:00:00"), now))
                    .isInstanceOf(IllegalArgumentException.class);

            bookingService.validateSchedule(realBranchId, DurationUnit.hour, vn("2026-10-02T20:00:00"), vn("2026-10-02T22:00:00"), now);
        }

        @Test
        void dailyBookingOnlyNeedsToStartWhileOpen() {
            givenBranchHours("07:00", "22:00");

            bookingService.validateSchedule(realBranchId, DurationUnit.day, vn("2026-10-02T09:00:00"), vn("2026-10-04T09:00:00"), now);
            assertThatThrownBy(() -> bookingService.validateSchedule(realBranchId, DurationUnit.day,
                    vn("2026-10-02T23:00:00"), vn("2026-10-03T23:00:00"), now))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        void inactiveBranchTakesNoBookings() {
            when(branchEntityRepository.findById(realBranchId)).thenReturn(Optional.of(BranchEntity.builder()
                    .id(realBranchId).status(BranchEntity.BranchStatus.inactive).build()));

            assertThatThrownBy(() -> bookingService.validateSchedule(realBranchId, DurationUnit.hour,
                    vn("2026-10-02T09:00:00"), vn("2026-10-02T10:00:00"), now))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Nested
    class Addons {

        @Test
        void addonsOrderedAtCheckoutArePricedOnServerAndAddedToTheTotal() {
            givenWorkspaceExists();
            givenSaveSucceeds();
            givenNoMembershipTier();
            when(pricingService.getUnitPriceVnd(realBranchId, workspaceTypeId.toString(), "hour")).thenReturn(50_000L);
            List<BookingAddonDto.LineRequest> requested = List.of(new BookingAddonDto.LineRequest(UUID.randomUUID(), 2));
            List<BookingServiceItem> priced = List.of(BookingServiceItem.builder().quantity(2).unitPrice(35_000L).subtotal(70_000L).build());
            when(bookingAddonService.priceLines(realBranchId, requested)).thenReturn(priced);
            BookingCreateRequest req = request(DurationUnit.hour, 2);
            req.setAddons(requested);

            bookingService.createBooking(userId, req);

            ArgumentCaptor<Booking> captor = ArgumentCaptor.forClass(Booking.class);
            verify(bookingRepository).save(captor.capture());
            assertThat(captor.getValue().getSubtotalAmount()).isEqualTo(100_000L);
            assertThat(captor.getValue().getAddonAmount()).isEqualTo(70_000L);
            assertThat(captor.getValue().getTotalAmount()).isEqualTo(170_000L);
            verify(bookingAddonService).attachToNewBooking(captor.getValue(), userId, priced);
        }
    }

    @Nested
    class UnitCount {

        private final OffsetDateTime start = OffsetDateTime.parse("2026-10-01T09:00:00+07:00");

        @Test
        void startedHourIsChargedInFull() {
            assertThat(BookingService.computeUnitCount(DurationUnit.hour, start, start.plusMinutes(150))).isEqualTo(3);
            assertThat(BookingService.computeUnitCount(DurationUnit.hour, start, start.plusHours(2))).isEqualTo(2);
        }

        @Test
        void daysAndWeeksRoundUp() {
            assertThat(BookingService.computeUnitCount(DurationUnit.day, start, start.plusDays(1))).isEqualTo(1);
            assertThat(BookingService.computeUnitCount(DurationUnit.day, start, start.plusHours(25))).isEqualTo(2);
            assertThat(BookingService.computeUnitCount(DurationUnit.week, start, start.plusDays(10))).isEqualTo(2);
        }

        @Test
        void monthsAreCalendarMonths() {
            OffsetDateTime jan31 = OffsetDateTime.parse("2026-01-31T09:00:00+07:00");
            assertThat(BookingService.computeUnitCount(DurationUnit.month, jan31, jan31.plusMonths(1))).isEqualTo(1);
            assertThat(BookingService.computeUnitCount(DurationUnit.month, start, start.plusMonths(1).plusDays(1))).isEqualTo(2);
        }

        @Test
        void rejectsEmptyOrInvertedSpan() {
            assertThatThrownBy(() -> BookingService.computeUnitCount(DurationUnit.hour, start, start))
                    .isInstanceOf(IllegalArgumentException.class);
            assertThatThrownBy(() -> BookingService.computeUnitCount(DurationUnit.hour, start, start.minusHours(1)))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Nested
    class Ownership {

        @Test
        void getMyBookingDoesNotReturnOtherUsersBooking() {
            UUID bookingId = UUID.randomUUID();
            when(bookingRepository.findByIdAndUserId(bookingId, userId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> bookingService.getMyBooking(userId, bookingId))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        void bookingCodeLookupRejectsOtherBranch() {
            Booking booking = Booking.builder().id(UUID.randomUUID()).branchId(realBranchId).build();
            when(bookingRepository.findByBookingCode("WH-ABC234")).thenReturn(Optional.of(booking));

            assertThatThrownBy(() -> bookingService.getBookingByCode("WH-ABC234", UUID.randomUUID()))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }
}
