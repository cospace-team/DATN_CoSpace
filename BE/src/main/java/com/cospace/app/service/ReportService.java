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
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportService {

    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final BranchEntityRepository branchRepository;
    private final WorkspaceTypeRepository workspaceTypeRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public ReportOverviewDto getOverview(UUID branchId, LocalDate dateFrom, LocalDate dateTo) {
        OffsetDateTime start = (dateFrom != null) ? dateFrom.atStartOfDay().atOffset(ZoneOffset.UTC) : null;
        OffsetDateTime end = (dateTo != null) ? dateTo.atTime(LocalTime.MAX).atOffset(ZoneOffset.UTC) : null;

        List<Booking> allBookings = bookingRepository.findAll();
        List<BranchEntity> branches = branchRepository.findAll();
        Map<String, WorkspaceType> typeMap = workspaceTypeRepository.findAll().stream()
                .collect(Collectors.toMap(wt -> wt.getId().toString(), Function.identity(), (a, b) -> a));

        // Filter bookings
        List<Booking> filtered = allBookings.stream()
                .filter(b -> branchId == null || b.getBranchId().equals(branchId))
                .filter(b -> start == null || (b.getCreatedAt() != null && !b.getCreatedAt().isBefore(start)))
                .filter(b -> end == null || (b.getCreatedAt() != null && !b.getCreatedAt().isAfter(end)))
                .toList();

        int totalBookings = filtered.size();
        int completedBookings = (int) filtered.stream().filter(b -> b.getStatus() == BookingStatus.COMPLETED).count();
        int canceledBookings = (int) filtered.stream().filter(b -> b.getStatus() == BookingStatus.CANCELLED).count();

        // Revenue from paid payments or completed/checked_in bookings
        long totalRevenue = filtered.stream()
                .filter(b -> b.getStatus() == BookingStatus.COMPLETED || b.getStatus() == BookingStatus.CHECKED_IN)
                .mapToLong(Booking::getTotalAmount)
                .sum();

        // If no booking revenue, fallback to sum of paid payments in period
        if (totalRevenue == 0) {
            List<Payment> paidPayments = paymentRepository.findAll().stream()
                    .filter(p -> p.getStatus() == PaymentStatus.PAID)
                    .filter(p -> start == null || (p.getCreatedAt() != null && !p.getCreatedAt().isBefore(start)))
                    .filter(p -> end == null || (p.getCreatedAt() != null && !p.getCreatedAt().isAfter(end)))
                    .toList();
            totalRevenue = paidPayments.stream().mapToLong(Payment::getAmount).sum();
        }

        // Monthly revenue for the last 4 months
        List<String> months = new ArrayList<>();
        List<Long> monthlyRevenue = new ArrayList<>();
        YearMonth currentYM = YearMonth.now();
        for (int i = 3; i >= 0; i--) {
            YearMonth ym = currentYM.minusMonths(i);
            String label = "T" + ym.getMonthValue();
            months.add(label);

            long mRev = allBookings.stream()
                    .filter(b -> branchId == null || b.getBranchId().equals(branchId))
                    .filter(b -> b.getCreatedAt() != null && YearMonth.from(b.getCreatedAt()).equals(ym))
                    .filter(b -> b.getStatus() == BookingStatus.COMPLETED || b.getStatus() == BookingStatus.CHECKED_IN)
                    .mapToLong(Booking::getTotalAmount)
                    .sum();
            monthlyRevenue.add(mRev);
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
            long rev = entry.getValue().stream()
                    .filter(b -> b.getStatus() == BookingStatus.COMPLETED || b.getStatus() == BookingStatus.CHECKED_IN)
                    .mapToLong(Booking::getTotalAmount)
                    .sum();
            String color = colors[colorIdx % colors.length];
            colorIdx++;

            byType.add(new ReportOverviewDto.WorkspaceTypeStatDto(typeName, count, rev, color));
        }

        // Branch Comparison
        List<ReportOverviewDto.BranchComparisonDto> branchComparison = new ArrayList<>();
        for (BranchEntity branch : branches) {
            List<Booking> bBookings = allBookings.stream()
                    .filter(b -> b.getBranchId().equals(branch.getId()))
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

    @Transactional(readOnly = true)
    public byte[] exportBookingsCsv(UUID branchId, LocalDate dateFrom, LocalDate dateTo) {
        OffsetDateTime start = (dateFrom != null) ? dateFrom.atStartOfDay().atOffset(ZoneOffset.UTC) : null;
        OffsetDateTime end = (dateTo != null) ? dateTo.atTime(LocalTime.MAX).atOffset(ZoneOffset.UTC) : null;

        List<Booking> list = bookingRepository.findAll().stream()
                .filter(b -> branchId == null || b.getBranchId().equals(branchId))
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

                String startAt = b.getStartAt() != null ? b.getStartAt().format(fmt) : "";
                String endAt = b.getEndAt() != null ? b.getEndAt().format(fmt) : "";
                String createdAt = b.getCreatedAt() != null ? b.getCreatedAt().format(fmt) : "";
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
