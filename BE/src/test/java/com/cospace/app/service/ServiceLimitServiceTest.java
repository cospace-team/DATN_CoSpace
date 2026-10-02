package com.cospace.app.service;

import com.cospace.app.entity.BookingServiceItem;
import com.cospace.app.entity.BranchServiceLimit;
import com.cospace.app.entity.ExtraServiceEntity;
import com.cospace.app.repository.BookingServiceItemRepository;
import com.cospace.app.repository.BranchServiceLimitRepository;
import com.cospace.app.repository.ExtraServiceRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ServiceLimitServiceTest {

    @Mock
    private BranchServiceLimitRepository limitRepository;
    @Mock
    private ExtraServiceRepository extraServiceRepository;
    @Mock
    private BookingServiceItemRepository itemRepository;
    @Mock
    private ExtraServiceService extraServiceService;
    @Mock
    private EntityManager entityManager;
    @Mock
    private Query lockQuery;

    @InjectMocks
    private ServiceLimitService limitService;

    private final UUID branchId = UUID.randomUUID();
    private final OffsetDateTime start = OffsetDateTime.now(ZoneOffset.UTC).plusDays(1);
    private final OffsetDateTime end = start.plusHours(2);
    private final ExtraServiceEntity projector = ExtraServiceEntity.builder()
            .id(UUID.randomUUID()).code("PROJECTOR").name("Máy chiếu").price(150_000).build();
    private final ExtraServiceEntity coffee = ExtraServiceEntity.builder()
            .id(UUID.randomUUID()).code("COFFEE").name("Cà phê").price(45_000).build();

    @BeforeEach
    void setUp() {
        lenient().when(entityManager.createNativeQuery(anyString())).thenReturn(lockQuery);
        lenient().when(lockQuery.setParameter(anyString(), any())).thenReturn(lockQuery);
        lenient().when(extraServiceRepository.findById(projector.getId())).thenReturn(Optional.of(projector));
        lenient().when(extraServiceRepository.findById(coffee.getId())).thenReturn(Optional.of(coffee));
        lenient().when(extraServiceRepository.findByCode("PROJECTOR")).thenReturn(List.of(projector));
    }

    private void givenProjectorLimit(int max, long inUse) {
        when(limitRepository.findByBranchId(branchId)).thenReturn(List.of(
                BranchServiceLimit.builder().branchId(branchId).serviceCode("PROJECTOR").maxConcurrent(max).build()));
        lenient().when(itemRepository.sumQuantityInUse(anyCollection(), anyString(), eq(branchId), anyCollection(), eq(start), eq(end), any()))
                .thenReturn(inUse);
    }

    private BookingServiceItem line(ExtraServiceEntity s, int qty) {
        return BookingServiceItem.builder().serviceId(s.getId()).quantity(qty).build();
    }

    @Test
    void allowsWhileUnitsAreLeft() {
        givenProjectorLimit(2, 1);

        assertThatCode(() -> limitService.requireCapacity(branchId, start, end, List.of(line(projector, 1)), null, true))
                .doesNotThrowAnyException();
        verify(entityManager).createNativeQuery(anyString()); // the check holds a lock
    }

    @Test
    void refusesMoreThanTheBranchHas() {
        givenProjectorLimit(2, 1);

        assertThatThrownBy(() -> limitService.requireCapacity(branchId, start, end, List.of(line(projector, 2)), null, true))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("chỉ còn 1/2");
    }

    @Test
    void refusesWhenAllAreTaken() {
        givenProjectorLimit(2, 2);

        assertThatThrownBy(() -> limitService.requireCapacity(branchId, start, end, List.of(line(projector, 1)), null, false))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("đã được đặt hết");
        verify(entityManager, never()).createNativeQuery(anyString()); // a quote checks without locking
    }

    @Test
    void servicesWithoutLimitAreUnrestricted() {
        givenProjectorLimit(1, 1);

        assertThatCode(() -> limitService.requireCapacity(branchId, start, end, List.of(line(coffee, 20)), null, true))
                .doesNotThrowAnyException();
    }

    @Test
    void availabilityReportsWhatIsLeft() {
        givenProjectorLimit(3, 1);
        when(extraServiceService.getAvailableServices(branchId)).thenReturn(List.of(projector, coffee));

        var result = limitService.availability(branchId, start, end);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getServiceKey()).isEqualTo("PROJECTOR");
        assertThat(result.get(0).getRemaining()).isEqualTo(2);
    }

    @Test
    void limitCanOnlyBeSetForServicesOfferedAtTheBranch() {
        when(extraServiceService.getAvailableServices(branchId)).thenReturn(List.of(coffee));

        assertThatThrownBy(() -> limitService.setLimit(UUID.randomUUID(), branchId, "PROJECTOR", 2))
                .isInstanceOf(IllegalArgumentException.class);
        verify(limitRepository, never()).save(any());
    }

    @Test
    void negativeLimitIsRejectedAndNullRemovesIt() {
        when(extraServiceService.getAvailableServices(branchId)).thenReturn(List.of(projector));
        BranchServiceLimit existing = BranchServiceLimit.builder().branchId(branchId).serviceCode("PROJECTOR").maxConcurrent(2).build();
        when(limitRepository.findByBranchIdAndServiceCode(branchId, "PROJECTOR")).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> limitService.setLimit(UUID.randomUUID(), branchId, "PROJECTOR", -1))
                .isInstanceOf(IllegalArgumentException.class);
        limitService.setLimit(UUID.randomUUID(), branchId, "PROJECTOR", null);
        verify(limitRepository).delete(existing);
    }
}
