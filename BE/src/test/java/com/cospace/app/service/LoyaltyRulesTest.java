package com.cospace.app.service;

import com.cospace.app.dto.api.MembershipDto.TierResponse;
import com.cospace.app.entity.BookingStatus;
import com.cospace.app.entity.Promotion;
import com.cospace.app.entity.User;
import com.cospace.app.repository.BookingRepository;
import com.cospace.app.repository.MembershipTierRepository;
import com.cospace.app.repository.PromotionRepository;
import com.cospace.app.repository.UserRepository;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class LoyaltyRulesTest {

    @Nested
    class PromotionDiscount {

        private Promotion percent(long value, Long cap) {
            return Promotion.builder().discountType(Promotion.TYPE_PERCENT).discountValue(value).maxDiscountAmount(cap).build();
        }

        @Test
        void percentDiscountIsTakenFromBase() {
            assertThat(PromotionService.computeDiscount(percent(10, null), 250_000)).isEqualTo(25_000);
        }

        @Test
        void percentDiscountIsCappedByMaxDiscount() {
            assertThat(PromotionService.computeDiscount(percent(50, 30_000L), 200_000)).isEqualTo(30_000);
        }

        @Test
        void fixedDiscountNeverExceedsBase() {
            Promotion fixed = Promotion.builder().discountType(Promotion.TYPE_FIXED).discountValue(80_000).build();
            assertThat(PromotionService.computeDiscount(fixed, 50_000)).isEqualTo(50_000);
            assertThat(PromotionService.computeDiscount(fixed, 100_000)).isEqualTo(80_000);
        }

        @Test
        void nothingToDiscountOnZeroBase() {
            assertThat(PromotionService.computeDiscount(percent(10, null), 0)).isZero();
        }
    }

    @Nested
    class TierThresholds {

        private TierResponse tier(long minSpent, int minBookings) {
            return TierResponse.builder().code("t").minTotalSpent(minSpent).minBookings(minBookings).build();
        }

        @Test
        void entryTierIsAlwaysReached() {
            assertThat(MembershipTierCatalog.isReachedBy(tier(0, 0), 0, 0)).isTrue();
        }

        @Test
        void eitherThresholdIsEnough() {
            TierResponse silver = tier(2_000_000, 3);
            assertThat(MembershipTierCatalog.isReachedBy(silver, 2_000_000, 0)).isTrue();
            assertThat(MembershipTierCatalog.isReachedBy(silver, 0, 3)).isTrue();
            assertThat(MembershipTierCatalog.isReachedBy(silver, 1_999_999, 2)).isFalse();
        }

        @Test
        void zeroThresholdIsIgnoredRatherThanAlwaysMet() {
            TierResponse spendOnly = tier(5_000_000, 0);
            assertThat(MembershipTierCatalog.isReachedBy(spendOnly, 100, 50)).isFalse();
        }
    }

    @Nested
    class MembershipEvaluation {

        private final BookingRepository bookingRepository = mock(BookingRepository.class);
        private final UserRepository userRepository = mock(UserRepository.class);
        private final MembershipTierCatalog catalog = mock(MembershipTierCatalog.class);
        private final com.cospace.app.repository.RefundRepository refundRepository =
                mock(com.cospace.app.repository.RefundRepository.class);
        private final MembershipService service = new MembershipService(
                mock(MembershipTierRepository.class), catalog, bookingRepository, userRepository,
                mock(PromotionRepository.class), refundRepository);
        private final UUID userId = UUID.randomUUID();

        private final List<TierResponse> tiers = List.of(
                TierResponse.builder().code("bronze").name("Bronze").sortOrder(0).build(),
                TierResponse.builder().code("silver").name("Silver").sortOrder(1).minTotalSpent(2_000_000).minBookings(3).discountPercent(3).build(),
                TierResponse.builder().code("gold").name("Gold").sortOrder(2).minTotalSpent(5_000_000).minBookings(10).discountPercent(5).build());

        private void givenSpend(long bookings, long spent) {
            when(catalog.activeTiers()).thenReturn(tiers);
            when(bookingRepository.sumSpendByUser(eq(userId), any(Collection.class)))
                    .thenReturn(List.<Object[]>of(new Object[]{bookings, spent}));
        }

        @Test
        void picksHighestReachedTierAndNextOne() {
            givenSpend(4, 1_000_000);

            MembershipService.Standing s = service.evaluate(userId);

            assertThat(s.tierCode()).isEqualTo("silver");
            assertThat(s.discountPercent()).isEqualTo(3);
            assertThat(s.nextTier().getCode()).isEqualTo("gold");
        }

        @Test
        void onlyBookingsActuallyUsedCountTowardSpend() {
            givenSpend(0, 0);

            service.evaluate(userId);

            verify(bookingRepository).sumSpendByUser(userId, MembershipService.PAID_STATUSES);
            // A booking that is merely paid for must not lift a tier: it can still be cancelled.
            assertThat(MembershipService.PAID_STATUSES)
                    .containsExactlyInAnyOrder(BookingStatus.COMPLETED, BookingStatus.NO_SHOW)
                    .doesNotContain(BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED,
                            BookingStatus.CANCELLED, BookingStatus.EXPIRED);
        }

        @Test
        void refundedMoneyDoesNotCountTowardSpend() {
            // Two bookings only, so the booking-count threshold for silver is not met either way
            // and the tier turns purely on how much was spent.
            givenSpend(2, 3_000_000);
            when(refundRepository.sumAmountByUserAndStatus(userId, com.cospace.app.entity.Refund.STATUS_PROCESSED))
                    .thenReturn(1_500_000L);

            MembershipService.Standing s = service.evaluate(userId);

            // 3,000,000 spent minus 1,500,000 given back leaves the customer below the silver
            // threshold of 2,000,000 that the gross figure would have cleared.
            assertThat(s.totalSpent()).isEqualTo(1_500_000L);
            assertThat(s.tierCode()).isEqualTo("bronze");
        }

        @Test
        void refreshPersistsChangedTier() {
            givenSpend(12, 0);
            User user = User.builder().id(userId).membershipTier("standard").build();
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));

            service.refreshTier(userId);

            assertThat(user.getMembershipTier()).isEqualTo("gold");
            verify(userRepository).save(user);
        }

        @Test
        void refreshSkipsSaveWhenTierUnchanged() {
            givenSpend(0, 0);
            User user = User.builder().id(userId).membershipTier("bronze").build();
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));

            service.refreshTier(userId);

            verify(userRepository, never()).save(any());
        }
    }
}
