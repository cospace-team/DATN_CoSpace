package com.cospace.app.repository;

import com.cospace.app.entity.Payment;
import com.cospace.app.entity.PaymentStatus;
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

    List<Payment> findByBookingIdAndStatusIn(UUID bookingId, List<PaymentStatus> statuses);

    /** True if the booking already has another payment in this status (e.g. a second PAID one). */
    boolean existsByBookingIdAndStatusAndIdNot(UUID bookingId, PaymentStatus status, UUID excludedPaymentId);

    boolean existsByBookingIdAndStatusAndPurpose(UUID bookingId, PaymentStatus status, String purpose);

    /** Same check restricted to one purpose, so an add-on settlement never counts as a booking payment. */
    boolean existsByBookingIdAndStatusAndPurposeAndIdNot(UUID bookingId, PaymentStatus status, String purpose, UUID excludedPaymentId);
}
