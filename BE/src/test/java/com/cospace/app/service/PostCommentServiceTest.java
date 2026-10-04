package com.cospace.app.service;

import com.cospace.app.dto.api.PostCommentDto;
import com.cospace.app.entity.Post;
import com.cospace.app.entity.PostComment;
import com.cospace.app.entity.User;
import com.cospace.app.repository.PostCommentRepository;
import com.cospace.app.repository.PostRepository;
import com.cospace.app.repository.ProfileRepository;
import com.cospace.app.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PostCommentServiceTest {

    @Mock
    private PostCommentRepository commentRepository;
    @Mock
    private PostRepository postRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ProfileRepository profileRepository;
    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private PostCommentService service;

    private final UUID author = UUID.randomUUID();
    private final UUID reader = UUID.randomUUID();

    private Post post() {
        Post p = Post.builder().id(UUID.randomUUID()).authorUserId(author).title("Tìm bạn backend Java")
                .content("…").status("published").build();
        when(postRepository.findById(p.getId())).thenReturn(Optional.of(p));
        return p;
    }

    @Test
    void replyIsSavedAndTheAuthorIsNotified() {
        Post p = post();
        when(commentRepository.save(any(PostComment.class))).thenAnswer(inv -> {
            PostComment c = inv.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });
        when(userRepository.findById(reader)).thenReturn(Optional.of(User.builder().id(reader).fullName("Lê Quốc Cường").build()));

        PostCommentDto dto = service.add(reader, p.getId(), "  Mình biết Spring Boot, nhắn mình nhé  ");

        assertThat(dto.getContent()).isEqualTo("Mình biết Spring Boot, nhắn mình nhé");
        assertThat(dto.isMine()).isTrue();
        verify(notificationService).createNotification(eq(author), anyString(),
                org.mockito.ArgumentMatchers.contains("Lê Quốc Cường"), eq(PostCommentService.NOTIFY_TYPE), eq(p.getId()), eq("POST"));
    }

    @Test
    void authorReplyingToThemselvesIsNotNotified() {
        Post p = post();
        when(commentRepository.save(any(PostComment.class))).thenAnswer(inv -> inv.getArgument(0));

        service.add(author, p.getId(), "Cập nhật: đã tìm được người");

        verify(notificationService, never()).createNotification(any(), any(), any(), any(), any(), any());
    }

    @Test
    void emptyOrTooLongRepliesAreRefused() {
        UUID postId = UUID.randomUUID();
        assertThatThrownBy(() -> service.add(reader, postId, "   ")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.add(reader, postId, "x".repeat(1001))).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void onlyTheWriterCanDeleteAReply() {
        PostComment c = PostComment.builder().id(UUID.randomUUID()).authorUserId(author).postId(UUID.randomUUID()).content("hi").build();
        when(commentRepository.findById(c.getId())).thenReturn(Optional.of(c));

        assertThatThrownBy(() -> service.delete(reader, c.getId())).isInstanceOf(IllegalArgumentException.class);
        service.delete(author, c.getId());
        verify(commentRepository).delete(c);
    }

    @Test
    void countsComeBackPerPost() {
        UUID a = UUID.randomUUID();
        when(commentRepository.countByPostIds(List.of(a))).thenReturn(java.util.Collections.singletonList(new Object[]{a, 3L}));

        assertThat(service.counts(List.of(a))).containsEntry(a, 3L);
    }
}
