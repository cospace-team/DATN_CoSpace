package com.cospace.app.service;

import com.cospace.app.entity.Floor;
import com.cospace.app.entity.WorkspaceEntity;
import com.cospace.app.repository.FloorRepository;
import com.cospace.app.repository.WorkspaceEntityRepository;
import com.cospace.app.repository.WorkspaceImageRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkspaceImageServiceTest {

    @Mock
    private WorkspaceImageRepository imageRepository;
    @Mock
    private WorkspaceEntityRepository workspaceRepository;
    @Mock
    private FloorRepository floorRepository;
    @Mock
    private SupabaseStorageService storageService;

    @InjectMocks
    private WorkspaceImageService service;

    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D};

    @Test
    void detectsImagesByTheirContentNotTheirName() {
        assertThat(WorkspaceImageService.detectImageExtension(PNG)).isEqualTo("png");
        assertThat(WorkspaceImageService.detectImageExtension(
                new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0, 0, 0, 0, 0, 0, 0, 0, 0})).isEqualTo("jpg");
        assertThat(WorkspaceImageService.detectImageExtension("<svg onload=alert(1)>".getBytes())).isNull();
    }

    @Test
    void cannotAddPhotosToAnotherBranchesWorkspace() {
        UUID wsId = UUID.randomUUID();
        UUID floorId = UUID.randomUUID();
        when(workspaceRepository.findById(wsId)).thenReturn(Optional.of(WorkspaceEntity.builder().id(wsId).floorId(floorId).build()));
        when(floorRepository.findById(floorId)).thenReturn(Optional.of(Floor.builder().id(floorId).branchId(UUID.randomUUID()).build()));

        assertThatThrownBy(() -> service.add(UUID.randomUUID(), wsId, new MockMultipartFile("file", "a.png", "image/png", PNG)))
                .isInstanceOf(IllegalArgumentException.class);
        verify(storageService, never()).upload(any(), any(), any());
    }

    @Test
    void rejectsAFileThatIsNotAnImage() {
        UUID wsId = UUID.randomUUID();
        UUID floorId = UUID.randomUUID();
        UUID branchId = UUID.randomUUID();
        when(workspaceRepository.findById(wsId)).thenReturn(Optional.of(WorkspaceEntity.builder().id(wsId).floorId(floorId).build()));
        when(floorRepository.findById(floorId)).thenReturn(Optional.of(Floor.builder().id(floorId).branchId(branchId).build()));

        assertThatThrownBy(() -> service.add(branchId, wsId,
                new MockMultipartFile("file", "a.png", "image/png", "not really an image".getBytes())))
                .isInstanceOf(IllegalArgumentException.class);
        verify(storageService, never()).upload(any(), any(), any());
    }
}
