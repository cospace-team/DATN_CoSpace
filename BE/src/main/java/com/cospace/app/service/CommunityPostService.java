package com.cospace.app.service;

import com.cospace.app.dto.api.PostCreateRequest;
import com.cospace.app.dto.api.PostDto;
import com.cospace.app.entity.BranchEntity;
import com.cospace.app.entity.Post;
import com.cospace.app.entity.PostTag;
import com.cospace.app.entity.Profile;
import com.cospace.app.entity.Tag;
import com.cospace.app.entity.User;
import com.cospace.app.repository.BranchEntityRepository;
import com.cospace.app.repository.PostRepository;
import com.cospace.app.repository.PostTagRepository;
import com.cospace.app.repository.ProfileInterestRepository;
import com.cospace.app.repository.ProfileRepository;
import com.cospace.app.repository.ProfileSkillRepository;
import com.cospace.app.repository.TagRepository;
import com.cospace.app.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Community feed: members post about what they're building or looking for, and every post is
 * tagged from the same vocabulary as profile skills/interests. That shared vocabulary is what
 * turns a post into a networking signal — the feed ranks posts by how well they line up with the
 * reader, and {@link PartnerMatchingService} folds post tags into who it recommends.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CommunityPostService {

    private static final int MAX_AI_TAGS = 5;
    private static final long TAGS_CACHE_TTL = 10 * 60 * 1000L; // 10 minutes
    private static final long BASE_FEED_CACHE_TTL = 60 * 1000L; // 60 seconds
    private static final long VIEWER_FEED_CACHE_TTL = 30 * 1000L; // 30 seconds

    private static volatile CacheEntry<List<Tag>> TAGS_CACHE;
    private static volatile CacheEntry<BaseFeedSnapshot> BASE_FEED_CACHE;
    private static final java.util.concurrent.ConcurrentHashMap<String, CacheEntry<List<PostDto>>> VIEWER_FEED_CACHE = new java.util.concurrent.ConcurrentHashMap<>();

    private static class CacheEntry<T> {
        final T data;
        final long expiresAt;

        CacheEntry(T data, long ttlMs) {
            this.data = data;
            this.expiresAt = System.currentTimeMillis() + ttlMs;
        }

        boolean isExpired() {
            return System.currentTimeMillis() > expiresAt;
        }
    }

    private static class BaseFeedSnapshot {
        final List<Post> posts;
        final Map<UUID, Tag> tagMap;
        final Map<UUID, List<UUID>> tagsByPost;
        final Map<UUID, User> userMap;
        final Map<UUID, Profile> profileMap;
        final Map<UUID, BranchEntity> branchMap;

        BaseFeedSnapshot(List<Post> posts,
                         Map<UUID, Tag> tagMap,
                         Map<UUID, List<UUID>> tagsByPost,
                         Map<UUID, User> userMap,
                         Map<UUID, Profile> profileMap,
                         Map<UUID, BranchEntity> branchMap) {
            this.posts = posts;
            this.tagMap = tagMap;
            this.tagsByPost = tagsByPost;
            this.userMap = userMap;
            this.profileMap = profileMap;
            this.branchMap = branchMap;
        }
    }

    public static void clearFeedCache() {
        BASE_FEED_CACHE = null;
        VIEWER_FEED_CACHE.clear();
    }

    private final PostRepository postRepository;
    private final PostTagRepository postTagRepository;
    private final TagRepository tagRepository;
    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;
    private final ProfileSkillRepository profileSkillRepository;
    private final ProfileInterestRepository profileInterestRepository;
    private final BranchEntityRepository branchRepository;
    private final GeminiClient geminiClient;

    @Transactional
    public PostDto createPost(UUID authorId, PostCreateRequest req) {
        if (req.getTitle() == null || req.getTitle().isBlank()) {
            throw new IllegalArgumentException("Tiêu đề bài viết không được để trống.");
        }
        if (req.getContent() == null || req.getContent().isBlank()) {
            throw new IllegalArgumentException("Nội dung bài viết không được để trống.");
        }

        User author = userRepository.findById(authorId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng."));

        UUID branchId = req.getBranchId();
        if (branchId == null) {
            Profile profile = profileRepository.findById(authorId).orElse(null);
            branchId = profile != null && profile.getPrimaryBranchId() != null
                    ? profile.getPrimaryBranchId()
                    : author.getBranchId();
        }

        Post saved = postRepository.save(Post.builder()
                .authorUserId(authorId)
                .title(req.getTitle().trim())
                .content(req.getContent().trim())
                .postType(normalizeType(req.getPostType()))
                .branchId(branchId)
                .status("published")
                .build());

        List<Tag> vocabulary = tagRepository.findByIsActiveTrue();
        Set<UUID> manualTagIds = req.getTagIds() == null ? Set.of() : new LinkedHashSet<>(req.getTagIds());
        Set<UUID> validVocabularyIds = vocabulary.stream().map(Tag::getId).collect(Collectors.toSet());

        List<PostTag> toSave = new ArrayList<>();
        for (UUID tagId : manualTagIds) {
            if (validVocabularyIds.contains(tagId)) {
                toSave.add(PostTag.builder().postId(saved.getId()).tagId(tagId).source("manual").build());
            }
        }

        // Anything the author didn't tag themselves gets filled in from the post text, so posting
        // is a one-field action and untagged posts still reach the right people.
        if (toSave.size() < MAX_AI_TAGS) {
            Set<UUID> already = toSave.stream().map(PostTag::getTagId).collect(Collectors.toSet());
            for (Tag tag : extractTags(saved.getTitle(), saved.getContent(), vocabulary)) {
                if (already.contains(tag.getId())) continue;
                toSave.add(PostTag.builder().postId(saved.getId()).tagId(tag.getId()).source("ai").build());
                already.add(tag.getId());
                if (toSave.size() >= MAX_AI_TAGS) break;
            }
        }
        postTagRepository.saveAll(toSave);
        clearFeedCache();

        return listFeed(authorId, null, null, "recent").stream()
                .filter(p -> p.getId().equals(saved.getId()))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Không đọc lại được bài viết vừa tạo."));
    }

    private BaseFeedSnapshot getOrLoadBaseFeed() {
        CacheEntry<BaseFeedSnapshot> cached = BASE_FEED_CACHE;
        if (cached != null && !cached.isExpired()) {
            return cached.data;
        }

        List<Post> posts = postRepository.findByStatusOrderByCreatedAtDesc("published");
        if (posts.isEmpty()) {
            BaseFeedSnapshot empty = new BaseFeedSnapshot(List.of(), Map.of(), Map.of(), Map.of(), Map.of(), Map.of());
            BASE_FEED_CACHE = new CacheEntry<>(empty, BASE_FEED_CACHE_TTL);
            return empty;
        }

        List<Tag> allTags = listTags();
        Map<UUID, Tag> tagMap = allTags.stream()
                .collect(Collectors.toMap(Tag::getId, Function.identity(), (a, b) -> a));

        Map<UUID, List<UUID>> tagsByPost = postTagRepository.findAll().stream()
                .collect(Collectors.groupingBy(PostTag::getPostId,
                        Collectors.mapping(PostTag::getTagId, Collectors.toList())));

        Set<UUID> authorIds = posts.stream().map(Post::getAuthorUserId).collect(Collectors.toSet());
        Map<UUID, User> userMap = userRepository.findAllById(authorIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity(), (a, b) -> a));
        Map<UUID, Profile> profileMap = profileRepository.findAllById(authorIds).stream()
                .collect(Collectors.toMap(Profile::getUserId, Function.identity(), (a, b) -> a));

        Set<UUID> branchIds = posts.stream().map(Post::getBranchId)
                .filter(java.util.Objects::nonNull).collect(Collectors.toSet());
        Map<UUID, BranchEntity> branchMap = branchIds.isEmpty() ? Map.of()
                : branchRepository.findAllById(branchIds).stream()
                        .collect(Collectors.toMap(BranchEntity::getId, Function.identity(), (a, b) -> a));

        BaseFeedSnapshot snapshot = new BaseFeedSnapshot(posts, tagMap, tagsByPost, userMap, profileMap, branchMap);
        BASE_FEED_CACHE = new CacheEntry<>(snapshot, BASE_FEED_CACHE_TTL);
        return snapshot;
    }

    @Transactional(readOnly = true)
    public List<PostDto> listFeed(UUID viewerId, UUID tagFilter, String typeFilter, String sort) {
        String cacheKey = (viewerId != null ? viewerId.toString() : "anon")
                + ":" + (tagFilter != null ? tagFilter.toString() : "")
                + ":" + (typeFilter != null ? typeFilter : "")
                + ":" + (sort != null ? sort : "relevant");

        CacheEntry<List<PostDto>> cached = VIEWER_FEED_CACHE.get(cacheKey);
        if (cached != null && !cached.isExpired()) {
            return cached.data;
        }

        BaseFeedSnapshot snapshot = getOrLoadBaseFeed();
        if (snapshot.posts.isEmpty()) {
            return List.of();
        }

        Set<UUID> viewerTagIds = viewerId != null ? viewerTagIds(viewerId, snapshot) : Set.of();
        UUID viewerBranchId = null;
        if (viewerId != null) {
            Profile viewerProfile = snapshot.profileMap.get(viewerId);
            if (viewerProfile == null) {
                viewerProfile = profileRepository.findById(viewerId).orElse(null);
            }
            if (viewerProfile != null) {
                viewerBranchId = viewerProfile.getPrimaryBranchId();
            }
        }

        List<PostDto> feed = new ArrayList<>();
        for (Post post : snapshot.posts) {
            List<UUID> postTagIds = snapshot.tagsByPost.getOrDefault(post.getId(), List.of());

            if (tagFilter != null && !postTagIds.contains(tagFilter)) continue;
            if (typeFilter != null && !typeFilter.isBlank() && !typeFilter.equals(post.getPostType())) continue;

            List<UUID> matched = postTagIds.stream().filter(viewerTagIds::contains).toList();

            double ratio = postTagIds.isEmpty() || viewerTagIds.isEmpty()
                    ? 0.0
                    : (double) matched.size() / Math.min(postTagIds.size(), viewerTagIds.size());
            if (viewerBranchId != null && viewerBranchId.equals(post.getBranchId())) {
                ratio += 0.15;
            }
            int relevance = (int) Math.round(Math.min(1.0, ratio) * 100);

            User author = snapshot.userMap.get(post.getAuthorUserId());
            Profile authorProfile = snapshot.profileMap.get(post.getAuthorUserId());
            BranchEntity branch = post.getBranchId() == null ? null : snapshot.branchMap.get(post.getBranchId());

            feed.add(PostDto.builder()
                    .id(post.getId())
                    .title(post.getTitle())
                    .content(post.getContent())
                    .postType(post.getPostType())
                    .branchId(post.getBranchId())
                    .branchName(branch != null ? branch.getName() : null)
                    .createdAt(post.getCreatedAt() == null ? null : post.getCreatedAt().toString())
                    .authorId(post.getAuthorUserId())
                    .authorName(author != null ? author.getFullName() : "Thành viên CoSpace")
                    .authorAvatar(author != null ? author.getAvatarUrl() : null)
                    .authorProfession(authorProfile != null ? authorProfile.getProfession() : null)
                    .authorCompany(authorProfile != null ? authorProfile.getCompany() : null)
                    .tags(postTagIds.stream().map(snapshot.tagMap::get).filter(java.util.Objects::nonNull).map(Tag::getName).toList())
                    .relevanceScore(relevance)
                    .matchedTags(matched.stream().map(snapshot.tagMap::get).filter(java.util.Objects::nonNull).map(Tag::getName).toList())
                    .mine(viewerId != null && post.getAuthorUserId().equals(viewerId))
                    .build());
        }

        if ("relevant".equalsIgnoreCase(sort)) {
            // Recency is the tie-breaker, so an empty-profile viewer still gets a sensible feed.
            feed.sort(Comparator.comparingInt(PostDto::getRelevanceScore).reversed()
                    .thenComparing(PostDto::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())));
        }

        VIEWER_FEED_CACHE.put(cacheKey, new CacheEntry<>(feed, VIEWER_FEED_CACHE_TTL));
        return feed;
    }

    @Transactional
    public void deletePost(UUID userId, UUID postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bài viết."));
        if (!post.getAuthorUserId().equals(userId)) {
            throw new IllegalArgumentException("Bạn chỉ có thể xóa bài viết của chính mình.");
        }
        postTagRepository.deleteByPostId(postId);
        postRepository.delete(post);
        clearFeedCache();
    }

    @Transactional(readOnly = true)
    public List<Tag> listTags() {
        CacheEntry<List<Tag>> cached = TAGS_CACHE;
        if (cached != null && !cached.isExpired()) {
            return cached.data;
        }
        List<Tag> tags = tagRepository.findByIsActiveTrue();
        TAGS_CACHE = new CacheEntry<>(tags, TAGS_CACHE_TTL);
        return tags;
    }

    /** The viewer's own skills, interests and the tags on posts they've written. */
    private Set<UUID> viewerTagIds(UUID viewerId, BaseFeedSnapshot snapshot) {
        Set<UUID> ids = new HashSet<>();
        profileSkillRepository.findByProfileUserId(viewerId)
                .forEach(s -> ids.add(s.getTagId()));
        profileInterestRepository.findByProfileUserId(viewerId)
                .forEach(i -> ids.add(i.getTagId()));

        if (snapshot != null) {
            for (Post own : snapshot.posts) {
                if (own.getAuthorUserId().equals(viewerId)) {
                    List<UUID> tags = snapshot.tagsByPost.get(own.getId());
                    if (tags != null) ids.addAll(tags);
                }
            }
        }
        return ids;
    }

    /**
     * Asks Gemini which of the existing tags the post is about. Falls back to matching tag names
     * against the text so posting keeps working when no API key is configured or the call fails.
     */
    private List<Tag> extractTags(String title, String content, List<Tag> vocabulary) {
        if (vocabulary.isEmpty()) {
            return List.of();
        }
        List<Tag> keywordMatches = matchVocabulary(title + " " + content, vocabulary);
        if (!keywordMatches.isEmpty()) {
            return keywordMatches;
        }
        if (geminiClient.isConfigured()) {
            try {
                String vocabularyList = vocabulary.stream().map(Tag::getName).collect(Collectors.joining(", "));
                String systemPrompt = "Bạn phân loại bài đăng của thành viên không gian làm việc chung CoSpace. "
                        + "Chỉ được chọn trong danh sách nhãn sau: " + vocabularyList + ". "
                        + "Trả về tối đa " + MAX_AI_TAGS + " nhãn phù hợp nhất, phân tách bằng dấu phẩy, "
                        + "không giải thích gì thêm. Nếu không có nhãn nào phù hợp, trả về chuỗi rỗng.";
                String userText = "Tiêu đề: " + title + "\nNội dung: " + content;

                JsonNode response = geminiClient.generateContent(
                        systemPrompt,
                        List.of(Map.of("role", "user", "parts", List.of(Map.of("text", userText)))),
                        null);

                StringBuilder reply = new StringBuilder();
                for (JsonNode part : response.path("candidates").path(0).path("content").path("parts")) {
                    if (part.has("text")) reply.append(part.get("text").asText()).append(' ');
                }
                List<Tag> picked = matchVocabulary(reply.toString(), vocabulary);
                if (!picked.isEmpty()) {
                    return picked;
                }
                log.info("Gemini returned no usable tags for post '{}', falling back to keyword match", title);
            } catch (Exception e) {
                log.warn("Gemini tag extraction failed, falling back to keyword match: {}", e.getMessage());
            }
        }
        return matchVocabulary(title + " " + content, vocabulary);
    }

    /** Picks every vocabulary tag whose name appears in the text, case-insensitively. */
    private List<Tag> matchVocabulary(String text, List<Tag> vocabulary) {
        if (text == null || text.isBlank()) {
            return List.of();
        }
        String haystack = text.toLowerCase(Locale.ROOT);
        List<Tag> matches = new ArrayList<>();
        for (Tag tag : vocabulary) {
            if (haystack.contains(tag.getName().toLowerCase(Locale.ROOT))) {
                matches.add(tag);
                if (matches.size() >= MAX_AI_TAGS) break;
            }
        }
        return matches;
    }

    private String normalizeType(String type) {
        if (type == null) return "sharing";
        return switch (type) {
            case "seeking_partner", "question", "event", "sharing" -> type;
            default -> "sharing";
        };
    }
}
