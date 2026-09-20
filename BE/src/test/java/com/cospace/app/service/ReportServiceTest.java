package com.cospace.app.service;

import com.cospace.app.dto.api.ReportOverviewDto;
import com.cospace.app.entity.Booking;
import com.cospace.app.entity.BookingServiceItem;
import com.cospace.app.entity.BookingStatus;
import com.cospace.app.entity.BranchEntity;
import com.cospace.app.entity.Refund;
import com.cospace.app.repository.BookingRepository;
import com.cospace.app.repository.BookingServiceItemRepository;
import com.cospace.app.repository.BranchEntityRepository;
import com.cospace.app.repository.RefundRepository;
import com.cospace.app.repository.UserRepository;
import com.cospace.app.repository.WorkspaceTypeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * Revenue is recognised for bookings that were actually used, net of what the customer never paid
 * and of anything given back — the definition the project owner settled on (Q11).
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ReportServiceTest {

    private static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");

    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private BranchEntityRepository branchRepository;
    @Mock
    private WorkspaceTypeRepository workspaceTypeRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private BookingServiceItemRepository bookingServiceItemRepository;
    @Mock
    private RefundRepository refundRepository;

    @InjectMocks
    private ReportService reportService;

    private final UUID branchId = UUID.randomUUID();

    private Booking booking(BookingStatus status, long total, OffsetDateTime endAt) {
        return Booking.builder()
                .id(UUID.randomUUID())
                .bookingCode("WH-RPT001")
                .branchId(branchId)
                .userId(UUID.randomUUID())
                .status(status)
                .startAt(endAt.minusHours(2))
                .endAt(endAt)
                .totalAmount(total)
                .build();
    }

    private static OffsetDateTime yesterdayAfternoon() {
        return LocalDate.now(VN).minusDays(1).atTime(17, 0).atZone(VN).toOffsetDateTime()
                .withOffsetSameInstant(ZoneOffset.UTC);
    }

    @Test
    void revenueCountsUsedBookingsNetOfUnpaidTabsAndRefunds() {
        Booking used = booking(BookingStatus.COMPLETED, 1_000_000L, yesterdayAfternoon());
        Booking cancelled = booking(BookingStatus.CANCELLED, 500_000L, yesterdayAfternoon());
        Booking partlyRefunded = booking(BookingStatus.COMPLETED, 500_000L, yesterdayAfternoon());
        Booking noShow = booking(BookingStatus.NO_SHOW, 400_000L, yesterdayAfternoon());
        Booking futureAndPaid = booking(BookingStatus.CONFIRMED, 2_000_000L, yesterdayAfternoon().plusMonths(1));

        when(bookingRepository.findAll())
                .thenReturn(List.of(used, cancelled, partlyRefunded, noShow, futureAndPaid));
        when(branchRepository.findAll()).thenReturn(List.of(
                BranchEntity.builder().id(branchId).name("CoSpace Q1").code("Q1").build()));
        // The guest walked out with 300k of add-ons still on the tab: a debt, not revenue.
        when(bookingServiceItemRepository.sumSubtotalByBookingsAndStatus(any(), eq(BookingServiceItem.STATUS_UNPAID)))
                .thenReturn(List.<Object[]>of(new Object[]{used.getId(), 300_000L}));
        // 200k was refunded on another booking and must come off the total.
        when(refundRepository.sumAmountByBookingsAndStatus(any(), eq(Refund.STATUS_PROCESSED)))
                .thenReturn(List.<Object[]>of(new Object[]{partlyRefunded.getId(), 200_000L}));

        LocalDate day = LocalDate.now(VN).minusDays(1);
        ReportOverviewDto overview = reportService.getOverview(branchId, day, day, null);

        // 700k (1m − 300k tab) + 300k (500k − 200k refunded) + 400k (no-show forfeits the fee).
        // The cancelled booking's retained penalty is not revenue, and next month's confirmed
        // booking has not been delivered yet.
        assertThat(overview.getTotalRevenue()).isEqualTo(1_400_000L);
        assertThat(overview.getCanceledBookings()).isEqualTo(1);
        assertThat(overview.getCompletedBookings()).isEqualTo(2);
    }

    @Test
    void bucketsAndBranchComparisonUseTheSameRuleAsTheHeadlineFigure() {
        Booking used = booking(BookingStatus.COMPLETED, 1_000_000L, yesterdayAfternoon());
        Booking futureAndPaid = booking(BookingStatus.CONFIRMED, 9_000_000L, yesterdayAfternoon().plusMonths(1));

        when(bookingRepository.findAll()).thenReturn(List.of(used, futureAndPaid));
        when(branchRepository.findAll()).thenReturn(List.of(
                BranchEntity.builder().id(branchId).name("CoSpace Q1").code("Q1").build()));

        LocalDate day = LocalDate.now(VN).minusDays(1);
        // branchId = null asks for the system-wide view, which is the one carrying the comparison.
        ReportOverviewDto overview = reportService.getOverview(null, day, day, null);

        assertThat(overview.getTotalRevenue()).isEqualTo(1_000_000L);
        assertThat(overview.getMonthlyRevenue().stream().mapToLong(Long::longValue).sum())
                .isEqualTo(overview.getTotalRevenue());
        assertThat(overview.getBranchComparison()).hasSize(1);
        assertThat(overview.getBranchComparison().get(0).getRevenue()).isEqualTo(overview.getTotalRevenue());
    }
}
