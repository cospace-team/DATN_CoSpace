package com.cospace.app.service;

import com.cospace.app.config.CacheConfig;
import com.cospace.app.dto.api.MembershipDto.MyMembershipResponse;
import com.cospace.app.dto.api.MembershipDto.RecalculateResponse;
import com.cospace.app.dto.api.MembershipDto.TierRequest;
import com.cospace.app.dto.api.MembershipDto.TierResponse;
import com.cospace.app.entity.BookingStatus;
import com.cospace.app.entity.MembershipTier;
import com.cospace.app.entity.User;
import com.cospace.app.repository.BookingRepository;
import com.cospace.app.repository.MembershipTierRepository;
import com.cospace.app.repository.PromotionRepository;
import com.cospace.app.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Membership tiers (hạng thành viên). A customer's tier is derived from their paid bookings —
 * total spend and booking count — and cached on {@code users.membership_tier}; it is refreshed
 * whenever the customer views their membership or creates a booking, and for everyone at once
 * when an admin triggers a recalculation after editing tier thresholds.
 */
@Service
@RequiredArgsConstructor
public class MembershipService {

    /** Booking statuses that count toward spend: paid, whether or not already used. */
    public static final List<BookingStatus> PAID_STATUSES = List.of(
            BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT, BookingStatus.COMPLETED,
            BookingStatus.NO_SHOW);

    /** Stored when no active tier applies (e.g. every tier was deactivated). */
    public static final String NO_TIER_CODE = "standard";

    private final MembershipTierRepository membershipTierRepository;
    private final MembershipTierCatalog tierCatalog;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final PromotionRepository promotionRepository;

    /** A customer's evaluated standing; {@code currentTier} is null only if no active tier exists. */
    public record Standing(TierResponse currentTier, TierResponse nextTier, long totalSpent, long bookingCount) {
        public int discountPercent() {
            return currentTier != null ? currentTier.getDiscountPercent() : 0;
        }

        public String tierCode() {
            return currentTier != null ? currentTier.getCode() : NO_TIER_CODE;
        }
    }

    /* ─────────────── Admin: tier CRUD ─────────────── */

    @Transactional(readOnly = true)
    public List<TierResponse> listAllTiers() {
        List<MembershipTier> tiers = membershipTierRepository.findAllByOrderBySortOrderAsc();
        Map<String, Long> counts = new HashMap<>();
        for (Object[] row : userRepository.countByMembershipTierForRole(User.Role.customer)) {
            counts.merge(String.valueOf(row[0]), ((Number) row[1]).longValue(), Long::sum);
        }
        // Customers whose stored code matches no tier (e.g. legacy 'standard', not yet
        // recalculated) are effectively in the entry tier, so count them there.
        long unmatched = counts.entrySet().stream()
                .filter(e -> tiers.stream().noneMatch(t -> t.getCode().equals(e.getKey())))
                .mapToLong(Map.Entry::getValue)
                .sum();
        String entryCode = tiers.stream().filter(t -> t.isActive() && t.isEntryTier())
                .map(MembershipTier::getCode).findFirst().orElse(null);

        return tiers.stream().map(t -> {
            TierResponse r = MembershipTierCatalog.toResponse(t);
            long count = counts.getOrDefault(t.getCode(), 0L);
            if (t.getCode().equals(entryCode)) count += unmatched;
            r.setMemberCount(count);
            return r;
        }).toList();
    }

    @Transactional
    @CacheEvict(value = CacheConfig.MEMBERSHIP_TIERS, allEntries = true)
    public TierResponse createTier(TierRequest req) {
        String code = req.getCode().trim();
        if (NO_TIER_CODE.equals(code)) {
            throw new IllegalArgumentException("Mã hạng \"" + NO_TIER_CODE + "\" được hệ thống dành riêng.");
        }
        if (membershipTierRepository.existsByCode(code)) {
            throw new IllegalStateException("Mã hạng \"" + code + "\" đã tồn tại.");
        }
        MembershipTier tier = MembershipTier.builder()
                .code(code)
                .isActive(req.getIsActive() == null || req.getIsActive())
                .build();
        applyRequest(tier, req);
        return MembershipTierCatalog.toResponse(membershipTierRepository.save(tier));
    }

    /** The tier code is immutable: customers and promotions reference tiers by code. */
    @Transactional
    @CacheEvict(value = CacheConfig.MEMBERSHIP_TIERS, allEntries = true)
    public TierResponse updateTier(UUID id, TierRequest req) {
        MembershipTier tier = findTier(id);
        applyRequest(tier, req);
        if (req.getIsActive() != null) tier.setActive(req.getIsActive());
        return MembershipTierCatalog.toResponse(membershipTierRepository.save(tier));
    }

    @Transactional
    @CacheEvict(value = CacheConfig.MEMBERSHIP_TIERS, allEntries = true)
    public MembershipTier deleteTier(UUID id) {
        MembershipTier tier = findTier(id);
        if (promotionRepository.existsByMinTierCode(tier.getCode())) {
            throw new IllegalStateException("Hạng \"" + tier.getName()
                    + "\" đang được dùng làm điều kiện của chương trình khuyến mãi. Hãy cập nhật khuyến mãi trước hoặc chỉ ngưng kích hoạt hạng.");
        }
        membershipTierRepository.delete(tier);
        return tier;
    }

    /** Re-derives and stores every customer's tier, e.g. after thresholds were changed. */
    @Transactional
    public RecalculateResponse recalculateAll() {
        List<User> customers = userRepository.findByRole(User.Role.customer);
        int changed = 0;
        for (User user : customers) {
            if (applyStanding(user, evaluate(user.getId()))) changed++;
        }
        return RecalculateResponse.builder()
                .processedUsers(customers.size())
                .changedUsers(changed)
                .build();
    }

    /* ─────────────── Customer standing ─────────────── */

    @Transactional(readOnly = true)
    public Standing evaluate(UUID userId) {
        long bookingCount = 0;
        long totalSpent = 0;
        List<Object[]> rows = bookingRepository.sumSpendByUser(userId, PAID_STATUSES);
        if (!rows.isEmpty() && rows.get(0) != null) {
            Object[] row = rows.get(0);
            bookingCount = row[0] != null ? ((Number) row[0]).longValue() : 0;
            totalSpent = row[1] != null ? ((Number) row[1]).longValue() : 0;
        }

        List<TierResponse> tiers = tierCatalog.activeTiers();
        int currentIndex = -1;
        for (int i = 0; i < tiers.size(); i++) {
            if (MembershipTierCatalog.isReachedBy(tiers.get(i), totalSpent, bookingCount)) currentIndex = i;
        }
        TierResponse current = currentIndex >= 0 ? tiers.get(currentIndex) : null;
        TierResponse next = currentIndex + 1 < tiers.size() ? tiers.get(currentIndex + 1) : null;
        return new Standing(current, next, totalSpent, bookingCount);
    }

    /** Evaluates the customer's tier and persists it if it changed. */
    @Transactional
    public Standing refreshTier(UUID userId) {
        Standing standing = evaluate(userId);
        userRepository.findById(userId).ifPresent(user -> applyStanding(user, standing));
        return standing;
    }

    @Transactional
    public MyMembershipResponse getMyMembership(UUID userId) {
        Standing s = refreshTier(userId);
        long spendToNext = 0;
        long bookingsToNext = 0;
        int progress = 100;
        TierResponse next = s.nextTier();
        if (next != null) {
            int spendPct = 0;
            int bookingPct = 0;
            if (next.getMinTotalSpent() > 0) {
                spendToNext = Math.max(0, next.getMinTotalSpent() - s.totalSpent());
                spendPct = (int) Math.min(100, s.totalSpent() * 100 / next.getMinTotalSpent());
            }
            if (next.getMinBookings() > 0) {
                bookingsToNext = Math.max(0, next.getMinBookings() - s.bookingCount());
                bookingPct = (int) Math.min(100, s.bookingCount() * 100 / next.getMinBookings());
            }
            progress = Math.max(spendPct, bookingPct);
        }
        return MyMembershipResponse.builder()
                .currentTier(s.currentTier())
                .nextTier(next)
                .totalSpent(s.totalSpent())
                .bookingCount(s.bookingCount())
                .spendToNextTier(spendToNext)
                .bookingsToNextTier(bookingsToNext)
                .progressPercent(progress)
                .build();
    }

    public List<TierResponse> listActiveTiers() {
        return tierCatalog.activeTiers();
    }

    private boolean applyStanding(User user, Standing standing) {
        String code = standing.tierCode();
        if (code.equals(user.getMembershipTier())) return false;
        user.setMembershipTier(code);
        userRepository.save(user);
        return true;
    }

    private void applyRequest(MembershipTier tier, TierRequest req) {
        tier.setName(req.getName().trim());
        tier.setDescription(blankToNull(req.getDescription()));
        tier.setMinTotalSpent(req.getMinTotalSpent());
        tier.setMinBookings(req.getMinBookings());
        tier.setDiscountPercent(req.getDiscountPercent());
        tier.setBenefits(blankToNull(req.getBenefits()));
        if (req.getColor() != null && !req.getColor().isBlank()) tier.setColor(req.getColor());
        tier.setSortOrder(req.getSortOrder());
    }

    private MembershipTier findTier(UUID id) {
        return membershipTierRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy hạng thành viên."));
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
