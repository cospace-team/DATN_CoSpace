package com.cospace.app.controller;

import com.cospace.app.dto.api.PostCreateRequest;
import com.cospace.app.dto.api.PostDto;
import com.cospace.app.entity.Tag;
import com.cospace.app.service.CommunityPostService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/community")
@RequiredArgsConstructor
public class CommunityPostController {

    private final CommunityPostService communityPostService;
    private final com.cospace.app.service.PostCommentService postCommentService;

    @GetMapping("/posts")
    public ResponseEntity<?> listFeed(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) UUID tagId,
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "relevant") String sort) {
        try {
            UUID userId = extractUserId(jwt);
            List<PostDto> cached = communityPostService.listFeed(userId, tagId, type, sort);
            Map<UUID, Long> counts = postCommentService.counts(cached.stream().map(PostDto::getId).toList());
            // Copies: the feed list is shared through the service's cache.
            List<PostDto> feed = cached.stream().map(p -> {
                PostDto copy = PostDto.builder().build();
                org.springframework.beans.BeanUtils.copyProperties(p, copy);
                copy.setCommentCount(counts.getOrDefault(p.getId(), 0L));
                return copy;
            }).toList();
            return ResponseEntity.ok(Map.of("data", feed));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/posts")
    public ResponseEntity<?> createPost(@AuthenticationPrincipal Jwt jwt, @RequestBody PostCreateRequest req) {
        try {
            UUID userId = extractUserId(jwt);
            PostDto created = communityPostService.createPost(userId, req);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/posts/{postId}")
    public ResponseEntity<?> deletePost(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID postId) {
        try {
            UUID userId = extractUserId(jwt);
            communityPostService.deletePost(userId, postId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/posts/{postId}/comments")
    public ResponseEntity<?> listComments(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID postId) {
        return ResponseEntity.ok(Map.of("data", postCommentService.list(extractUserId(jwt), postId)));
    }

    @PostMapping("/posts/{postId}/comments")
    public ResponseEntity<?> addComment(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID postId,
                                        @RequestBody Map<String, String> body) {
        try {
            UUID userId = extractUserId(jwt);
            return ResponseEntity.status(HttpStatus.CREATED).body(postCommentService.add(userId, postId, body.get("content")));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<?> deleteComment(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID commentId) {
        try {
            postCommentService.delete(extractUserId(jwt), commentId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /** Tag vocabulary shared by posts and profiles — used for filter chips and manual tagging. */
    @GetMapping("/tags")
    public ResponseEntity<List<Tag>> listTags() {
        return ResponseEntity.ok(communityPostService.listTags());
    }

    private UUID extractUserId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            throw new IllegalArgumentException("Người dùng chưa được xác thực");
        }
        return UUID.fromString(jwt.getSubject());
    }
}
