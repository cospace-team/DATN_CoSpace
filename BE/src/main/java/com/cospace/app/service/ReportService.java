package com.cospace.app.service;

import com.cospace.app.dto.api.ReportOverviewDto;
import com.cospace.app.entity.Booking;
import com.cospace.app.entity.BookingStatus;
import com.cospace.app.entity.BranchEntity;
import com.cospace.app.entity.Payment;
import com.cospace.app.entity.PaymentStatus;
import com.cospace.app.entity.User;
import com.cospace.app.entity.WorkspaceType;
import com.cospace.app.repository.BookingRepository;
import com.cospace.app.repository.BranchEntityRepository;
import com.cospace.app.repository.PaymentRepository;
import com.cospace.app.repository.UserRepository;
import com.cospace.app.repository.WorkspaceTypeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportService {

    // CoSpace operates in Vietnam; a "day" or "month" boundary chosen by a branch admin
    // (dateFrom/dateTo, or a booking's created_at grouped into a calendar month) must be
    // interpreted in this zone, not UTC — otherwise every boundary is off by 7 hours and a
    // booking made just after local midnight can land in the wrong day/month.
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private static final Set<BookingStatus> REVENUE_STATUSES = Set.of(
            BookingStatus.COMPLETED, BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT, BookingStatus.CONFIRMED);

    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final BranchEntityRepository branchRepository;
    private final WorkspaceTypeRepository workspaceTypeRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public ReportOverviewDto getOverview(UUID branchId, LocalDate dateFrom, LocalDate dateTo) {
        OffsetDateTime start = (dateFrom != null) ? vnStartOfDay(dateFrom) : null;
        OffsetDateTime end = (dateTo != null) ? vnEndOfDay(dateTo) : null;

        List<Booking> allBookings = bookingRepository.findAll();
        List<BranchEntity> branches = branchRepository.findAll();
        Map<String, WorkspaceType> typeMap = workspaceTypeRepository.findAll().stream()
                .collect(Collectors.toMap(wt -> wt.getId().toString(), Function.identity(), (a, b) -> a));

        // Filter bookings
        List<Booking> branchBookings = allBookings.stream()
                .filter(b -> branchId == null || branchId.equals(b.getBranchId()))
                .toList();
                
        List<Booking> filtered = branchBookings.stream()
                .filter(b -> start == null || (b.getCreatedAt() != null && !b.getCreatedAt().isBefore(start)))
                .filter(b -> end == null || (b.getCreatedAt() != null && !b.getCreatedAt().isAfter(end)))
                .toList();
                
        // Fetch all PAID payments for this branch for fallback
        Set<UUID> branchBookingIds = branchBookings.stream().map(Booking::getId).collect(Collectors.toSet());
        List<Payment> branchPayments = paymentRepository.findAll().stream()
                .filter(p -> p.getStatus() == PaymentStatus.PAID)
                .filter(p -> branchBookingIds.contains(p.getBookingId()))
                .toList();

        int totalBookings = filtered.size();
        int completedBookings = (int) filtered.stream().filter(b -> b.getStatus() == BookingStatus.COMPLETED).count();
        int canceledBookings = (int) filtered.stream().filter(b -> b.getStatus() == BookingStatus.CANCELLED).count();

        // Revenue from paid payments or completed/checked_in bookings, applied via the same
        // computeRevenue() helper as the monthly and by-type breakdowns below so all three
        // numbers are derived from the exact same rule and can never disagree with each other.
        long totalRevenue = computeRevenue(filtered, branchPayments, start, end);

        // Determine the range of months to display
        YearMonth startYM;
        YearMonth endYM;
        if (start != null && end != null) {
            startYM = toVnYearMonth(start);
            endYM = toVnYearMonth(end);
        } else {
            endYM = YearMonth.now(VN_ZONE);
            startYM = endYM.minusMonths(5); // Default to last 6 months
        }
        
        // Cap at 12 months to avoid UI overflow
        if (java.time.temporal.ChronoUnit.MONTHS.between(startYM, endYM) > 11) {
            startYM = endYM.minusMonths(11);
        }

        List<String> months = new ArrayList<>();
        List<Long> monthlyRevenue = new ArrayList<>();
        
        YearMonth ym = startYM;
        while (!ym.isAfter(endYM)) {
            String label = "T" + ym.getMonthValue();
            if (startYM.getYear() != endYM.getYear()) {
                label += "/" + (ym.getYear() % 100);
            }
            months.add(label);
            
            // Scope both bookings and payments to this calendar month (in VN time) AND to the
            // overall requested [start, end] window — the window can be narrower than a full
            // month (e.g. a "this week" filter), and without this second filter the bucket would
            // count the whole month's revenue while the KPI total above only counts the window,
            // so the chart bars would never add up to the headline total.
            final YearMonth currentYm = ym;
            List<Booking> monthBookings = branchBookings.stream()
                    .filter(b -> b.getCreatedAt() != null && toVnYearMonth(b.getCreatedAt()).equals(currentYm))
                    .filter(b -> start == null || !b.getCreatedAt().isBefore(start))
                    .filter(b -> end == null || !b.getCreatedAt().isAfter(end))
                    .toList();
            List<Payment> monthPayments = branchPayments.stream()
                    .filter(p -> p.getCreatedAt() != null && toVnYearMonth(p.getCreatedAt()).equals(currentYm))
                    .toList();
            long mRev = computeRevenue(monthBookings, monthPayments, start, end);
            monthlyRevenue.add(mRev);
            ym = ym.plusMonths(1);
        }

        // By workspace type breakdown
        String[] colors = {
                "from-blue-500 to-indigo-500",
                "from-violet-500 to-purple-500",
                "from-emerald-500 to-teal-500",
                "from-amber-500 to-orange-500"
        };
        Map<String, List<Booking>> groupedByType = filtered.stream()
                .collect(Collectors.groupingBy(b -> b.getWorkspaceTypeId() != null ? b.getWorkspaceTypeId() : "Khác"));

        List<ReportOverviewDto.WorkspaceTypeStatDto> byType = new ArrayList<>();
        int colorIdx = 0;
        for (Map.Entry<String, List<Booking>> entry : groupedByType.entrySet()) {
            String typeKey = entry.getKey();
            WorkspaceType wt = typeMap.get(typeKey);
            String typeName = wt != null ? wt.getName() : "Không gian làm việc";
            int count = entry.getValue().size();
            Set<UUID> typeBookingIds = entry.getValue().stream().map(Booking::getId).collect(Collectors.toSet());
            List<Payment> typePayments = branchPayments.stream()
                    .filter(p -> typeBookingIds.contains(p.getBookingId()))
                    .toList();
            long rev = computeRevenue(entry.getValue(), typePayments, start, end);
            String color = colors[colorIdx % colors.length];
            colorIdx++;

            byType.add(new ReportOverviewDto.WorkspaceTypeStatDto(typeName, count, rev, color));
        }

        // Branch Comparison — only meaningful (and only allowed) for a system-wide view.
        // When branchId is set the caller is scoped to a single branch (enforced by
        // BranchAccessGuard.resolveReportBranchId at the controller), so comparing against every
        // other branch's revenue would leak data the caller has no right to see.
        List<ReportOverviewDto.BranchComparisonDto> branchComparison = new ArrayList<>();
        if (branchId == null) {
            for (BranchEntity branch : branches) {
                List<Booking> bBookings = allBookings.stream()
                        .filter(b -> branch.getId().equals(b.getBranchId()))
                        .toList();
                int bCount = bBookings.size();
                long bRev = bBookings.stream()
                        .filter(b -> b.getStatus() == BookingStatus.COMPLETED || b.getStatus() == BookingStatus.CHECKED_IN)
                        .mapToLong(Booking::getTotalAmount)
                        .sum();
                int compCount = (int) bBookings.stream().filter(b -> b.getStatus() == BookingStatus.COMPLETED).count();
                int rate = bCount > 0 ? (int) Math.round(((double) compCount / bCount) * 100) : 0;

                branchComparison.add(new ReportOverviewDto.BranchComparisonDto(
                        branch.getId(),
                        branch.getName(),
                        branch.getCode(),
                        bCount,
                        bRev,
                        rate
                ));
            }
        }

        log.info("Total Revenue: {}, Monthly Revenue: {}", totalRevenue, monthlyRevenue);

        return ReportOverviewDto.builder()
                .totalRevenue(totalRevenue)
                .totalBookings(totalBookings)
                .completedBookings(completedBookings)
                .canceledBookings(canceledBookings)
                .months(months)
                .monthlyRevenue(monthlyRevenue)
                .byType(byType)
                .branchComparison(branchComparison)
                .build();
    }

    /**
     * Sums revenue for a given scope of bookings, using paid payments as a fallback ONLY when
     * that same scope has no booking-derived revenue at all (e.g. legacy rows where
     * {@code total_amount} was never populated). The fallback is always evaluated over the exact
     * same {@code bookings} scope's payments — never the whole branch's — and always within the
     * same {@code rangeStart}/{@code rangeEnd} window, so this can be called identically for the
     * headline total, each monthly bucket, and each workspace-type slice without the three ever
     * disagreeing with each other or double-counting revenue across sources.
     */
    private long computeRevenue(List<Booking> bookings, List<Payment> payments, OffsetDateTime rangeStart, OffsetDateTime rangeEnd) {
        long bookingRevenue = bookings.stream()
                .filter(b -> REVENUE_STATUSES.contains(b.getStatus()))
                .mapToLong(Booking::getTotalAmount)
                .sum();
        if (bookingRevenue != 0) {
            return bookingRevenue;
        }
        return payments.stream()
                .filter(p -> rangeStart == null || (p.getCreatedAt() != null && !p.getCreatedAt().isBefore(rangeStart)))
                .filter(p -> rangeEnd == null || (p.getCreatedAt() != null && !p.getCreatedAt().isAfter(rangeEnd)))
                .mapToLong(Payment::getAmount)
                .sum();
    }

    private OffsetDateTime vnStartOfDay(LocalDate date) {
        return date.atStartOfDay(VN_ZONE).toOffsetDateTime().withOffsetSameInstant(ZoneOffset.UTC);
    }

    private OffsetDateTime vnEndOfDay(LocalDate date) {
        return date.atTime(LocalTime.MAX).atZone(VN_ZONE).toOffsetDateTime().withOffsetSameInstant(ZoneOffset.UTC);
    }

    private YearMonth toVnYearMonth(OffsetDateTime dt) {
        return YearMonth.from(dt.atZoneSameInstant(VN_ZONE));
    }

    @Transactional(readOnly = true)
    public byte[] exportBookingsCsv(UUID branchId, LocalDate dateFrom, LocalDate dateTo) {
        OffsetDateTime start = (dateFrom != null) ? vnStartOfDay(dateFrom) : null;
        OffsetDateTime end = (dateTo != null) ? vnEndOfDay(dateTo) : null;

        List<Booking> list = bookingRepository.findAll().stream()
                .filter(b -> branchId == null || branchId.equals(b.getBranchId()))
                .filter(b -> start == null || (b.getCreatedAt() != null && !b.getCreatedAt().isBefore(start)))
                .filter(b -> end == null || (b.getCreatedAt() != null && !b.getCreatedAt().isAfter(end)))
                .sorted(Comparator.comparing(Booking::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        Map<UUID, User> userMap = userRepository.findAll().stream()
                .collect(Collectors.toMap(User::getId, Function.identity(), (a, b) -> a));
        Map<UUID, BranchEntity> branchMap = branchRepository.findAll().stream()
                .collect(Collectors.toMap(BranchEntity::getId, Function.identity(), (a, b) -> a));

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (PrintWriter writer = new PrintWriter(new OutputStreamWriter(baos, StandardCharsets.UTF_8))) {
            // Write UTF-8 BOM so Excel opens with proper accents
            baos.write(0xEF);
            baos.write(0xBB);
            baos.write(0xBF);

            // CSV Header
            writer.println("Mã đơn,Khách hàng,Email,Số điện thoại,Chi nhánh,Thời gian bắt đầu,Thời gian kết thúc,Tổng tiền (VND),Trạng thái,Nguồn đặt,Ngày tạo");

            for (Booking b : list) {
                User u = userMap.get(b.getUserId());
                BranchEntity br = branchMap.get(b.getBranchId());

                String userName = u != null ? escapeCsv(u.getFullName()) : "N/A";
                String userEmail = u != null ? escapeCsv(u.getEmail()) : "N/A";
                String userPhone = u != null && u.getPhone() != null ? escapeCsv(u.getPhone()) : "";
                String branchName = br != null ? escapeCsv(br.getName()) : "N/A";

                // Timestamps are stored in UTC; render them in VN local time for the exported report.
                String startAt = b.getStartAt() != null ? b.getStartAt().atZoneSameInstant(VN_ZONE).format(fmt) : "";
                String endAt = b.getEndAt() != null ? b.getEndAt().atZoneSameInstant(VN_ZONE).format(fmt) : "";
                String createdAt = b.getCreatedAt() != null ? b.getCreatedAt().atZoneSameInstant(VN_ZONE).format(fmt) : "";
                String status = b.getStatus() != null ? b.getStatus().name() : "";
                String source = b.getSource() != null ? b.getSource().name() : "";

                writer.println(String.format("%s,%s,%s,%s,%s,%s,%s,%d,%s,%s,%s",
                        escapeCsv(b.getBookingCode()),
                        userName,
                        userEmail,
                        userPhone,
                        branchName,
                        startAt,
                        endAt,
                        b.getTotalAmount(),
                        status,
                        source,
                        createdAt
                ));
            }
            writer.flush();
        } catch (Exception e) {
            log.error("Lỗi khi xuất CSV: {}", e.getMessage());
        }

        return baos.toByteArray();
    }

    private String escapeCsv(String val) {
        if (val == null) return "";
        if (val.contains(",") || val.contains("\"") || val.contains("\n")) {
            return "\"" + val.replace("\"", "\"\"") + "\"";
        }
        return val;
    }
}
