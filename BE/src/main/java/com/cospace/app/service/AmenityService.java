package com.cospace.app.service;

import com.cospace.app.config.CacheConfig;
import com.cospace.app.dto.api.AmenityDto.AmenityRequest;
import com.cospace.app.dto.api.AmenityDto.AmenityResponse;
import com.cospace.app.dto.api.AmenityDto.AssignAmenitiesRequest;
import com.cospace.app.dto.api.AmenityDto.AssignedAmenity;
import com.cospace.app.dto.api.AmenityDto.WorkspaceTypeAmenities;
import com.cospace.app.entity.Amenity;
import com.cospace.app.entity.WorkspaceType;
import com.cospace.app.entity.WorkspaceTypeAmenity;
import com.cospace.app.repository.AmenityRepository;
import com.cospace.app.repository.WorkspaceTypeAmenityRepository;
import com.cospace.app.repository.WorkspaceTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Amenities (tiện ích) are defined once system-wide and attached to workspace types, so every
 * workspace of a type inherits that type's amenity set (SYSTEM_SPEC template/variant pattern).
 */
@Service
@RequiredArgsConstructor
public class AmenityService {

    private final AmenityRepository amenityRepository;
    private final WorkspaceTypeAmenityRepository workspaceTypeAmenityRepository;
    private final WorkspaceTypeRepository workspaceTypeRepository;

    @Transactional(readOnly = true)
    @Cacheable(CacheConfig.AMENITIES)
    public List<AmenityResponse> listAmenities() {
        Map<UUID, Long> usage = workspaceTypeAmenityRepository.findAll().stream()
                .collect(Collectors.groupingBy(WorkspaceTypeAmenity::getAmenityId, Collectors.counting()));
        return amenityRepository.findAllByOrderByNameAsc().stream()
                .map(a -> toResponse(a, usage.getOrDefault(a.getId(), 0L)))
                .toList();
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = CacheConfig.AMENITIES, allEntries = true),
            @CacheEvict(value = CacheConfig.WORKSPACE_TYPE_AMENITIES, allEntries = true)
    })
    public AmenityResponse createAmenity(AmenityRequest req) {
        String name = req.getName().trim();
        if (amenityRepository.existsByNameIgnoreCase(name)) {
            throw new IllegalStateException("Tiện ích \"" + name + "\" đã tồn tại.");
        }
        Amenity amenity = Amenity.builder()
                .name(name)
                .iconName(blankToNull(req.getIconName()))
                .description(blankToNull(req.getDescription()))
                .isActive(req.getIsActive() == null || req.getIsActive())
                .build();
        return toResponse(amenityRepository.save(amenity), 0L);
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = CacheConfig.AMENITIES, allEntries = true),
            @CacheEvict(value = CacheConfig.WORKSPACE_TYPE_AMENITIES, allEntries = true)
    })
    public AmenityResponse updateAmenity(UUID id, AmenityRequest req) {
        Amenity amenity = findAmenity(id);
        String name = req.getName().trim();
        if (amenityRepository.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new IllegalStateException("Tiện ích \"" + name + "\" đã tồn tại.");
        }
        amenity.setName(name);
        amenity.setIconName(blankToNull(req.getIconName()));
        amenity.setDescription(blankToNull(req.getDescription()));
        if (req.getIsActive() != null) amenity.setActive(req.getIsActive());
        amenity = amenityRepository.save(amenity);
        return toResponse(amenity, workspaceTypeAmenityRepository.countByAmenityId(id));
    }

    /** Hard delete — the amenity is also detached from every workspace type using it. */
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = CacheConfig.AMENITIES, allEntries = true),
            @CacheEvict(value = CacheConfig.WORKSPACE_TYPE_AMENITIES, allEntries = true)
    })
    public Amenity deleteAmenity(UUID id) {
        Amenity amenity = findAmenity(id);
        workspaceTypeAmenityRepository.deleteAll(workspaceTypeAmenityRepository.findByAmenityId(id));
        amenityRepository.delete(amenity);
        return amenity;
    }

    /**
     * Every workspace type with its assigned amenities. {@code activeOnly} hides deactivated
     * amenities — the customer view; the admin assignment screen needs to see them all.
     */
    @Transactional(readOnly = true)
    @Cacheable(value = CacheConfig.WORKSPACE_TYPE_AMENITIES, key = "#activeOnly")
    public List<WorkspaceTypeAmenities> listWorkspaceTypeAmenities(boolean activeOnly) {
        Map<UUID, Amenity> amenities = amenityRepository.findAll().stream()
                .collect(Collectors.toMap(Amenity::getId, Function.identity()));
        Map<UUID, List<WorkspaceTypeAmenity>> byType = workspaceTypeAmenityRepository.findAll().stream()
                .collect(Collectors.groupingBy(WorkspaceTypeAmenity::getWorkspaceTypeId));

        return workspaceTypeRepository.findAll().stream()
                .sorted(Comparator.comparing(WorkspaceType::getName))
                .map(type -> WorkspaceTypeAmenities.builder()
                        .workspaceTypeId(type.getId())
                        .workspaceTypeCode(type.getCode())
                        .workspaceTypeName(type.getName())
                        .capacityDefault(type.getCapacityDefault())
                        .amenities(byType.getOrDefault(type.getId(), List.of()).stream()
                                .map(wta -> {
                                    Amenity a = amenities.get(wta.getAmenityId());
                                    if (a == null || (activeOnly && !a.isActive())) return null;
                                    return AssignedAmenity.builder()
                                            .amenityId(a.getId())
                                            .name(a.getName())
                                            .iconName(a.getIconName())
                                            .quantity(wta.getQuantity())
                                            .build();
                                })
                                .filter(java.util.Objects::nonNull)
                                .sorted(Comparator.comparing(AssignedAmenity::getName))
                                .toList())
                        .build())
                .toList();
    }

    /** Replaces a workspace type's whole amenity set with the given list. */
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = CacheConfig.AMENITIES, allEntries = true),
            @CacheEvict(value = CacheConfig.WORKSPACE_TYPE_AMENITIES, allEntries = true)
    })
    public List<AssignedAmenity> assignAmenities(UUID workspaceTypeId, AssignAmenitiesRequest req) {
        if (!workspaceTypeRepository.existsById(workspaceTypeId)) {
            throw new IllegalArgumentException("Không tìm thấy loại không gian.");
        }
        // Last entry wins if the same amenity is sent twice.
        Map<UUID, Integer> requested = new LinkedHashMap<>();
        for (AssignAmenitiesRequest.Item item : req.getAmenities()) {
            requested.put(item.getAmenityId(), Math.max(1, item.getQuantity()));
        }
        Map<UUID, Amenity> amenities = amenityRepository.findAllById(requested.keySet()).stream()
                .collect(Collectors.toMap(Amenity::getId, Function.identity()));
        if (amenities.size() != requested.size()) {
            throw new IllegalArgumentException("Có tiện ích không tồn tại trong danh sách gửi lên.");
        }

        workspaceTypeAmenityRepository.deleteByWorkspaceTypeId(workspaceTypeId);
        workspaceTypeAmenityRepository.flush();
        workspaceTypeAmenityRepository.saveAll(requested.entrySet().stream()
                .map(e -> WorkspaceTypeAmenity.builder()
                        .workspaceTypeId(workspaceTypeId)
                        .amenityId(e.getKey())
                        .quantity(e.getValue())
                        .build())
                .toList());

        return requested.entrySet().stream()
                .map(e -> {
                    Amenity a = amenities.get(e.getKey());
                    return AssignedAmenity.builder()
                            .amenityId(a.getId())
                            .name(a.getName())
                            .iconName(a.getIconName())
                            .quantity(e.getValue())
                            .build();
                })
                .toList();
    }

    private Amenity findAmenity(UUID id) {
        return amenityRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tiện ích."));
    }

    private AmenityResponse toResponse(Amenity a, long workspaceTypeCount) {
        return AmenityResponse.builder()
                .id(a.getId())
                .name(a.getName())
                .iconName(a.getIconName())
                .description(a.getDescription())
                .isActive(a.isActive())
                .workspaceTypeCount(workspaceTypeCount)
                .build();
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
