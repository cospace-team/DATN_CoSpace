package com.cospace.app.service;

import com.cospace.app.entity.Promotion;
import com.cospace.app.repository.BookingRepository;
import com.cospace.app.repository.BranchEntityRepository;
import com.cospace.app.repository.MembershipTierRepository;
import com.cospace.app.repository.PromotionRepository;
import com.cospace.app.repository.UserRepository;
import com.cospace.app.repository.WorkspaceTypeRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PromotionServiceTest {

    @Mock
    private PromotionRepository promotionRepository;
    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private BranchEntityRepository branchRepository;
    @Mock
    private WorkspaceTypeRepository workspaceTypeRepository;
    @Mock
    private MembershipTierRepository membershipTierRepository;
    @Mock
    private MembershipTierCatalog tierCatalog;
    @Mock
    private EntityManager entityManager;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private PromotionService promotionService;

    private final OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

    private Promotion voucher(UUID owner) {
        Promotion p = Promotion.builder().id(UUID.randomUUID()).code("HTTESTCODE").name("Voucher")
                .discountType(Promotion.TYPE_FIXED).discountValue(80_000L).minOrderAmount(0)
                .startAt(now.minusDays(1)).endAt(now.plusDays(89)).usageLimit(1).perUserLimit(1)
                .isPublic(false).isActive(true).ownerUserId(owner).build();
        when(promotionRepository.findByCodeIgnoreCase("HTTESTCODE")).thenReturn(Optional.of(p));
        return p;
    }

    @Test
    void someoneElsesVoucherLooksLikeAnUnknownCode() {
        voucher(UUID.randomUUID());

        assertThatThrownBy(() -> promotionService.apply("HTTESTCODE", UUID.randomUUID(), null, UUID.randomUUID(), null,
                200_000L, 200_000L, false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("không tồn tại");
    }

    @Test
    void ownerCanRedeemTheirVoucherUpToTheRentalAmount() {
        UUID owner = UUID.randomUUID();
        voucher(owner);

        PromotionService.AppliedPromotion applied = promotionService.apply("HTTESTCODE", owner, null, UUID.randomUUID(), null,
                50_000L, 50_000L, false);

        assertThat(applied.discountAmount()).isEqualTo(50_000L);
    }

    @Test
    void issuedVoucherIsPrivateSingleUseAndOwned() {
        UUID owner = UUID.randomUUID();
        when(promotionRepository.save(any(Promotion.class))).thenAnswer(inv -> inv.getArgument(0));

        promotionService.issueVoucher(owner, 120_000L, "Voucher hoàn tiền", null, 90, null);

        ArgumentCaptor<Promotion> saved = ArgumentCaptor.forClass(Promotion.class);
        verify(promotionRepository).save(saved.capture());
        Promotion p = saved.getValue();
        assertThat(p.getCode()).startsWith("HT").hasSize(10);
        assertThat(p.getOwnerUserId()).isEqualTo(owner);
        assertThat(p.isPublic()).isFalse();
        assertThat(p.getUsageLimit()).isEqualTo(1);
        assertThat(p.getDiscountType()).isEqualTo(Promotion.TYPE_FIXED);
        assertThat(p.getDiscountValue()).isEqualTo(120_000L);
    }
}
