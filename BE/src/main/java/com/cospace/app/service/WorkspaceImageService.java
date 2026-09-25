package com.cospace.app.service;

import com.cospace.app.dto.api.SpaceDto.WorkspaceImageResponse;
import com.cospace.app.entity.Floor;
import com.cospace.app.entity.WorkspaceEntity;
import com.cospace.app.entity.WorkspaceImage;
import com.cospace.app.repository.FloorRepository;
import com.cospace.app.repository.WorkspaceEntityRepository;
import com.cospace.app.repository.WorkspaceImageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

/** Photos of a workspace, uploaded by branch admins and shown to customers when booking. */
@Service
@RequiredArgsConstructor
public class WorkspaceImageService {

    static final int MAX_IMAGES_PER_WORKSPACE = 10;
    static final long MAX_BYTES = 5L * 1024 * 1024;

    private final WorkspaceImageRepository imageRepository;
    private final WorkspaceEntityRepository workspaceRepository;
    private final FloorRepository floorRepository;
    private final SupabaseStorageService storageService;

    @Transactional(readOnly = true)
    public List<WorkspaceImageResponse> list(UUID workspaceId) {
        return imageRepository.findByWorkspaceIdOrderBySortOrderAscCreatedAtAsc(workspaceId).stream()
                .map(WorkspaceImageService::toResponse)
                .toList();
    }

    /**
     * Stores a photo for a workspace of the caller's branch ({@code branchId} null = any branch,
     * for super admins).
     */
    @Transactional
    public WorkspaceImageResponse add(UUID branchId, UUID workspaceId, MultipartFile file) {
        requireWorkspaceInBranch(branchId, workspaceId);
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Vui lòng chọn ảnh để tải lên.");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new IllegalArgumentException("Ảnh tối đa 5MB.");
        }
        long count = imageRepository.countByWorkspaceId(workspaceId);
        if (count >= MAX_IMAGES_PER_WORKSPACE) {
            throw new IllegalStateException("Mỗi không gian tối đa " + MAX_IMAGES_PER_WORKSPACE + " ảnh.");
        }
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new IllegalArgumentException("Không đọc được tệp ảnh.");
        }
        // The declared content type comes from the client; the file's own header decides.
        String extension = detectImageExtension(bytes);
        if (extension == null) {
            throw new IllegalArgumentException("Chỉ hỗ trợ ảnh JPG, PNG, WebP hoặc GIF.");
        }

        UUID imageId = UUID.randomUUID();
        String path = "workspaces/" + workspaceId + "/" + imageId + "." + extension;
        String url = storageService.upload(path, bytes, contentTypeFor(extension));
        WorkspaceImage image = imageRepository.save(WorkspaceImage.builder()
                .id(imageId)
                .workspaceId(workspaceId)
                .url(url)
                .storagePath(path)
                .sortOrder((int) count)
                .build());
        return toResponse(image);
    }

    @Transactional
    public void delete(UUID branchId, UUID workspaceId, UUID imageId) {
        requireWorkspaceInBranch(branchId, workspaceId);
        WorkspaceImage image = imageRepository.findById(imageId)
                .filter(i -> i.getWorkspaceId().equals(workspaceId))
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ảnh."));
        imageRepository.delete(image);
        storageService.delete(image.getStoragePath());
    }

    private void requireWorkspaceInBranch(UUID branchId, UUID workspaceId) {
        WorkspaceEntity ws = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy workspace."));
        Floor floor = floorRepository.findById(ws.getFloorId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tầng."));
        if (branchId != null && !floor.getBranchId().equals(branchId)) {
            throw new IllegalArgumentException("Workspace không thuộc chi nhánh của bạn.");
        }
    }

    /** jpg / png / webp / gif from the file's magic bytes, or null if it is not one of those. */
    static String detectImageExtension(byte[] b) {
        if (b == null || b.length < 12) return null;
        if ((b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) return "jpg";
        if ((b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') return "png";
        if (b[0] == 'G' && b[1] == 'I' && b[2] == 'F' && b[3] == '8') return "gif";
        if (b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') return "webp";
        return null;
    }

    private static String contentTypeFor(String extension) {
        return switch (extension) {
            case "jpg" -> "image/jpeg";
            case "png" -> "image/png";
            case "gif" -> "image/gif";
            default -> "image/webp";
        };
    }

    static WorkspaceImageResponse toResponse(WorkspaceImage image) {
        return WorkspaceImageResponse.builder().id(image.getId()).url(image.getUrl()).build();
    }
}
