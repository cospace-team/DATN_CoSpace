package com.cospace.app.controller;

import com.cospace.app.entity.CancellationPolicy;
import com.cospace.app.repository.CancellationPolicyRepository;
import com.cospace.app.security.BranchAccessGuard;
import com.cospace.app.service.AuditLogService;
import com.cospace.app.service.CancellationService;
import com.cospace.app.service.RefundService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * CAN-03: {@code CancellationPolicy.id} has no {@code @GeneratedValue}, so a save() of an entity
 * bound straight from the request body merges onto whatever row already has that id. Without
 * clearing it, POST (meant to create) could silently overwrite an arbitrary existing policy —
 * including the global defaults every branch falls back to — just by naming its id in the body.
 */
@ExtendWith(MockitoExtension.class)
class CancellationPolicyControllerTest {

    @Mock private CancellationPolicyRepository policyRepository;
    @Mock private CancellationService cancellationService;
    @Mock private RefundService refundService;
    @Mock private BranchAccessGuard branchAccessGuard;
    @Mock private AuditLogService auditLogService;
    @Mock private HttpServletRequest httpServletRequest;
    @Mock private Jwt jwt;

    @InjectMocks
    private CancellationPolicyController controller;

    private CancellationPolicy policyWithId(UUID id) {
        CancellationPolicy p = new CancellationPolicy();
        p.setId(id); // what a client would send to target an existing (global or other-branch) row
        p.setName("Hostile override");
        p.setRuleType("GRACE_HOURS");
        p.setMinValue(0);
        p.setMaxValue(999999);
        p.setRefundPercent(BigDecimal.valueOf(100));
        p.setPriority(1);
        p.setActive(true);
        return p;
    }

    @Test
    void createIgnoresAClientSuppliedIdSoItCanOnlyEverInsertANewRow() {
        UUID existingGlobalPolicyId = UUID.randomUUID();
        UUID ownBranchId = UUID.randomUUID();
        when(branchAccessGuard.isSuperAdmin(jwt)).thenReturn(false);
        when(branchAccessGuard.requireOwnBranch(jwt)).thenReturn(ownBranchId);
        when(jwt.getSubject()).thenReturn(UUID.randomUUID().toString());
        when(policyRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        controller.createPolicy(jwt, policyWithId(existingGlobalPolicyId));

        ArgumentCaptor<CancellationPolicy> saved = ArgumentCaptor.forClass(CancellationPolicy.class);
        org.mockito.Mockito.verify(policyRepository).save(saved.capture());
        assertThat(saved.getValue().getId()).isNotEqualTo(existingGlobalPolicyId);
        assertThat(saved.getValue().getBranchId()).isEqualTo(ownBranchId);
    }

    @Test
    void superAdminCreatingAlsoNeverReusesAClientSuppliedId() {
        UUID existingPolicyId = UUID.randomUUID();
        when(branchAccessGuard.isSuperAdmin(jwt)).thenReturn(true);
        when(jwt.getSubject()).thenReturn(UUID.randomUUID().toString());
        when(policyRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        controller.createPolicy(jwt, policyWithId(existingPolicyId));

        ArgumentCaptor<CancellationPolicy> saved = ArgumentCaptor.forClass(CancellationPolicy.class);
        org.mockito.Mockito.verify(policyRepository).save(saved.capture());
        assertThat(saved.getValue().getId()).isNotEqualTo(existingPolicyId);
    }
}
