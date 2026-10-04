package com.cospace.app.exception;

import com.cospace.app.dto.api.MaintenanceImpactDto;

import java.util.List;

/** A maintenance window would cancel or cut short bookings and the request has not confirmed that yet. */
public class MaintenanceImpactException extends RuntimeException {

    private final transient List<MaintenanceImpactDto> bookings;

    public MaintenanceImpactException(List<MaintenanceImpactDto> bookings) {
        super("Khóa vị trí này sẽ ảnh hưởng tới " + bookings.size() + " đơn của khách. Vui lòng xem lại và xác nhận.");
        this.bookings = bookings;
    }

    public List<MaintenanceImpactDto> getBookings() {
        return bookings;
    }
}
