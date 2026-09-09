package com.cospace.app.service;

import com.cospace.app.entity.Booking;
import com.cospace.app.entity.BookingServiceItem;
import com.cospace.app.entity.BookingStatus;
import com.cospace.app.entity.ExtraServiceEntity;
import com.cospace.app.repository.BookingRepository;
import com.cospace.app.repository.BookingServiceItemRepository;
import com.cospace.app.repository.ExtraServiceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class BookingAddonService {

    private final BookingRepository bookingRepository;
    private final ExtraServiceRepository extraServiceRepository;
    private final BookingServiceItemRepository bookingServiceItemRepository;

    /**
     * Rule #30 (Running Tab) & Rule #44 (Pessimistic Lock Ordering)
     */
    @Transactional
    public BookingServiceItem addServiceToBooking(UUID staffId, UUID bookingId, UUID serviceId, int quantity) {
        if (quantity <= 0) {
            throw new IllegalArgumentException("Số lượng dịch vụ phải lớn hơn 0.");
        }

        // Rule #44: Lock booking first
        Booking booking = bookingRepository.findByIdWithLock(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đặt chỗ."));

        // Only allowed if booking is active
        if (booking.getStatus() != BookingStatus.CHECKED_IN && booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new IllegalStateException("Chỉ có thể gọi thêm dịch vụ khi vé đang sử dụng hoặc đã xác nhận.");
        }

        ExtraServiceEntity service = extraServiceRepository.findById(serviceId)
                .orElseThrow(() -> new IllegalArgumentException("Dịch vụ không tồn tại."));

        if (!service.isActive()) {
            throw new IllegalStateException("Dịch vụ này hiện đang tạm ngưng phục vụ.");
        }

        long lineTotal = service.getPrice() * (long) quantity;

        BookingServiceItem item = BookingServiceItem.builder()
                .bookingId(bookingId)
                .serviceId(serviceId)
                .quantity(quantity)
                .unitPrice(service.getPrice())
                .subtotal(lineTotal)
                .createdBy(staffId)
                .build();

        item = bookingServiceItemRepository.save(item);

        // Update booking running tab
        booking.setAddonAmount(booking.getAddonAmount() + lineTotal);
        booking.setTotalAmount(booking.getTotalAmount() + lineTotal);
        bookingRepository.save(booking);

        log.info("Added {}x {} to booking {}. New total: {}", quantity, service.getName(), booking.getId(), booking.getTotalAmount());
        return item;
    }

    @Transactional(readOnly = true)
    public List<BookingServiceItem> getBookingServices(UUID bookingId) {
        return bookingServiceItemRepository.findByBookingIdOrderByCreatedAtAsc(bookingId);
    }
}
