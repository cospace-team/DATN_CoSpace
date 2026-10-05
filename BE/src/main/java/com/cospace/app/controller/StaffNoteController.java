package com.cospace.app.controller;

import com.cospace.app.dto.api.StaffNoteDto.CreateRequest;
import com.cospace.app.dto.api.StaffNoteDto.ResolveRequest;
import com.cospace.app.dto.api.StaffNoteDto.Response;
import com.cospace.app.security.BranchAccessGuard;
import com.cospace.app.service.StaffNoteService;
import com.cospace.app.service.StaffPhotoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * The branch counter's log (handover notes, incidents, lost items, notes about customers) and the
 * photos attached to it. Always scoped to the caller's own branch; a super admin names the branch.
 */
@RestController
@RequestMapping("/api/staff")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('staff', 'branch_admin', 'super_admin', 'admin', 'STAFF', 'BRANCH_ADMIN', 'SUPER_ADMIN', 'ADMIN')")
public class StaffNoteController {

    private final StaffNoteService noteService;
    private final StaffPhotoService photoService;
    private final BranchAccessGuard branchAccessGuard;

    @GetMapping("/notes")
    public List<Response> list(@AuthenticationPrincipal Jwt jwt,
                               @RequestParam(required = false) String kind,
                               @RequestParam(required = false) String status,
                               @RequestParam(required = false) UUID customerId,
                               @RequestParam(required = false) UUID branchId) {
        return noteService.list(branchAccessGuard.requireBranchAccess(jwt, branchId), kind, status, customerId);
    }

    @PostMapping("/notes")
    @ResponseStatus(HttpStatus.CREATED)
    public Response create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateRequest req) {
        UUID branchId = branchAccessGuard.requireBranchAccess(jwt, req.getBranchId());
        return noteService.create(UUID.fromString(jwt.getSubject()), branchId, req);
    }

    @PostMapping("/notes/{id}/resolve")
    public Response resolve(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                            @Valid @RequestBody(required = false) ResolveRequest req) {
        branchAccessGuard.requireAccessToBranch(jwt, noteService.branchOf(id));
        return noteService.resolve(UUID.fromString(jwt.getSubject()), id, null, req != null ? req.getNote() : null);
    }

    /** Uploads one photo (a broken seat, a lost item) and returns its URL for a note or a maintenance window. */
    @PostMapping(value = "/photos", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, String> uploadPhoto(@AuthenticationPrincipal Jwt jwt,
                                           @RequestParam("file") MultipartFile file,
                                           @RequestParam(required = false) UUID branchId) {
        UUID branch = branchAccessGuard.requireBranchAccess(jwt, branchId);
        return Map.of("url", photoService.upload(branch, file));
    }
}
