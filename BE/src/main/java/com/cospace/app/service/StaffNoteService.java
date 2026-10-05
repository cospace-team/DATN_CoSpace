package com.cospace.app.service;

import com.cospace.app.dto.api.StaffNoteDto.CreateRequest;
import com.cospace.app.dto.api.StaffNoteDto.Response;
import com.cospace.app.entity.Booking;
import com.cospace.app.entity.StaffNote;
import com.cospace.app.entity.User;
import com.cospace.app.entity.WorkspaceEntity;
import com.cospace.app.repository.BookingRepository;
import com.cospace.app.repository.StaffNoteRepository;
import com.cospace.app.repository.UserRepository;
import com.cospace.app.repository.WorkspaceEntityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * The branch counter's log: handover notes, incidents, lost items and notes about customers. All
 * of it stays inside the branch it was written in.
 */
@Service
@RequiredArgsConstructor
public class StaffNoteService {

    private static final int LIMIT = 200;

    private final StaffNoteRepository noteRepository;
    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final WorkspaceEntityRepository workspaceEntityRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public List<Response> list(UUID branchId, String kind, String status, UUID customerId) {
        String k = blankToNull(kind);
        String s = blankToNull(status);
        if (k != null && !StaffNote.KINDS.contains(k)) throw new IllegalArgumentException("Loại ghi chú không hợp lệ.");
        if (s != null && !StaffNote.OPEN.equals(s) && !StaffNote.RESOLVED.equals(s)) {
            throw new IllegalArgumentException("Trạng thái không hợp lệ.");
        }
        return toResponses(noteRepository.search(branchId, k, s, customerId, PageRequest.of(0, LIMIT)));
    }

    @Transactional
    public Response create(UUID staffId, UUID branchId, CreateRequest req) {
        String kind = req.getKind().trim();
        if (!StaffNote.KINDS.contains(kind)) throw new IllegalArgumentException("Loại ghi chú không hợp lệ.");

        if (StaffNote.CUSTOMER.equals(kind)) {
            if (req.getCustomerId() == null) throw new IllegalArgumentException("Vui lòng chọn khách hàng cho ghi chú.");
            if (!bookingRepository.existsByUserIdAndBranchId(req.getCustomerId(), branchId)) {
                throw new IllegalArgumentException("Khách này chưa có đơn nào tại chi nhánh, không thể ghi chú.");
            }
        }
        if (req.getBookingId() != null) {
            Booking booking = bookingRepository.findById(req.getBookingId())
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn đặt chỗ."));
            if (!branchId.equals(booking.getBranchId())) throw new IllegalArgumentException("Đơn không thuộc chi nhánh này.");
        }
        if (req.getWorkspaceId() != null
                && !workspaceEntityRepository.findBranchIdByWorkspaceId(req.getWorkspaceId()).filter(branchId::equals).isPresent()) {
            throw new IllegalArgumentException("Chỗ ngồi không thuộc chi nhánh này.");
        }
        String photo = blankToNull(req.getPhotoUrl());
        if (photo != null && !photo.startsWith("http")) throw new IllegalArgumentException("Đường dẫn ảnh không hợp lệ.");

        StaffNote note = noteRepository.save(StaffNote.builder()
                .id(UUID.randomUUID())
                .branchId(branchId)
                .kind(kind)
                .title(req.getTitle().trim())
                .body(blankToNull(req.getBody()))
                .customerId(req.getCustomerId())
                .bookingId(req.getBookingId())
                .workspaceId(req.getWorkspaceId())
                .photoUrl(photo)
                .status(StaffNote.OPEN)
                .createdBy(staffId)
                .createdAt(OffsetDateTime.now(ZoneOffset.UTC))
                .build());
        auditLogService.record(staffId, "CREATE", "staff_notes", note.getId(),
                AuditLogService.values("kind", kind, "title", note.getTitle()));

        if (StaffNote.INCIDENT.equals(kind)) {
            // A manager should not have to open the log to learn something went wrong.
            for (User admin : userRepository.findByBranchIdAndRole(branchId, User.Role.branch_admin)) {
                notificationService.createNotification(admin.getId(), "Sự cố mới tại chi nhánh",
                        note.getTitle(), "INCIDENT", note.getId(), "STAFF_NOTE");
            }
        }
        return toResponses(List.of(note)).get(0);
    }

    /** Hands a handover note over, closes an incident, returns a lost item, or lifts a customer note. */
    @Transactional
    public Response resolve(UUID staffId, UUID noteId, UUID callerBranchId, String resolution) {
        StaffNote note = noteRepository.findById(noteId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ghi chú."));
        if (callerBranchId != null && !callerBranchId.equals(note.getBranchId())) {
            throw new org.springframework.security.access.AccessDeniedException("Bạn không có quyền với ghi chú của chi nhánh khác.");
        }
        if (!StaffNote.OPEN.equals(note.getStatus())) {
            throw new IllegalStateException("Ghi chú này đã được đóng trước đó.");
        }
        String text = blankToNull(resolution);
        if ((StaffNote.LOST_FOUND.equals(note.getKind()) || StaffNote.INCIDENT.equals(note.getKind())) && text == null) {
            throw new IllegalArgumentException(StaffNote.LOST_FOUND.equals(note.getKind())
                    ? "Vui lòng ghi đồ đã trả cho ai."
                    : "Vui lòng ghi cách đã xử lý sự cố.");
        }
        note.setStatus(StaffNote.RESOLVED);
        note.setResolvedBy(staffId);
        note.setResolvedAt(OffsetDateTime.now(ZoneOffset.UTC));
        note.setResolutionNote(text);
        noteRepository.save(note);
        auditLogService.record(staffId, "RESOLVE", "staff_notes", note.getId(),
                AuditLogService.values("kind", note.getKind(), "title", note.getTitle(), "resolution", text));
        return toResponses(List.of(note)).get(0);
    }

    @Transactional(readOnly = true)
    public UUID branchOf(UUID noteId) {
        return noteRepository.findById(noteId).map(StaffNote::getBranchId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ghi chú."));
    }

    private List<Response> toResponses(List<StaffNote> notes) {
        if (notes.isEmpty()) return List.of();
        Map<UUID, User> users = userRepository.findAllById(notes.stream()
                        .flatMap(n -> Stream.of(n.getCreatedBy(), n.getResolvedBy(), n.getCustomerId()))
                        .filter(Objects::nonNull).distinct().toList())
                .stream().collect(Collectors.toMap(User::getId, Function.identity()));
        Map<UUID, Booking> bookings = bookingRepository.findAllById(notes.stream().map(StaffNote::getBookingId)
                        .filter(Objects::nonNull).distinct().toList())
                .stream().collect(Collectors.toMap(Booking::getId, Function.identity()));
        Map<UUID, WorkspaceEntity> workspaces = workspaceEntityRepository.findAllById(notes.stream().map(StaffNote::getWorkspaceId)
                        .filter(Objects::nonNull).distinct().toList())
                .stream().collect(Collectors.toMap(WorkspaceEntity::getId, Function.identity()));
        return notes.stream().map(n -> {
            User customer = n.getCustomerId() != null ? users.get(n.getCustomerId()) : null;
            User author = users.get(n.getCreatedBy());
            User resolver = n.getResolvedBy() != null ? users.get(n.getResolvedBy()) : null;
            Booking booking = n.getBookingId() != null ? bookings.get(n.getBookingId()) : null;
            WorkspaceEntity ws = n.getWorkspaceId() != null ? workspaces.get(n.getWorkspaceId()) : null;
            return Response.builder()
                    .id(n.getId()).branchId(n.getBranchId()).kind(n.getKind()).title(n.getTitle()).body(n.getBody())
                    .customerId(n.getCustomerId())
                    .customerName(customer != null ? customer.getFullName() : null)
                    .customerPhone(customer != null ? customer.getPhone() : null)
                    .bookingId(n.getBookingId()).bookingCode(booking != null ? booking.getBookingCode() : null)
                    .workspaceId(n.getWorkspaceId()).workspaceName(ws != null ? ws.getName() : null)
                    .photoUrl(n.getPhotoUrl()).status(n.getStatus())
                    .createdBy(n.getCreatedBy()).createdByName(author != null ? author.getFullName() : null)
                    .createdAt(n.getCreatedAt())
                    .resolvedByName(resolver != null ? resolver.getFullName() : null)
                    .resolvedAt(n.getResolvedAt()).resolutionNote(n.getResolutionNote())
                    .build();
        }).toList();
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
