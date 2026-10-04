package com.cospace.app.service;

import com.cospace.app.dto.api.PostCommentDto;
import com.cospace.app.entity.Post;
import com.cospace.app.entity.PostComment;
import com.cospace.app.entity.Profile;
import com.cospace.app.entity.User;
import com.cospace.app.repository.PostCommentRepository;
import com.cospace.app.repository.PostRepository;
import com.cospace.app.repository.ProfileRepository;
import com.cospace.app.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Replies under community posts, so a "Tìm cộng sự" post can actually be answered. */
@Service
@RequiredArgsConstructor
public class PostCommentService {

    public static final int MAX_LENGTH = 1000;
    public static final String NOTIFY_TYPE = "COMMUNITY_POST";

    private final PostCommentRepository commentRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public List<PostCommentDto> list(UUID viewerId, UUID postId) {
        return toDtos(viewerId, commentRepository.findByPostIdOrderByCreatedAtAsc(postId));
    }

    /** Adds a reply and lets the post's author know (not when they reply to themselves). */
    @Transactional
    public PostCommentDto add(UUID authorId, UUID postId, String content) {
        String text = content == null ? "" : content.trim();
        if (text.isEmpty()) {
            throw new IllegalArgumentException("Vui lòng nhập nội dung bình luận.");
        }
        if (text.length() > MAX_LENGTH) {
            throw new IllegalArgumentException("Bình luận tối đa " + MAX_LENGTH + " ký tự.");
        }
        Post post = postRepository.findById(postId)
                .filter(p -> "published".equals(p.getStatus()))
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bài viết."));
        PostComment saved = commentRepository.save(PostComment.builder()
                .postId(postId).authorUserId(authorId).content(text).build());
        if (!post.getAuthorUserId().equals(authorId)) {
            String who = userRepository.findById(authorId).map(User::getFullName).orElse("Một thành viên");
            notificationService.createNotification(post.getAuthorUserId(),
                    "Có người trả lời bài viết của bạn",
                    who + " đã bình luận bài \"" + post.getTitle() + "\": " + preview(text),
                    NOTIFY_TYPE, postId, "POST");
        }
        return toDtos(authorId, List.of(saved)).get(0);
    }

    @Transactional
    public void delete(UUID userId, UUID commentId) {
        PostComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bình luận."));
        if (!comment.getAuthorUserId().equals(userId)) {
            throw new IllegalArgumentException("Bạn chỉ có thể xóa bình luận của chính mình.");
        }
        commentRepository.delete(comment);
    }

    /** Number of replies of each post; posts without any are absent. */
    @Transactional(readOnly = true)
    public Map<UUID, Long> counts(Collection<UUID> postIds) {
        if (postIds == null || postIds.isEmpty()) return Map.of();
        Map<UUID, Long> out = new HashMap<>();
        for (Object[] row : commentRepository.countByPostIds(postIds)) {
            out.put((UUID) row[0], ((Number) row[1]).longValue());
        }
        return out;
    }

    private List<PostCommentDto> toDtos(UUID viewerId, List<PostComment> comments) {
        List<UUID> authorIds = comments.stream().map(PostComment::getAuthorUserId).distinct().toList();
        Map<UUID, User> users = userRepository.findAllById(authorIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
        Map<UUID, Profile> profiles = profileRepository.findAllById(authorIds).stream()
                .collect(Collectors.toMap(Profile::getUserId, Function.identity()));
        return comments.stream().map(c -> {
            User u = users.get(c.getAuthorUserId());
            Profile p = profiles.get(c.getAuthorUserId());
            return PostCommentDto.builder()
                    .id(c.getId())
                    .postId(c.getPostId())
                    .authorId(c.getAuthorUserId())
                    .authorName(u != null ? u.getFullName() : "Thành viên CoSpace")
                    .authorAvatar(u != null ? u.getAvatarUrl() : null)
                    .authorProfession(p != null ? p.getProfession() : null)
                    .content(c.getContent())
                    .createdAt(c.getCreatedAt() != null ? c.getCreatedAt().toString() : null)
                    .mine(viewerId != null && viewerId.equals(c.getAuthorUserId()))
                    .build();
        }).toList();
    }

    private static String preview(String text) {
        return text.length() <= 80 ? text : text.substring(0, 77) + "…";
    }
}
