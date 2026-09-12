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
        return getOverview(branchId, dateFrom, dateTo, null);
    }

    @Transactional(readOnly = true)
    public ReportOverviewDto getOverview(UUID branchId, LocalDate dateFrom, LocalDate dateTo, String groupBy) {
        OffsetDateTime start = (dateFrom != null) ? vnStartOfDay(dateFrom) : null;
        OffsetDateTime end = (dateTo != null) ? vnEndOfDay(dateTo) : null;

        List<Booking> allBookings = bookingRepository.findAll();
        List<BranchEntity> branches = branchRepository.findAll();

        // Filter bookings
        List<Booking> branchBookings = allBookings.stream()
                .filter(b -> branchId == null || branchId.equals(b.getBranchId()))
                .toList();
                
        List<Booking> filtered = branchBookings.stream()
                .filter(b -> {
                    OffsetDateTime t = getBookingEffectiveTime(b);
                    return (start == null || (t != null && !t.isBefore(start))) &&
                           (end == null || (t != null && !t.isAfter(end)));
                })
                .toList();
                
        // Filter payments: scoped to this branch's bookings
        Set<UUID> branchBookingIds = branchBookings.stream().map(Booking::getId).collect(Collectors.toSet());
        List<Payment> allPayments = paymentRepository.findAll();
        List<Payment> branchPayments = allPayments.stream()
                .filter(p -> branchBookingIds.contains(p.getBookingId()))
                .filter(p -> p.getStatus() == PaymentStatus.PAID)
                .toList();

        int totalBookings = filtered.size();
        int completedBookings = (int) filtered.stream().filter(b -> b.getStatus() == BookingStatus.COMPLETED).count();
        int canceledBookings = (int) filtered.stream().filter(b -> b.getStatus() == BookingStatus.CANCELLED).count();

        // Revenue from paid payments or completed/checked_in bookings, applied via the same
        // computeRevenue() helper as the monthly and by-type breakdowns below so all three
        // numbers are derived from the exact same rule and can never disagree with each other.
        long totalRevenue = computeRevenue(filtered, branchPayments, start, end);

        // Resolve local date boundaries in VN time zone to avoid UTC offset day/year shifting
        LocalDate localFrom = (dateFrom != null) ? dateFrom : (start != null ? start.atZoneSameInstant(VN_ZONE).toLocalDate() : null);
        LocalDate localTo = (dateTo != null) ? dateTo : (end != null ? end.atZoneSameInstant(VN_ZONE).toLocalDate() : null);

        // Determine effective grouping: hour, day, week, month, quarter
        String effectiveGroupBy = (groupBy != null && !groupBy.isBlank()) ? groupBy.trim().toLowerCase() : "auto";
        if ("auto".equals(effectiveGroupBy)) {
            if (localFrom != null && localTo != null && localFrom.equals(localTo)) {
                effectiveGroupBy = "hour";
            } else if (localFrom != null && localTo != null && java.time.temporal.ChronoUnit.DAYS.between(localFrom, localTo) <= 8) {
                effectiveGroupBy = "day";
            } else if (localFrom != null && localTo != null && java.time.temporal.ChronoUnit.DAYS.between(localFrom, localTo) <= 35 && localFrom.getMonth() == localTo.getMonth()) {
                effectiveGroupBy = "week";
            } else {
                effectiveGroupBy = "month";
            }
        }

        List<String> months = new ArrayList<>();
        List<Long> monthlyRevenue = new ArrayList<>();
        List<Integer> monthlyBookings = new ArrayList<>();

        if ("hour".equals(effectiveGroupBy)) {
            // Hourly blocks (08:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00, 22:00) for single day / today
            LocalDate targetDate = (localFrom != null) ? localFrom : LocalDate.now(VN_ZONE);
            for (int h = 8; h <= 22; h += 2) {
                LocalTime tStart = LocalTime.of(h, 0);
                LocalTime tEnd = (h == 22) ? LocalTime.of(23, 59, 59, 999_999_999) : LocalTime.of(h + 1, 59, 59, 999_999_999);
                OffsetDateTime slotStart = targetDate.atTime(tStart).atZone(VN_ZONE).toOffsetDateTime().withOffsetSameInstant(ZoneOffset.UTC);
                OffsetDateTime slotEnd = targetDate.atTime(tEnd).atZone(VN_ZONE).toOffsetDateTime().withOffsetSameInstant(ZoneOffset.UTC);

                months.add(String.format("%02d:00", h));

                List<Booking> slotBookings = branchBookings.stream()
                        .filter(b -> {
                            OffsetDateTime t = getBookingEffectiveTime(b);
                            return t != null && !t.isBefore(slotStart) && !t.isAfter(slotEnd);
                        })
                        .toList();
                List<Payment> slotPayments = branchPayments.stream()
                        .filter(p -> p.getCreatedAt() != null && !p.getCreatedAt().isBefore(slotStart) && !p.getCreatedAt().isAfter(slotEnd))
                        .toList();
                monthlyRevenue.add(computeRevenue(slotBookings, slotPayments, slotStart, slotEnd));
                monthlyBookings.add((int) slotBookings.stream().filter(b -> REVENUE_STATUSES.contains(b.getStatus())).count());
            }
        } else if ("day".equals(effectiveGroupBy)) {
            // Daily granularity: show all days in range (e.g. 01/09 to 30/09 for this month)
            LocalDate cur = (localFrom != null) ? localFrom : LocalDate.now(VN_ZONE).minusDays(6);
            LocalDate last = (localTo != null) ? localTo : LocalDate.now(VN_ZONE);
            DateTimeFormatter dayFmt = DateTimeFormatter.ofPattern("dd/MM");
            while (!cur.isAfter(last)) {
                OffsetDateTime dayStart = vnStartOfDay(cur);
                OffsetDateTime dayEnd = vnEndOfDay(cur);
                months.add(cur.format(dayFmt));
                List<Booking> dayBookings = branchBookings.stream()
                        .filter(b -> {
                            OffsetDateTime t = getBookingEffectiveTime(b);
                            return t != null && !t.isBefore(dayStart) && !t.isAfter(dayEnd);
                        })
                        .toList();
                List<Payment> dayPayments = branchPayments.stream()
                        .filter(p -> p.getCreatedAt() != null && !p.getCreatedAt().isBefore(dayStart) && !p.getCreatedAt().isAfter(dayEnd))
                        .toList();
                monthlyRevenue.add(computeRevenue(dayBookings, dayPayments, dayStart, dayEnd));
                monthlyBookings.add((int) dayBookings.stream().filter(b -> REVENUE_STATUSES.contains(b.getStatus())).count());
                cur = cur.plusDays(1);
            }
        } else if ("week".equals(effectiveGroupBy)) {
            LocalDate wRangeStart = (localFrom != null) ? localFrom : LocalDate.now(VN_ZONE).withDayOfMonth(1);
            LocalDate wRangeEnd = (localTo != null) ? localTo : wRangeStart.withDayOfMonth(wRangeStart.lengthOfMonth());

            YearMonth startYm = YearMonth.from(wRangeStart);
            YearMonth endYm = YearMonth.from(wRangeEnd);

            if (startYm.equals(endYm)) {
                // Single month weekly breakdown (Tuần 1..5 of this month)
                int lengthOfMonth = wRangeStart.lengthOfMonth();
                int[][] weekRanges = { {1, 7}, {8, 14}, {15, 21}, {22, 28}, {29, lengthOfMonth} };
                int maxWeeks = (lengthOfMonth > 28) ? 5 : 4;
                for (int i = 0; i < maxWeeks; i++) {
                    int startDay = weekRanges[i][0];
                    int endDay = Math.min(weekRanges[i][1], lengthOfMonth);
                    LocalDate wStart = wRangeStart.withDayOfMonth(startDay);
                    LocalDate wEnd = wRangeStart.withDayOfMonth(endDay);
                    
                    OffsetDateTime wStartDt = vnStartOfDay(wStart);
                    OffsetDateTime wEndDt = vnEndOfDay(wEnd);
                    
                    String label = String.format("Tuần %d (%02d-%02d)", i + 1, startDay, endDay);
                    months.add(label);
                    
                    List<Booking> weekBookings = branchBookings.stream()
                            .filter(b -> {
                                OffsetDateTime t = getBookingEffectiveTime(b);
                                return t != null && !t.isBefore(wStartDt) && !t.isAfter(wEndDt);
                            })
                            .toList();
                    List<Payment> weekPayments = branchPayments.stream()
                            .filter(p -> p.getCreatedAt() != null && !p.getCreatedAt().isBefore(wStartDt) && !p.getCreatedAt().isAfter(wEndDt))
                            .toList();
                    monthlyRevenue.add(computeRevenue(weekBookings, weekPayments, wStartDt, wEndDt));
                    monthlyBookings.add((int) weekBookings.stream().filter(b -> REVENUE_STATUSES.contains(b.getStatus())).count());
                }
            } else {
                // Multi-month range (e.g. Quarter spanning 3 months): continuous 13 weeks across the quarter
                DateTimeFormatter dayMonthFmt = DateTimeFormatter.ofPattern("dd/MM");
                LocalDate curWeekStart = wRangeStart;
                int weekIndex = 1;
                while (!curWeekStart.isAfter(wRangeEnd)) {
                    LocalDate curWeekEnd = curWeekStart.plusDays(6);
                    // If remaining tail after this week is 3 days or fewer, merge into this week to prevent a 1-day tail
                    if (curWeekEnd.isAfter(wRangeEnd) || !curWeekStart.plusDays(9).isBefore(wRangeEnd)) {
                        curWeekEnd = wRangeEnd;
                    }

                    OffsetDateTime wStartDt = vnStartOfDay(curWeekStart);
                    OffsetDateTime wEndDt = vnEndOfDay(curWeekEnd);

                    String label = String.format("Tuần %d (%s-%s)", weekIndex, curWeekStart.format(dayMonthFmt), curWeekEnd.format(dayMonthFmt));
                    months.add(label);

                    List<Booking> weekBookings = branchBookings.stream()
                            .filter(b -> {
                                OffsetDateTime t = getBookingEffectiveTime(b);
                                return t != null && !t.isBefore(wStartDt) && !t.isAfter(wEndDt);
                            })
                            .toList();
                    List<Payment> weekPayments = branchPayments.stream()
                            .filter(p -> p.getCreatedAt() != null && !p.getCreatedAt().isBefore(wStartDt) && !p.getCreatedAt().isAfter(wEndDt))
                            .toList();
                    monthlyRevenue.add(computeRevenue(weekBookings, weekPayments, wStartDt, wEndDt));
                    monthlyBookings.add((int) weekBookings.stream().filter(b -> REVENUE_STATUSES.contains(b.getStatus())).count());

                    curWeekStart = curWeekEnd.plusDays(1);
                    weekIndex++;
                }
            }
        } else if ("quarter".equals(effectiveGroupBy)) {
            // Quarterly granularity: 4 Quý (Q1..Q4) for the selected calendar year
            int currentYear = (localFrom != null) ? localFrom.getYear() : LocalDate.now(VN_ZONE).getYear();
            int[][] quarters = { {1, 3}, {4, 6}, {7, 9}, {10, 12} };
            for (int q = 0; q < 4; q++) {
                int startMonth = quarters[q][0];
                int endMonth = quarters[q][1];
                LocalDate qStart = LocalDate.of(currentYear, startMonth, 1);
                LocalDate qEnd = LocalDate.of(currentYear, endMonth, YearMonth.of(currentYear, endMonth).lengthOfMonth());

                OffsetDateTime qStartDt = vnStartOfDay(qStart);
                OffsetDateTime qEndDt = vnEndOfDay(qEnd);

                months.add(String.format("Q%d (T%d-T%d)", q + 1, startMonth, endMonth));

                List<Booking> qBookings = branchBookings.stream()
                        .filter(b -> {
                            OffsetDateTime t = getBookingEffectiveTime(b);
                            return t != null && !t.isBefore(qStartDt) && !t.isAfter(qEndDt);
                        })
                        .toList();
                List<Payment> qPayments = branchPayments.stream()
                        .filter(p -> p.getCreatedAt() != null && !p.getCreatedAt().isBefore(qStartDt) && !p.getCreatedAt().isAfter(qEndDt))
                        .toList();
                monthlyRevenue.add(computeRevenue(qBookings, qPayments, qStartDt, qEndDt));
                monthlyBookings.add((int) qBookings.stream().filter(b -> REVENUE_STATUSES.contains(b.getStatus())).count());
            }
        } else {
            // Monthly granularity: for Year, Quarter or custom date ranges
            YearMonth startYM;
            YearMonth endYM;
            if (localFrom != null && localTo != null) {
                startYM = YearMonth.from(localFrom);
                endYM = YearMonth.from(localTo);
            } else {
                endYM = YearMonth.now(VN_ZONE);
                startYM = endYM.minusMonths(5);
            }

            // When viewing a calendar year, always display all 12 months (T1..T12) with future months having 0
            if (localFrom != null && localTo != null && localFrom.getYear() == localTo.getYear() && localFrom.getMonthValue() == 1 && (localTo.getMonthValue() == 12 || "year".equalsIgnoreCase(groupBy))) {
                startYM = YearMonth.of(localFrom.getYear(), 1);
                endYM = YearMonth.of(localFrom.getYear(), 12);
            }

            YearMonth ym = startYM;
            while (!ym.isAfter(endYM)) {
                String label = "T" + ym.getMonthValue();
                if (startYM.getYear() != endYM.getYear()) {
                    label += "/" + (ym.getYear() % 100);
                }
                months.add(label);

                final YearMonth currentYm = ym;
                OffsetDateTime ymStart = vnStartOfDay(ym.atDay(1));
                OffsetDateTime ymEnd = vnEndOfDay(ym.atEndOfMonth());

                List<Booking> monthBookings = branchBookings.stream()
                        .filter(b -> {
                            OffsetDateTime t = getBookingEffectiveTime(b);
                            return t != null && toVnYearMonth(t).equals(currentYm);
                        })
                        .toList();
                List<Payment> monthPayments = branchPayments.stream()
                        .filter(p -> p.getCreatedAt() != null && toVnYearMonth(p.getCreatedAt()).equals(currentYm))
                        .toList();
                monthlyRevenue.add(computeRevenue(monthBookings, monthPayments, ymStart, ymEnd));
                monthlyBookings.add((int) monthBookings.stream().filter(b -> REVENUE_STATUSES.contains(b.getStatus())).count());
                ym = ym.plusMonths(1);
            }
        }

        // Canonical Workspace Type breakdown
        String[] colors = {
                "from-blue-500 to-indigo-500",
                "from-emerald-500 to-teal-500",
                "from-purple-500 to-violet-500",
                "from-amber-500 to-orange-500"
        };
        
        Map<String, String> canonicalNameMap = new HashMap<>();
        for (WorkspaceType wt : workspaceTypeRepository.findAll()) {
            canonicalNameMap.put(wt.getId().toString(), wt.getName());
            canonicalNameMap.put(wt.getCode(), wt.getName());
        }

        Map<String, List<Booking>> groupedByType = filtered.stream()
                .collect(Collectors.groupingBy(b -> {
                    String raw = b.getWorkspaceTypeId();
                    if (raw == null || raw.isBlank()) return "Bàn làm việc";
                    if (canonicalNameMap.containsKey(raw)) return canonicalNameMap.get(raw);
                    String lower = raw.toLowerCase();
                    if (lower.contains("meeting")) return "Phòng họp";
                    if (lower.contains("office") || lower.contains("private")) return "Văn phòng riêng";
                    return "Bàn làm việc";
                }));

        List<ReportOverviewDto.WorkspaceTypeStatDto> byType = new ArrayList<>();
        int colorIdx = 0;
        for (Map.Entry<String, List<Booking>> entry : groupedByType.entrySet()) {
            String typeName = entry.getKey();
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
                .monthlyBookings(monthlyBookings)
                .byType(byType)
                .branchComparison(branchComparison)
                .build();
    }

    private OffsetDateTime getBookingEffectiveTime(Booking b) {
        return b.getStartAt() != null ? b.getStartAt() : b.getCreatedAt();
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
                .filter(b -> {
                    OffsetDateTime t = getBookingEffectiveTime(b);
                    return (start == null || (t != null && !t.isBefore(start))) &&
                           (end == null || (t != null && !t.isAfter(end)));
                })
                .sorted(Comparator.comparing(this::getBookingEffectiveTime, Comparator.nullsLast(Comparator.reverseOrder())))
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
