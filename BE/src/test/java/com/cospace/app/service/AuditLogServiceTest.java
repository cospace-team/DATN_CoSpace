package com.cospace.app.service;

import com.cospace.app.entity.AuditLogEntity;
import com.cospace.app.repository.AuditLogRepository;
import com.cospace.app.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AuditLogServiceTest {

    @Mock private AuditLogRepository auditLogRepository;
    @Mock private UserRepository userRepository;
    @Mock private ObjectProvider<AuditLogService> selfProvider;

    @AfterEach
    void clearSynchronization() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    private AuditLogService service() {
        return new AuditLogService(auditLogRepository, userRepository, selfProvider);
    }

    @Test
    void outsideATransactionTheEntryIsWrittenAtOnce() {
        UUID actor = UUID.randomUUID();
        service().record(actor, "CHECKIN", "bookings", UUID.randomUUID(), AuditLogService.values("bookingCode", "WH-1"));

        ArgumentCaptor<AuditLogEntity> saved = ArgumentCaptor.forClass(AuditLogEntity.class);
        verify(auditLogRepository).save(saved.capture());
        assertThat(saved.getValue().getUserId()).isEqualTo(actor);
        assertThat(saved.getValue().getAction()).isEqualTo("CHECKIN");
    }

    @Test
    void insideATransactionNothingIsWrittenUntilItCommits() {
        TransactionSynchronizationManager.initSynchronization();

        service().record(UUID.randomUUID(), "CREATE_BOOKING", "bookings", UUID.randomUUID(), Map.of());
        verify(auditLogRepository, never()).save(any());

        TransactionSynchronizationManager.getSynchronizations().forEach(TransactionSynchronization::afterCommit);
        verify(auditLogRepository).save(any());
    }

    @Test
    void valuesSkipNullsAndWriteIdsAsText() {
        UUID id = UUID.randomUUID();
        Map<String, Object> values = AuditLogService.values("a", null, "id", id, "n", 3);

        assertThat(values).containsOnlyKeys("id", "n").containsEntry("id", id.toString()).containsEntry("n", 3);
    }
}
