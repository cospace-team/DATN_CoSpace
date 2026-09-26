package com.cospace.app.service;

import com.cospace.app.dto.api.MembershipDto.TierResponse;
import com.cospace.app.dto.api.PromotionDto.PromotionRequest;
import com.cospace.app.dto.api.PromotionDto.PromotionResponse;
import com.cospace.app.entity.BookingStatus;
import com.cospace.app.entity.BranchEntity;
import com.cospace.app.entity.Promotion;
import com.cospace.app.entity.WorkspaceType;
import com.cospace.app.repository.BookingRepository;
import com.cospace.app.repository.BranchEntityRepository;
import com.cospace.app.repository.MembershipTierRepository;
import com.cospace.app.repository.PromotionRepository;
import com.cospace.app.repository.UserRepository;
import com.cospace.app.repository.WorkspaceTypeRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Promotions (khuyến mãi): admin-managed discount codes a customer applies at checkout. Usage is
 * counted from the bookings that carry the promotion, so an unpaid booking that expires or a
 * cancelled one gives its redemption back automatically — no separate counter to drift.
 */
@Service
@RequiredArgsConstructor
public class PromotionService {

    private final PromotionRepository promotionRepository;
    private final BookingRepository bookingRepository;
    private final BranchEntityRepository branchRepository;
    private final WorkspaceTypeRepository workspaceTypeRepository;
    private final MembershipTierRepository membershipTierRepository;
    private final MembershipTierCatalog tierCatalog;
    private final EntityManager entityManager;
    private final UserRepository userRepository;

    /** A promotion that passed every eligibility check, with the discount it yields. */
    public record AppliedPromotion(Promotion promotion, long discountAmount) {
    }

    /* ─────────────── Admin CRUD ─────────────── */

    @Transactional(readOnly = true)
    public List<PromotionResponse> listAll() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        List<Promotion> promotions = promotionRepository.findAllByOrderByCreatedAtDesc();
        Map<UUID, String> owners = ownerNames(promotions);
        return promotions.stream()
                .map(p -> toResponse(p, bookingRepository.countPromotionUsage(p.getId()), now, owners))
                .toList();
    }

    @Transactional
    public PromotionResponse create(PromotionRequest req, UUID actorId) {
        String code = normalizeCode(req.getCode());
        if (promotionRepository.existsByCodeIgnoreCase(code)) {
            throw new IllegalStateException("Mã khuyến mãi \"" + code + "\" đã tồn tại.");
        }
        Promotion promotion = Promotion.builder().code(code).createdBy(actorId).build();
        applyRequest(promotion, req);
        promotion = promotionRepository.save(promotion);
        return toResponse(promotion, 0L, OffsetDateTime.now(ZoneOffset.UTC));
    }

    @Transactional
    public PromotionResponse update(UUID id, PromotionRequest req) {
        Promotion promotion = findPromotion(id);
        String code = normalizeCode(req.getCode());
        if (promotionRepository.existsByCodeIgnoreCaseAndIdNot(code, id)) {
            throw new IllegalStateException("Mã khuyến mãi \"" + code + "\" đã tồn tại.");
        }
        promotion.setCode(code);
        applyRequest(promotion, req);
        promotion = promotionRepository.save(promotion);
        return toResponse(promotion, bookingRepository.countPromotionUsage(id),
                OffsetDateTime.now(ZoneOffset.UTC));
    }

    /**
     * Deletes a promotion no booking ever used; one that was used is only deactivated so the
     * bookings keep pointing at it. Returns true if it was actually deleted.
     */
    @Transactional
    public boolean delete(UUID id) {
        Promotion promotion = findPromotion(id);
        if (bookingRepository.countByPromotionId(id) > 0) {
            promotion.setActive(false);
            promotionRepository.save(promotion);
            return false;
        }
        promotionRepository.delete(promotion);
        return true;
    }

    /* ─────────────── Customer ─────────────── */

    /**
     * Promotions the customer could apply right now for this branch / workspace type: the public
     * ones, plus the customer's own personal vouchers.
     */
    @Transactional(readOnly = true)
    public List<PromotionResponse> listAvailable(UUID userId, String userTierCode, UUID branchId, UUID workspaceTypeId) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        List<Promotion> candidates = new java.util.ArrayList<>(promotionRepository.findByOwnerUserIdOrderByCreatedAtDesc(userId).stream()
                .filter(p -> p.isActive() && !now.isBefore(p.getStartAt()) && now.isBefore(p.getEndAt()))
                .toList());
        promotionRepository.findPublicRunning(now).stream()
                .filter(p -> p.getOwnerUserId() == null)
                .forEach(candidates::add);
        return candidates.stream()
                .filter(p -> p.getBranchId() == null || p.getBranchId().equals(branchId))
                .filter(p -> p.getWorkspaceTypeId() == null || workspaceTypeId == null || p.getWorkspaceTypeId().equals(workspaceTypeId))
                .filter(p -> tierAllows(p, userTierCode))
                .filter(p -> p.getUsageLimit() == null
                        || bookingRepository.countPromotionUsage(p.getId()) < p.getUsageLimit())
                .filter(p -> p.getPerUserLimit() == null
                        || bookingRepository.countPromotionUsageByUser(p.getId(), userId) < p.getPerUserLimit())
                .map(p -> {
                    PromotionResponse r = toResponse(p, null, now);
                    r.setUsageLimit(null); // not the customer's business
                    return r;
                })
                .toList();
    }

    /**
     * Validates {@code code} against the booking and computes its discount. With {@code lock}, the
     * promotion is advisory-locked for the rest of the transaction so concurrent bookings cannot
     * both slip past a usage limit — use it when the booking is actually being created.
     *
     * @param orderAmount  pre-discount subtotal, checked against the minimum order amount
     * @param discountBase amount the discount is taken from (subtotal after the tier discount)
     */
    @Transactional
    public AppliedPromotion apply(String code, UUID userId, String userTierCode, UUID branchId, UUID workspaceTypeId,
                                  long orderAmount, long discountBase, boolean lock) {
        Promotion p = promotionRepository.findByCodeIgnoreCase(normalizeCode(code))
                .orElseThrow(() -> new IllegalArgumentException("Mã khuyến mãi không tồn tại."));

        if (lock) {
            entityManager.createNativeQuery("SELECT pg_advisory_xact_lock(hashtext(:key))")
                    .setParameter("key", "promotion:" + p.getId())
                    .getSingleResult();
        }

        // Someone else's personal voucher is treated exactly like an unknown code.
        if (p.getOwnerUserId() != null && !p.getOwnerUserId().equals(userId)) {
            throw new IllegalArgumentException("Mã khuyến mãi không tồn tại.");
        }

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        if (!p.isActive()) {
            throw new IllegalArgumentException("Mã khuyến mãi đã ngưng áp dụng.");
        }
        if (now.isBefore(p.getStartAt())) {
            throw new IllegalArgumentException("Mã khuyến mãi chưa đến thời gian áp dụng.");
        }
        if (!now.isBefore(p.getEndAt())) {
            throw new IllegalArgumentException("Mã khuyến mãi đã hết hạn.");
        }
        if (p.getBranchId() != null && !p.getBranchId().equals(branchId)) {
            throw new IllegalArgumentException("Mã khuyến mãi không áp dụng cho chi nhánh này.");
        }
        if (p.getWorkspaceTypeId() != null && !p.getWorkspaceTypeId().equals(workspaceTypeId)) {
            throw new IllegalArgumentException("Mã khuyến mãi không áp dụng cho loại không gian này.");
        }
        if (orderAmount < p.getMinOrderAmount()) {
            throw new IllegalArgumentException("Đơn hàng chưa đạt giá trị tối thiểu "
                    + String.format(Locale.US, "%,d", p.getMinOrderAmount()).replace(',', '.') + "đ để dùng mã này.");
        }
        if (!tierAllows(p, userTierCode)) {
            String tierName = tierCatalog.findActive(p.getMinTierCode()).map(TierResponse::getName).orElse(p.getMinTierCode());
            throw new IllegalArgumentException("Mã khuyến mãi chỉ dành cho thành viên hạng " + tierName + " trở lên.");
        }
        if (p.getUsageLimit() != null
                && bookingRepository.countPromotionUsage(p.getId()) >= p.getUsageLimit()) {
            throw new IllegalArgumentException("Mã khuyến mãi đã hết lượt sử dụng.");
        }
        if (p.getPerUserLimit() != null
                && bookingRepository.countPromotionUsageByUser(p.getId(), userId) >= p.getPerUserLimit()) {
            throw new IllegalArgumentException("Bạn đã dùng hết số lượt cho mã khuyến mãi này.");
        }

        return new AppliedPromotion(p, computeDiscount(p, discountBase));
    }

    /* ─────────────── Personal vouchers ─────────────── */

    /**
     * Issues a single-use voucher worth {@code amount} to one customer, e.g. when a refund is paid
     * as a voucher instead of money. It works on any branch and workspace type, is not listed
     * publicly and nobody else can redeem it.
     */
    @Transactional
    public Promotion issueVoucher(UUID ownerId, long amount, String name, String description, int validDays, UUID actorId) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Giá trị voucher phải lớn hơn 0.");
        }
        if (validDays < 1 || validDays > 365) {
            throw new IllegalArgumentException("Hạn dùng voucher phải từ 1 đến 365 ngày.");
        }
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        String code;
        do {
            code = "HT" + randomCode(8);
        } while (promotionRepository.existsByCodeIgnoreCase(code));
        return promotionRepository.save(Promotion.builder()
                .code(code)
                .name(name)
                .description(description)
                .discountType(Promotion.TYPE_FIXED)
                .discountValue(amount)
                .minOrderAmount(0)
                .startAt(now)
                .endAt(now.plusDays(validDays))
                .usageLimit(1)
                .perUserLimit(1)
                .isPublic(false)
                .isActive(true)
                .ownerUserId(ownerId)
                .createdBy(actorId)
                .build());
    }

    /** Every personal voucher the customer owns, newest first, with whether it can still be used. */
    @Transactional(readOnly = true)
    public List<PromotionResponse> listMyVouchers(UUID userId) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        List<Promotion> vouchers = promotionRepository.findByOwnerUserIdOrderByCreatedAtDesc(userId);
        Map<UUID, String> owners = ownerNames(vouchers);
        return vouchers.stream()
                .map(p -> toResponse(p, bookingRepository.countPromotionUsage(p.getId()), now, owners))
                .toList();
    }

    private static String randomCode(int length) {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        java.security.SecureRandom random = new java.security.SecureRandom();
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) sb.append(chars.charAt(random.nextInt(chars.length())));
        return sb.toString();
    }

    static long computeDiscount(Promotion p, long base) {
        if (base <= 0) return 0;
        long discount;
        if (Promotion.TYPE_PERCENT.equals(p.getDiscountType())) {
            discount = base * p.getDiscountValue() / 100;
            if (p.getMaxDiscountAmount() != null) discount = Math.min(discount, p.getMaxDiscountAmount());
        } else {
            discount = p.getDiscountValue();
        }
        return Math.max(0, Math.min(discount, base));
    }

    /* ─────────────── Helpers ─────────────── */

    /** True if the promotion has no tier requirement or the customer's tier ranks at or above it. */
    private boolean tierAllows(Promotion p, String userTierCode) {
        if (p.getMinTierCode() == null) return true;
        List<TierResponse> tiers = tierCatalog.activeTiers();
        TierResponse required = tiers.stream().filter(t -> t.getCode().equals(p.getMinTierCode())).findFirst().orElse(null);
        // A deactivated/removed required tier can't be reached by anyone.
        if (required == null) return false;
        TierResponse user = tiers.stream().filter(t -> t.getCode().equals(userTierCode)).findFirst().orElse(null);
        return user != null && user.getSortOrder() >= required.getSortOrder();
    }

    private void applyRequest(Promotion p, PromotionRequest req) {
        String type = req.getDiscountType() == null ? "" : req.getDiscountType().trim().toLowerCase(Locale.ROOT);
        if (!Promotion.TYPE_PERCENT.equals(type) && !Promotion.TYPE_FIXED.equals(type)) {
            throw new IllegalArgumentException("Loại giảm giá phải là 'percent' hoặc 'fixed'.");
        }
        if (Promotion.TYPE_PERCENT.equals(type) && req.getDiscountValue() > 100) {
            throw new IllegalArgumentException("Giảm theo phần trăm không được vượt quá 100%.");
        }
        if (!req.getEndAt().isAfter(req.getStartAt())) {
            throw new IllegalArgumentException("Thời gian kết thúc phải sau thời gian bắt đầu.");
        }
        if (req.getMaxDiscountAmount() != null && req.getMaxDiscountAmount() <= 0) {
            throw new IllegalArgumentException("Mức giảm tối đa phải lớn hơn 0.");
        }
        if (req.getUsageLimit() != null && req.getUsageLimit() <= 0) {
            throw new IllegalArgumentException("Tổng lượt sử dụng phải lớn hơn 0.");
        }
        if (req.getPerUserLimit() != null && req.getPerUserLimit() <= 0) {
            throw new IllegalArgumentException("Lượt sử dụng mỗi khách phải lớn hơn 0.");
        }
        if (req.getBranchId() != null && !branchRepository.existsById(req.getBranchId())) {
            throw new IllegalArgumentException("Chi nhánh không hợp lệ.");
        }
        if (req.getWorkspaceTypeId() != null && !workspaceTypeRepository.existsById(req.getWorkspaceTypeId())) {
            throw new IllegalArgumentException("Loại không gian không hợp lệ.");
        }
        String minTier = req.getMinTierCode() == null || req.getMinTierCode().isBlank() ? null : req.getMinTierCode().trim();
        if (minTier != null && !membershipTierRepository.existsByCode(minTier)) {
            throw new IllegalArgumentException("Hạng thành viên không hợp lệ.");
        }

        p.setName(req.getName().trim());
        p.setDescription(req.getDescription() == null || req.getDescription().isBlank() ? null : req.getDescription().trim());
        p.setDiscountType(type);
        p.setDiscountValue(req.getDiscountValue());
        // A cap only means something for percent discounts.
        p.setMaxDiscountAmount(Promotion.TYPE_PERCENT.equals(type) ? req.getMaxDiscountAmount() : null);
        p.setMinOrderAmount(req.getMinOrderAmount());
        p.setStartAt(req.getStartAt());
        p.setEndAt(req.getEndAt());
        p.setUsageLimit(req.getUsageLimit());
        p.setPerUserLimit(req.getPerUserLimit());
        p.setBranchId(req.getBranchId());
        p.setWorkspaceTypeId(req.getWorkspaceTypeId());
        p.setMinTierCode(minTier);
        if (req.getIsPublic() != null) p.setPublic(req.getIsPublic());
        if (req.getIsActive() != null) p.setActive(req.getIsActive());
    }

    /** Names of the owners of personal vouchers among {@code promotions}, loaded in one query. */
    private Map<UUID, String> ownerNames(List<Promotion> promotions) {
        List<UUID> ids = promotions.stream().map(Promotion::getOwnerUserId).filter(Objects::nonNull).distinct().toList();
        if (ids.isEmpty()) return Map.of();
        Map<UUID, String> names = new java.util.HashMap<>();
        userRepository.findAllById(ids).forEach(u -> names.put(u.getId(), u.getFullName()));
        return names;
    }

    private PromotionResponse toResponse(Promotion p, Long usedCount, OffsetDateTime now) {
        return toResponse(p, usedCount, now, p.getOwnerUserId() == null ? Map.of() : ownerNames(List.of(p)));
    }

    private PromotionResponse toResponse(Promotion p, Long usedCount, OffsetDateTime now, Map<UUID, String> ownerNames) {
        String state;
        if (!p.isActive()) state = "inactive";
        else if (now.isBefore(p.getStartAt())) state = "scheduled";
        else if (!now.isBefore(p.getEndAt())) state = "ended";
        else if (usedCount != null && p.getUsageLimit() != null && usedCount >= p.getUsageLimit()) state = "exhausted";
        else state = "running";

        return PromotionResponse.builder()
                .id(p.getId())
                .code(p.getCode())
                .name(p.getName())
                .description(p.getDescription())
                .discountType(p.getDiscountType())
                .discountValue(p.getDiscountValue())
                .maxDiscountAmount(p.getMaxDiscountAmount())
                .minOrderAmount(p.getMinOrderAmount())
                .startAt(p.getStartAt())
                .endAt(p.getEndAt())
                .usageLimit(p.getUsageLimit())
                .perUserLimit(p.getPerUserLimit())
                .branchId(p.getBranchId())
                .branchName(p.getBranchId() == null ? null
                        : branchRepository.findById(p.getBranchId()).map(BranchEntity::getName).orElse(null))
                .workspaceTypeId(p.getWorkspaceTypeId())
                .workspaceTypeName(p.getWorkspaceTypeId() == null ? null
                        : workspaceTypeRepository.findById(p.getWorkspaceTypeId()).map(WorkspaceType::getName).orElse(null))
                .minTierCode(p.getMinTierCode())
                .minTierName(p.getMinTierCode() == null ? null
                        : membershipTierRepository.findByCode(p.getMinTierCode()).map(t -> t.getName()).orElse(p.getMinTierCode()))
                .isPublic(p.isPublic())
                .isActive(p.isActive())
                .usedCount(usedCount)
                .state(state)
                .ownerUserId(p.getOwnerUserId())
                .ownerName(p.getOwnerUserId() == null ? null : ownerNames.get(p.getOwnerUserId()))
                .createdAt(p.getCreatedAt())
                .build();
    }

    private Promotion findPromotion(UUID id) {
        return promotionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chương trình khuyến mãi."));
    }

    private static String normalizeCode(String code) {
        return Objects.requireNonNullElse(code, "").trim().toUpperCase(Locale.ROOT);
    }
}
