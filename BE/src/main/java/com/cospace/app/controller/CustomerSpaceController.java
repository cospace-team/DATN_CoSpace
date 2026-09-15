package com.cospace.app.controller;

import com.cospace.app.dto.api.PublicWorkspaceAvailabilityDto;
import com.cospace.app.dto.api.SpaceDto.FloorResponse;
import com.cospace.app.dto.api.SpaceDto.WorkspaceResponse;
import com.cospace.app.entity.BranchEntity;
import com.cospace.app.entity.BranchEntity.BranchStatus;
import com.cospace.app.entity.PricePolicy;
import com.cospace.app.entity.WorkspaceType;
import com.cospace.app.repository.BranchEntityRepository;
import com.cospace.app.repository.PricePolicyRepository;
import com.cospace.app.repository.WorkspaceTypeRepository;
import com.cospace.app.service.BookingService;
import com.cospace.app.service.SpaceManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/customer/spaces")
@RequiredArgsConstructor
public class CustomerSpaceController {

    private final SpaceManagementService spaceService;
    private final BranchEntityRepository branchRepo;
    private final BookingService bookingService;
    private final PricePolicyRepository pricePolicyRepository;
    private final WorkspaceTypeRepository workspaceTypeRepository;

    /** Lightweight branch summary for customer UI (public listing) */
    public record BranchSummaryDto(
            UUID id,
            String code,
            String name,
            String address,
            String city,
            String status,
            LocalTime openTime,
            LocalTime closeTime
    ) {}

    /** Price a customer pays per unit at a branch: the branch's own policy, else the system-wide one. */
    public record PriceDto(UUID workspaceTypeId, String workspaceTypeCode, String workspaceTypeName, String unit, long price) {}

    /** Cheapest advertised starting price of a workspace type, for the public landing page. */
    public record StartingPriceDto(UUID workspaceTypeId, String code, String name, int capacityDefault, String unit, long price) {}

    @GetMapping("/branches")
    public List<BranchSummaryDto> listActiveBranches() {
        return branchRepo.findByStatusOrderByNameAsc(BranchStatus.active)
                .stream()
                .map(b -> new BranchSummaryDto(
                        b.getId(),
                        b.getCode(),
                        b.getName(),
                        b.getAddress(),
                        b.getCity(),
                        b.getStatus().name(),
                        b.getOpenTime(),
                        b.getCloseTime()
                ))
                .toList();
    }

    @GetMapping("/branches/{branchId}/prices")
    public List<PriceDto> listPrices(@PathVariable UUID branchId) {
        Map<UUID, WorkspaceType> types = workspaceTypeRepository.findAll().stream()
                .collect(Collectors.toMap(WorkspaceType::getId, Function.identity()));
        Map<String, PricePolicy> effective = new LinkedHashMap<>();
        for (PricePolicy p : pricePolicyRepository.findByBranchIdIsNullAndIsActiveTrue()) {
            effective.put(p.getWorkspaceTypeId() + ":" + p.getDurationUnit(), p);
        }
        for (PricePolicy p : pricePolicyRepository.findByBranchIdAndIsActiveTrue(branchId)) {
            effective.put(p.getWorkspaceTypeId() + ":" + p.getDurationUnit(), p); // branch overrides global
        }
        return effective.values().stream()
                .filter(p -> types.containsKey(p.getWorkspaceTypeId()))
                .sorted(Comparator.comparing((PricePolicy p) -> types.get(p.getWorkspaceTypeId()).getName())
                        .thenComparing(p -> p.getDurationUnit().ordinal()))
                .map(p -> {
                    WorkspaceType t = types.get(p.getWorkspaceTypeId());
                    return new PriceDto(t.getId(), t.getCode(), t.getName(), p.getDurationUnit().name(), p.getPrice());
                })
                .toList();
    }

    /** Public: lowest price of each workspace type in its shortest bookable unit, across all branches. */
    @GetMapping("/pricing-summary")
    public List<StartingPriceDto> pricingSummary() {
        List<PricePolicy> active = pricePolicyRepository.findAll().stream().filter(PricePolicy::isActive).toList();
        return workspaceTypeRepository.findAll().stream()
                .sorted(Comparator.comparing(WorkspaceType::getName))
                .map(t -> active.stream()
                        .filter(p -> t.getId().equals(p.getWorkspaceTypeId()))
                        .min(Comparator.comparing((PricePolicy p) -> p.getDurationUnit().ordinal())
                                .thenComparingLong(PricePolicy::getPrice))
                        .map(p -> new StartingPriceDto(t.getId(), t.getCode(), t.getName(), t.getCapacityDefault(),
                                p.getDurationUnit().name(), p.getPrice()))
                        .orElse(null))
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    @GetMapping("/branches/{branchId}/floors")
    public ResponseEntity<?> listFloors(@PathVariable UUID branchId) {
        try {
            List<FloorResponse> floors = spaceService.listFloors(branchId);
            return ResponseEntity.ok(floors);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "bad_request",
                    "message", e.getMessage()
            ));
        }
    }

    @GetMapping("/branches/{branchId}/floors/{floorId}/workspaces")
    public ResponseEntity<?> listWorkspaces(@PathVariable UUID branchId, @PathVariable UUID floorId) {
        try {
            List<WorkspaceResponse> workspaces = spaceService.listWorkspaces(branchId, floorId);
            return ResponseEntity.ok(workspaces);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "bad_request",
                    "message", e.getMessage()
            ));
        }
    }

    /**
     * Which time ranges each workspace in the branch is busy in, across ALL customers —
     * unlike /api/bookings/my, which only reflects the caller's own bookings. No booking owner
     * identity or pricing is exposed here; that data stays behind the staff-only endpoint.
     */
    @GetMapping("/branches/{branchId}/booking-status")
    public ResponseEntity<?> getBookingStatus(
            @PathVariable UUID branchId,
            @RequestParam String from,
            @RequestParam String to) {
        try {
            OffsetDateTime fromAt = OffsetDateTime.parse(from);
            OffsetDateTime toAt = OffsetDateTime.parse(to);
            if (!toAt.isAfter(fromAt)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                        "error", "bad_request",
                        "message", "'to' must be after 'from'"
                ));
            }
            List<PublicWorkspaceAvailabilityDto> availability =
                    bookingService.getPublicWorkspaceAvailability(branchId, fromAt, toAt);
            return ResponseEntity.ok(availability);
        } catch (java.time.format.DateTimeParseException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "bad_request",
                    "message", "'from'/'to' must be ISO-8601 date-times"
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "bad_request",
                    "message", e.getMessage()
            ));
        }
    }
}
