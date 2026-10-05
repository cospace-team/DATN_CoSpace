package com.cospace.app.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

/** Photos taken at the counter (a broken seat, a lost item), stored beside the workspace photos. */
@Service
@RequiredArgsConstructor
public class StaffPhotoService {

    private final SupabaseStorageService storageService;

    /** @return the public URL of the stored photo */
    public String upload(UUID branchId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Vui lòng chọn ảnh để tải lên.");
        }
        if (file.getSize() > WorkspaceImageService.MAX_BYTES) {
            throw new IllegalArgumentException("Ảnh tối đa 5MB.");
        }
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new IllegalArgumentException("Không đọc được tệp ảnh.");
        }
        // The declared content type comes from the client; the file's own header decides.
        String extension = WorkspaceImageService.detectImageExtension(bytes);
        if (extension == null) {
            throw new IllegalArgumentException("Chỉ hỗ trợ ảnh JPG, PNG, WebP hoặc GIF.");
        }
        String path = "staff/" + branchId + "/" + UUID.randomUUID() + "." + extension;
        return storageService.upload(path, bytes, WorkspaceImageService.contentTypeFor(extension));
    }
}
