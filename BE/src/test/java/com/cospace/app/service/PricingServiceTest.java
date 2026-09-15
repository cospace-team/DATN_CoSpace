package com.cospace.app.service;

import com.cospace.app.entity.DurationUnit;
import com.cospace.app.entity.PricePolicy;
import com.cospace.app.repository.PricePolicyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PricingServiceTest {

    private static final UUID DESK_TYPE = UUID.fromString("a1000000-0000-0000-0000-000000000001");

    @Mock
    private PricePolicyRepository pricePolicyRepository;

    private PricingService pricingService;

    @BeforeEach
    void setUp() {
        pricingService = new PricingService(pricePolicyRepository);
    }

    @Test
    void branchPolicyFromDatabaseTakesPriority() {
        UUID branchId = UUID.randomUUID();
        when(pricePolicyRepository.findByBranchIdAndWorkspaceTypeIdAndDurationUnitAndIsActiveTrue(
                branchId, DESK_TYPE, DurationUnit.hour))
                .thenReturn(Optional.of(PricePolicy.builder().price(75_000L).build()));

        long price = pricingService.getUnitPriceVnd(branchId, DESK_TYPE.toString(), "hour");

        assertThat(price).isEqualTo(75_000L);
        verify(pricePolicyRepository, never())
                .findByBranchIdIsNullAndWorkspaceTypeIdAndDurationUnitAndIsActiveTrue(any(), any());
    }

    @Test
    void fallsBackToGlobalPolicyWhenBranchHasNone() {
        UUID branchId = UUID.randomUUID();
        when(pricePolicyRepository.findByBranchIdIsNullAndWorkspaceTypeIdAndDurationUnitAndIsActiveTrue(
                DESK_TYPE, DurationUnit.day))
                .thenReturn(Optional.of(PricePolicy.builder().price(300_000L).build()));

        long price = pricingService.getUnitPriceVnd(branchId, DESK_TYPE.toString(), "day");

        assertThat(price).isEqualTo(300_000L);
    }

    @Test
    void neverInventsAPriceWhenNoPolicyExists() {
        assertThatThrownBy(() -> pricingService.getUnitPriceVnd(UUID.randomUUID(), DESK_TYPE.toString(), "month"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Không tìm thấy giá");
    }

    @Test
    void databaseErrorsAreNotHiddenBehindDemoPrices() {
        when(pricePolicyRepository.findByBranchIdIsNullAndWorkspaceTypeIdAndDurationUnitAndIsActiveTrue(any(), any()))
                .thenThrow(new RuntimeException("db down"));

        assertThatThrownBy(() -> pricingService.getUnitPriceVnd(null, DESK_TYPE.toString(), "day"))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("db down");
    }

    @Test
    void unitIsCaseAndWhitespaceInsensitive() {
        when(pricePolicyRepository.findByBranchIdIsNullAndWorkspaceTypeIdAndDurationUnitAndIsActiveTrue(DESK_TYPE, DurationUnit.hour))
                .thenReturn(Optional.of(PricePolicy.builder().price(50_000L).build()));

        assertThat(pricingService.getUnitPriceVnd(null, DESK_TYPE.toString(), "  HOUR ")).isEqualTo(50_000L);
    }

    @Test
    void rejectsInvalidUnit() {
        assertThatThrownBy(() -> pricingService.getUnitPriceVnd(null, DESK_TYPE.toString(), "year"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsNullUnit() {
        assertThatThrownBy(() -> pricingService.getUnitPriceVnd(null, DESK_TYPE.toString(), null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsNonUuidWorkspaceType() {
        assertThatThrownBy(() -> pricingService.getUnitPriceVnd(null, "wst-desk", "hour"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
