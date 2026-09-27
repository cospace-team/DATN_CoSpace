package com.cospace.app.service;

import com.cospace.app.dto.api.SpaceDto.CreateWorkspaceRequest;
import com.cospace.app.dto.api.SpaceDto.UpdateWorkspaceRequest;
import com.cospace.app.dto.api.SpaceDto.WorkspaceResponse;
import com.cospace.app.dto.api.SpaceDto.WorkspaceTypeResponse;
import com.cospace.app.dto.api.SpaceDto.FloorResponse;
import com.cospace.app.dto.api.SpaceDto.CreateFloorRequest;
import com.cospace.app.dto.api.SpaceDto.UpdateFloorRequest;
import com.cospace.app.entity.BranchEntity;
import com.cospace.app.entity.Floor;
import com.cospace.app.entity.WorkspaceEntity;
import com.cospace.app.entity.WorkspaceType;
import com.cospace.app.repository.BookingRepository;
import com.cospace.app.repository.BranchEntityRepository;
import com.cospace.app.repository.FloorRepository;
import com.cospace.app.repository.WorkspaceEntityRepository;
import com.cospace.app.repository.WorkspaceTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SpaceManagementService {

    private final FloorRepository floorRepository;
    private final WorkspaceEntityRepository workspaceRepository;
    private final WorkspaceTypeRepository workspaceTypeRepository;
    private final BookingRepository bookingRepository;
    private final BranchEntityRepository branchEntityRepository;
    private final ObjectMapper objectMapper;
    private final com.cospace.app.repository.WorkspaceImageRepository workspaceImageRepository;

    private void validateBranchActive(UUID branchId) {
        if (branchId == null) return;
        branchEntityRepository.findById(branchId).ifPresent(branch -> {
            if (branch.getStatus() == BranchEntity.BranchStatus.inactive) {
                throw new IllegalArgumentException("Chi nhánh đang tạm ngưng hoạt động. Vui lòng kích hoạt chi nhánh trước khi cấu hình không gian.");
            }
        });
    }

    /* ═══════════════════════ Workspace Types ═══════════════════════ */

    public List<WorkspaceTypeResponse> listWorkspaceTypes() {
        return workspaceTypeRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    /* ═══════════════════════ Floors ═══════════════════════ */

    public List<FloorResponse> listFloors(UUID branchId) {
        return floorRepository.findByBranchIdOrderByFloorNo(branchId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public FloorResponse createFloor(UUID branchId, CreateFloorRequest req) {
        validateBranchActive(branchId);

        if (floorRepository.existsByBranchIdAndFloorNo(branchId, req.getFloorNo())) {
            throw new IllegalArgumentException("Tầng số " + req.getFloorNo() + " đã tồn tại trong chi nhánh này.");
        }

        Floor floor = Floor.builder()
                .branchId(branchId)
                .floorNo(req.getFloorNo())
                .name(req.getName())
                .svgContent(req.getSvgContent())
                .layoutJson(req.getLayoutJson())
                .svgUrl("")
                .mapVersion(1)
                .isPublished(true)
                .build();

        try {
            floor = floorRepository.saveAndFlush(floor);
            return toResponse(floor);
        } catch (DataIntegrityViolationException e) {
            throw new IllegalArgumentException("Tầng số " + req.getFloorNo() + " đã tồn tại trong chi nhánh này. Vui lòng chọn số tầng khác.");
        }
    }

    @Transactional
    public FloorResponse updateFloor(UUID branchId, UUID floorId, UpdateFloorRequest req) {
        Floor floor = floorRepository.findById(floorId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tầng."));

        if (branchId != null && !floor.getBranchId().equals(branchId)) {
            throw new IllegalArgumentException("Tầng không thuộc chi nhánh của bạn.");
        }
        validateBranchActive(floor.getBranchId());

        if (req.getName() != null && !req.getName().isBlank()) {
            floor.setName(req.getName());
        }
        if (req.getFloorNo() != null) {
            // Check duplicate only if changing floor number
            if (req.getFloorNo() != floor.getFloorNo()
                    && floorRepository.existsByBranchIdAndFloorNo(branchId, req.getFloorNo())) {
                throw new IllegalArgumentException("Tầng số " + req.getFloorNo() + " đã tồn tại.");
            }
            floor.setFloorNo(req.getFloorNo());
        }
        if (req.getIsPublished() != null) {
            floor.setPublished(req.getIsPublished());
        }
        if (req.getSvgContent() != null) {
            floor.setSvgContent(req.getSvgContent());
            floor.setMapVersion(floor.getMapVersion() + 1);
        }
        if (req.getLayoutJson() != null) {
            floor.setLayoutJson(req.getLayoutJson());
            floor.setMapVersion(floor.getMapVersion() + 1);

            try {
                JsonNode root = objectMapper.readTree(req.getLayoutJson());
                JsonNode elementsNode = root.get("elements");
                if (elementsNode != null && elementsNode.isArray()) {
                    List<WorkspaceEntity> workspacesInFloor = workspaceRepository.findByFloorId(floorId);
                    
                    // 1. Build a map of workspaceId (UUID string) -> elementId (from JSON)
                    Map<String, String> workspaceToElementMap = new HashMap<>();
                    for (JsonNode elNode : elementsNode) {
                        JsonNode wsIdNode = elNode.get("workspaceId");
                        JsonNode idNode = elNode.get("id");
                        if (wsIdNode != null && !wsIdNode.isNull() && idNode != null && !idNode.isNull()) {
                            workspaceToElementMap.put(wsIdNode.asText(), idNode.asText());
                        }
                    }

                    // 2. Temporarily set unique random values to avoid unique constraint conflicts on save
                    for (WorkspaceEntity ws : workspacesInFloor) {
                        ws.setSvgElementId("temp-" + UUID.randomUUID().toString());
                    }
                    workspaceRepository.saveAllAndFlush(workspacesInFloor);

                    // 3. Set the actual final svgElementId (either matching elementId or fallback to code)
                    for (WorkspaceEntity ws : workspacesInFloor) {
                        String wsIdStr = ws.getId().toString();
                        if (workspaceToElementMap.containsKey(wsIdStr)) {
                            ws.setSvgElementId(workspaceToElementMap.get(wsIdStr));
                        } else {
                            // Fallback to code if not linked in layout
                            ws.setSvgElementId(ws.getCode());
                        }
                    }
                    workspaceRepository.saveAll(workspacesInFloor);
                }
            } catch (Exception e) {
                throw new IllegalArgumentException("Lỗi đồng bộ Workspace với Layout JSON: " + e.getMessage());
            }
        }

        try {
            floor = floorRepository.saveAndFlush(floor);
            return toResponse(floor);
        } catch (DataIntegrityViolationException e) {
            throw new IllegalArgumentException("Tầng số " + req.getFloorNo() + " đã tồn tại trong chi nhánh này. Vui lòng chọn số tầng khác.");
        }
    }

    @Transactional
    public void deleteFloor(UUID branchId, UUID floorId) {
        Floor floor = floorRepository.findById(floorId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tầng."));

        if (branchId != null && !floor.getBranchId().equals(branchId)) {
            throw new IllegalArgumentException("Tầng không thuộc chi nhánh của bạn.");
        }

        // Check for future bookings on any workspace in this floor
        List<WorkspaceEntity> workspacesInFloor = workspaceRepository.findByFloorId(floorId);
        for (WorkspaceEntity ws : workspacesInFloor) {
            if (hasFutureBookings(ws.getId())) {
                throw new IllegalArgumentException(
                        "Không thể xóa tầng \"" + floor.getName()
                                + "\" vì workspace \"" + ws.getCode() + "\" đang có lịch đặt chỗ trong tương lai.");
            }
        }

        workspaceRepository.deleteAll(workspacesInFloor);
        floorRepository.delete(floor);
    }

    /* ═══════════════════════ Workspaces ═══════════════════════ */

    public List<WorkspaceResponse> listWorkspaces(UUID branchId, UUID floorId) {
        // Verify floor belongs to branch
        Floor floor = floorRepository.findById(floorId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tầng."));
        if (branchId != null && !floor.getBranchId().equals(branchId)) {
            throw new IllegalArgumentException("Tầng không thuộc chi nhánh của bạn.");
        }

        List<WorkspaceEntity> workspaces = workspaceRepository.findByFloorIdOrderByCode(floorId);
        java.util.Map<UUID, List<com.cospace.app.dto.api.SpaceDto.WorkspaceImageResponse>> images = workspaces.isEmpty()
                ? java.util.Map.of()
                : workspaceImageRepository.findByWorkspaceIdInOrderBySortOrderAscCreatedAtAsc(
                                workspaces.stream().map(WorkspaceEntity::getId).toList()).stream()
                        .collect(java.util.stream.Collectors.groupingBy(com.cospace.app.entity.WorkspaceImage::getWorkspaceId,
                                java.util.stream.Collectors.mapping(WorkspaceImageService::toResponse, java.util.stream.Collectors.toList())));
        return workspaces.stream()
                .map(ws -> {
                    WorkspaceResponse r = toResponse(ws);
                    r.setImages(images.getOrDefault(ws.getId(), List.of()));
                    return r;
                })
                .toList();
    }

    @Transactional
    public WorkspaceResponse createWorkspace(UUID branchId, CreateWorkspaceRequest req) {
        // Verify floor belongs to branch
        Floor floor = floorRepository.findById(req.getFloorId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tầng."));
        if (branchId != null && !floor.getBranchId().equals(branchId)) {
            throw new IllegalArgumentException("Tầng không thuộc chi nhánh của bạn.");
        }
        validateBranchActive(floor.getBranchId());

        // Verify workspace type exists
        workspaceTypeRepository.findByString(req.getWorkspaceTypeId())
                .orElseThrow(() -> new IllegalArgumentException("Loại không gian không hợp lệ."));

        // Check unique code per floor
        if (workspaceRepository.existsByFloorIdAndCode(req.getFloorId(), req.getCode())) {
            throw new IllegalArgumentException("Mã \"" + req.getCode() + "\" đã tồn tại trong tầng này.");
        }

        // Check unique svg_element_id per floor
        if (workspaceRepository.existsByFloorIdAndSvgElementId(req.getFloorId(), req.getSvgElementId())) {
            throw new IllegalArgumentException(
                    "SVG Element ID \"" + req.getSvgElementId() + "\" đã được gán cho workspace khác trong tầng này.");
        }

        WorkspaceEntity ws = WorkspaceEntity.builder()
                .floorId(req.getFloorId())
                .workspaceTypeId(UUID.fromString(req.getWorkspaceTypeId()))
                .code(req.getCode())
                .name(req.getName())
                .capacity(req.getCapacity())
                .svgElementId(req.getSvgElementId())
                .status(WorkspaceEntity.Status.active)
                .build();

        try {
            ws = workspaceRepository.saveAndFlush(ws);
            return withImages(toResponse(ws));
        } catch (DataIntegrityViolationException e) {
            throw new IllegalArgumentException("Mã không gian hoặc phần tử SVG đã tồn tại trong tầng này.");
        }
    }

    @Transactional
    public WorkspaceResponse updateWorkspace(UUID branchId, UUID wsId, UpdateWorkspaceRequest req) {
        WorkspaceEntity ws = workspaceRepository.findById(wsId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy workspace."));

        // Verify workspace's floor belongs to branch
        Floor floor = floorRepository.findById(ws.getFloorId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tầng."));
        if (branchId != null && !floor.getBranchId().equals(branchId)) {
            throw new IllegalArgumentException("Workspace không thuộc chi nhánh của bạn.");
        }
        validateBranchActive(floor.getBranchId());

        if (req.getCode() != null && !req.getCode().isBlank() && !req.getCode().equals(ws.getCode())) {
            if (workspaceRepository.existsByFloorIdAndCode(ws.getFloorId(), req.getCode())) {
                throw new IllegalArgumentException("Mã \"" + req.getCode() + "\" đã tồn tại.");
            }
            ws.setCode(req.getCode());
        }
        if (req.getName() != null && !req.getName().isBlank()) {
            ws.setName(req.getName());
        }
        if (req.getWorkspaceTypeId() != null) {
            workspaceTypeRepository.findByString(req.getWorkspaceTypeId())
                    .orElseThrow(() -> new IllegalArgumentException("Loại không gian không hợp lệ."));
            ws.setWorkspaceTypeId(UUID.fromString(req.getWorkspaceTypeId()));
        }
        if (req.getCapacity() > 0) {
            ws.setCapacity(req.getCapacity());
        }
        if (req.getSvgElementId() != null && !req.getSvgElementId().isBlank()
                && !req.getSvgElementId().equals(ws.getSvgElementId())) {
            if (workspaceRepository.existsByFloorIdAndSvgElementId(ws.getFloorId(), req.getSvgElementId())) {
                throw new IllegalArgumentException("SVG Element ID \"" + req.getSvgElementId() + "\" đã được gán.");
            }
            ws.setSvgElementId(req.getSvgElementId());
        }
        if (req.getStatus() != null && !req.getStatus().isBlank()) {
            try {
                ws.setStatus(WorkspaceEntity.Status.valueOf(req.getStatus()));
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Trạng thái không hợp lệ: " + req.getStatus());
            }
        }

        try {
            ws = workspaceRepository.saveAndFlush(ws);
            return withImages(toResponse(ws));
        } catch (DataIntegrityViolationException e) {
            throw new IllegalArgumentException("Mã không gian hoặc phần tử SVG đã tồn tại trong tầng này.");
        }
    }

    @Transactional
    public void deleteWorkspace(UUID branchId, UUID wsId) {
        WorkspaceEntity ws = workspaceRepository.findById(wsId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy workspace."));

        Floor floor = floorRepository.findById(ws.getFloorId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tầng."));
        if (branchId != null && !floor.getBranchId().equals(branchId)) {
            throw new IllegalArgumentException("Workspace không thuộc chi nhánh của bạn.");
        }

        if (hasFutureBookings(wsId)) {
            throw new IllegalArgumentException(
                    "Không thể xóa \"" + ws.getCode() + "\" vì đang có lịch đặt chỗ trong tương lai.");
        }

        workspaceRepository.delete(ws);
    }

    /* ═══════════════════════ Helpers ═══════════════════════ */

    private boolean hasFutureBookings(UUID workspaceId) {
        return bookingRepository.existsByWorkspaceIdAndStartAtAfter(
                workspaceId,
                OffsetDateTime.now()
        );
    }

    private FloorResponse toResponse(Floor floor) {
        int wsCount = workspaceRepository.countByFloorId(floor.getId());
        return FloorResponse.builder()
                .id(floor.getId())
                .floorNo(floor.getFloorNo())
                .name(floor.getName())
                .svgContent(floor.getSvgContent())
                .layoutJson(floor.getLayoutJson())
                .mapVersion(floor.getMapVersion())
                .isPublished(floor.isPublished())
                .workspaceCount(wsCount)
                .build();
    }

    private WorkspaceResponse toResponse(WorkspaceEntity ws) {
        String typeName = ws.getWorkspaceTypeId() != null
                ? workspaceTypeRepository.findById(ws.getWorkspaceTypeId())
                        .map(WorkspaceType::getName)
                        .orElse("—")
                : "—";

        return WorkspaceResponse.builder()
                .id(ws.getId())
                .code(ws.getCode())
                .name(ws.getName())
                .workspaceTypeId(ws.getWorkspaceTypeId() != null ? ws.getWorkspaceTypeId().toString() : null)
                .workspaceTypeName(typeName)
                .capacity(ws.getCapacity())
                .svgElementId(ws.getSvgElementId())
                .status(ws.getStatus().name())
                .build();
    }

    /** A single workspace's response with its photos, so saving it never drops them from the admin view. */
    private WorkspaceResponse withImages(WorkspaceResponse r) {
        r.setImages(workspaceImageRepository.findByWorkspaceIdOrderBySortOrderAscCreatedAtAsc(r.getId()).stream()
                .map(WorkspaceImageService::toResponse)
                .toList());
        return r;
    }

    private WorkspaceTypeResponse toResponse(WorkspaceType wt) {
        return WorkspaceTypeResponse.builder()
                .id(wt.getId())
                .code(wt.getCode())
                .name(wt.getName())
                .capacityDefault(wt.getCapacityDefault())
                .build();
    }
}
