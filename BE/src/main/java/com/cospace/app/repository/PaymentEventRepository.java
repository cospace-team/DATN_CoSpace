package com.cospace.app.repository;

import com.cospace.app.entity.PaymentEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;
import java.util.List;

@Repository
public interface PaymentEventRepository extends JpaRepository<PaymentEvent, UUID> {

    Optional<PaymentEvent> findByIdempotencyKey(String idempotencyKey);

    List<PaymentEvent> findByPaymentIdOrderByCreatedAtDesc(UUID paymentId);

    List<PaymentEvent> findByProcessedFalse();
}
