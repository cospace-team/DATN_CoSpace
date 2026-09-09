package com.cospace.app.service;

import com.cospace.app.entity.ExtraServiceEntity;
import com.cospace.app.repository.ExtraServiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ExtraServiceService {

    private final ExtraServiceRepository extraServiceRepository;

    @Transactional(readOnly = true)
    public List<ExtraServiceEntity> getAvailableServices(UUID branchId) {
        List<ExtraServiceEntity> result = new ArrayList<>();
        if (branchId != null) {
            result.addAll(extraServiceRepository.findByBranchIdAndIsActiveTrue(branchId));
        }
        result.addAll(extraServiceRepository.findByBranchIdIsNullAndIsActiveTrue());
        return result;
    }

    @Transactional
    public ExtraServiceEntity createService(ExtraServiceEntity service) {
        return extraServiceRepository.save(service);
    }

    @Transactional
    public ExtraServiceEntity updateService(UUID id, ExtraServiceEntity updated) {
        ExtraServiceEntity existing = extraServiceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Dịch vụ không tồn tại"));
        existing.setName(updated.getName());
        existing.setDescription(updated.getDescription());
        existing.setPrice(updated.getPrice());
        existing.setUnit(updated.getUnit());
        existing.setActive(updated.isActive());
        return extraServiceRepository.save(existing);
    }

    @Transactional
    public void deactivateService(UUID id) {
        extraServiceRepository.findById(id).ifPresent(s -> {
            s.setActive(false);
            extraServiceRepository.save(s);
        });
    }
}
