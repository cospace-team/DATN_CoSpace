package com.cospace.app.service;

import com.cospace.app.config.CacheConfig;
import com.cospace.app.entity.ExtraServiceEntity;
import com.cospace.app.repository.BookingServiceItemRepository;
import com.cospace.app.repository.ExtraServiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ExtraServiceService {

    private final ExtraServiceRepository extraServiceRepository;
    private final BookingServiceItemRepository bookingServiceItemRepository;

    @Transactional(readOnly = true)
    @Cacheable(CacheConfig.EXTRA_SERVICES)
    public List<ExtraServiceEntity> getAvailableServices(UUID branchId) {
        List<ExtraServiceEntity> result = new ArrayList<>();
        if (branchId != null) {
            result.addAll(extraServiceRepository.findByBranchIdAndIsActiveTrue(branchId));
        }
        result.addAll(extraServiceRepository.findByBranchIdIsNullAndIsActiveTrue());
        return result;
    }

    @Transactional
    @CacheEvict(value = CacheConfig.EXTRA_SERVICES, allEntries = true)
    public ExtraServiceEntity createService(ExtraServiceEntity service) {
        return extraServiceRepository.save(service);
    }

    /**
     * Applies a partial update: only fields actually present in {@code updates} are changed.
     * The branch-admin UI's "bật/tắt" toggle sends only {@code {isActive}} — binding straight to
     * the entity (as before) would leave every other field at its JSON default (null/0/false),
     * wiping the service's name, unit and price on a simple on/off toggle.
     */
    @Transactional
    @CacheEvict(value = CacheConfig.EXTRA_SERVICES, allEntries = true)
    public ExtraServiceEntity updateService(UUID id, Map<String, Object> updates) {
        ExtraServiceEntity existing = extraServiceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Dịch vụ không tồn tại"));
        if (updates.containsKey("code") && updates.get("code") != null) {
            existing.setCode(updates.get("code").toString());
        }
        if (updates.containsKey("name") && updates.get("name") != null) {
            existing.setName(updates.get("name").toString());
        }
        if (updates.containsKey("serviceType") && updates.get("serviceType") != null) {
            existing.setServiceType(updates.get("serviceType").toString());
        }
        if (updates.containsKey("description")) {
            Object description = updates.get("description");
            existing.setDescription(description != null ? description.toString() : null);
        }
        if (updates.containsKey("price") && updates.get("price") != null) {
            existing.setPrice(Long.parseLong(updates.get("price").toString()));
        }
        if (updates.containsKey("unit") && updates.get("unit") != null) {
            existing.setUnit(updates.get("unit").toString());
        }
        if (updates.containsKey("isActive") && updates.get("isActive") != null) {
            existing.setActive(Boolean.parseBoolean(updates.get("isActive").toString()));
        }
        return extraServiceRepository.save(existing);
    }

    /**
     * Permanently removes a service — what the branch-admin UI's "Xóa vĩnh viễn" (permanently
     * delete) button promises, as distinct from the separate on/off toggle above. A service
     * already used on a booking can't be hard-deleted (booking_services has an ON DELETE
     * RESTRICT foreign key to it, and doing so would corrupt that booking's history), so that
     * case is rejected with a clear message instead of letting the FK violation surface as a 500.
     */
    @Transactional
    @CacheEvict(value = CacheConfig.EXTRA_SERVICES, allEntries = true)
    public void deleteService(UUID id) {
        ExtraServiceEntity existing = extraServiceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Dịch vụ không tồn tại"));
        if (bookingServiceItemRepository.existsByServiceId(id)) {
            throw new IllegalArgumentException(
                    "Không thể xóa vĩnh viễn dịch vụ đã được sử dụng trong đơn đặt chỗ. Hãy tắt dịch vụ thay vì xóa.");
        }
        extraServiceRepository.delete(existing);
    }
}
