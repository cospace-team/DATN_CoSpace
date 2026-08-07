package com.example.momosandbox.repository;

import com.example.momosandbox.entity.Payment;
import com.example.momosandbox.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    Optional<Payment> findByOrderId(String orderId);

    List<Payment> findByUserIdOrderByCreatedAtDesc(UUID userId);

    List<Payment> findByBookingIdOrderByCreatedAtDesc(UUID bookingId);

    Optional<Payment> findTopByBookingIdOrderByCreatedAtDesc(UUID bookingId);
    
    Optional<Payment> findTopByBookingIdAndStatusInOrderByCreatedAtDesc(UUID bookingId, List<PaymentStatus> statuses);
}
