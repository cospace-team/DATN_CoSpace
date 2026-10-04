package com.cospace.app.service;

import com.cospace.app.dto.api.NetworkingProfileDto;
import com.cospace.app.dto.api.PartnerSuggestionDto;
import com.cospace.app.entity.Profile;
import com.cospace.app.entity.ProfileInterest;
import com.cospace.app.entity.ProfileMatchScore;
import com.cospace.app.entity.ProfileSkill;
import com.cospace.app.entity.Tag;
import com.cospace.app.entity.User;
import com.cospace.app.repository.PostTagRepository;
import com.cospace.app.repository.ProfileInterestRepository;
import com.cospace.app.repository.ProfileMatchScoreRepository;
import com.cospace.app.repository.ProfileRepository;
import com.cospace.app.repository.ProfileSkillRepository;
import com.cospace.app.repository.TagRepository;
import com.cospace.app.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PartnerMatchingService {

    /** Only the top few get an AI-written reason; the rest keep the tag-based sentence. */
    private static final int REASONED_SUGGESTIONS = 6;
    private static final java.util.regex.Pattern REASON_LINE =
            java.util.regex.Pattern.compile("^(\\d+)\\s*[.)-]\\s*(.+)$");
    private static final Map<String, String> MATCH_REASON_CACHE = new java.util.concurrent.ConcurrentHashMap<>();

    private static class CacheEntry {
        final List<PartnerSuggestionDto> data;
        final long expiresAt;

        CacheEntry(List<PartnerSuggestionDto> data, long ttlMillis) {
            this.data = data;
            this.expiresAt = System.currentTimeMillis() + ttlMillis;
        }

        boolean isExpired() {
            return System.currentTimeMillis() > expiresAt;
        }
    }

    private static final Map<UUID, CacheEntry> SUGGESTIONS_CACHE = new java.util.concurrent.ConcurrentHashMap<>();
    private static final long SUGGESTIONS_CACHE_TTL = 3 * 60 * 1000L; // 3 minutes

    public static void clearCache(UUID userId) {
        if (userId != null) {
            SUGGESTIONS_CACHE.remove(userId);
        } else {
            SUGGESTIONS_CACHE.clear();
        }
        CommunityPostService.clearFeedCache();
    }

    private final ProfileRepository profileRepository;
    private final ProfileSkillRepository profileSkillRepository;
    private final ProfileInterestRepository profileInterestRepository;
    private final ProfileMatchScoreRepository profileMatchScoreRepository;
    private final TagRepository tagRepository;
    private final UserRepository userRepository;
    private final PostTagRepository postTagRepository;
    private final GeminiClient geminiClient;
    private final PartnerConnectionService partnerConnectionService;

    @Transactional(readOnly = true)
    public NetworkingProfileDto getNetworkingProfile(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng"));

        Profile profile = profileRepository.findById(userId).orElse(null);
        if (profile == null) {
            profile = Profile.builder()
                    .userId(userId)
                    .bio("")
                    .profession("")
                    .company("")
                    .contactEmail(user.getEmail())
                    .contactPhone(user.getPhone())
                    .contactPublic(false)
                    .build();
        }

        Map<UUID, Tag> tagMap = tagRepository.findAll().stream()
                .collect(Collectors.toMap(Tag::getId, Function.identity(), (a, b) -> a));

        List<ProfileSkill> skills = profileSkillRepository.findByProfileUserId(userId);
        List<NetworkingProfileDto.SkillItemDto> skillDtos = skills.stream()
                .map(s -> {
                    Tag tag = tagMap.get(s.getTagId());
                    String name = tag != null ? tag.getName() : "Unknown";
                    return new NetworkingProfileDto.SkillItemDto(s.getTagId(), name, s.getLevel());
                })
                .toList();

        List<ProfileInterest> interests = profileInterestRepository.findByProfileUserId(userId);
        List<NetworkingProfileDto.InterestItemDto> interestDtos = interests.stream()
                .map(i -> {
                    Tag tag = tagMap.get(i.getTagId());
                    String name = tag != null ? tag.getName() : "Unknown";
                    return new NetworkingProfileDto.InterestItemDto(i.getTagId(), name, i.getPriority());
                })
                .toList();

        return NetworkingProfileDto.builder()
                .userId(userId)
                .fullName(user.getFullName())
                .avatarUrl(user.getAvatarUrl())
                .bio(profile.getBio())
                .profession(profile.getProfession())
                .company(profile.getCompany())
                .contactEmail(profile.getContactEmail())
                .contactPhone(profile.getContactPhone())
                .contactLink(profile.getContactLink())
                .contactPublic(profile.isContactPublic())
                .primaryBranchId(profile.getPrimaryBranchId())
                .skills(skillDtos)
                .interests(interestDtos)
                .build();
    }

    @Transactional
    public NetworkingProfileDto updateNetworkingProfile(UUID userId, NetworkingProfileDto req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng"));

        Profile profile = profileRepository.findById(userId).orElse(null);
        if (profile == null) {
            profile = Profile.builder().userId(userId).build();
        }

        profile.setBio(req.getBio());
        profile.setProfession(req.getProfession());
        profile.setCompany(req.getCompany());
        profile.setContactEmail(req.getContactEmail() != null ? req.getContactEmail() : user.getEmail());
        // Shown to other members on the profile card, so it gets the same check as the account phone.
        profile.setContactPhone(req.getContactPhone() != null && !req.getContactPhone().isBlank()
                ? com.cospace.app.util.CredentialRules.normalizePhone(req.getContactPhone())
                : user.getPhone());
        profile.setContactLink(req.getContactLink());
        profile.setContactPublic(req.isContactPublic());
        if (req.getPrimaryBranchId() != null) {
            profile.setPrimaryBranchId(req.getPrimaryBranchId());
        }
        profileRepository.save(profile);

        // Update Skills
        profileSkillRepository.deleteByProfileUserId(userId);
        if (req.getSkills() != null) {
            List<ProfileSkill> newSkills = new ArrayList<>();
            for (NetworkingProfileDto.SkillItemDto s : req.getSkills()) {
                UUID tagId = s.getTagId();
                if (tagId == null && s.getTagName() != null && !s.getTagName().isBlank()) {
                    String name = s.getTagName().trim();
                    Tag tag = tagRepository.findByNameIgnoreCase(name)
                            .orElseGet(() -> tagRepository.save(Tag.builder()
                                    .name(name)
                                    .category("skill")
                                    .isActive(true)
                                    .build()));
                    tagId = tag.getId();
                }
                if (tagId != null) {
                    newSkills.add(ProfileSkill.builder()
                            .profileUserId(userId)
                            .tagId(tagId)
                            .level(s.getLevel() > 0 ? s.getLevel() : (short) 3)
                            .build());
                }
            }
            profileSkillRepository.saveAll(newSkills);
        }

        // Update Interests
        profileInterestRepository.deleteByProfileUserId(userId);
        if (req.getInterests() != null) {
            List<ProfileInterest> newInterests = new ArrayList<>();
            for (NetworkingProfileDto.InterestItemDto i : req.getInterests()) {
                UUID tagId = i.getTagId();
                if (tagId == null && i.getTagName() != null && !i.getTagName().isBlank()) {
                    String name = i.getTagName().trim();
                    Tag tag = tagRepository.findByNameIgnoreCase(name)
                            .orElseGet(() -> tagRepository.save(Tag.builder()
                                    .name(name)
                                    .category("interest")
                                    .isActive(true)
                                    .build()));
                    tagId = tag.getId();
                }
                if (tagId != null) {
                    newInterests.add(ProfileInterest.builder()
                            .profileUserId(userId)
                            .tagId(tagId)
                            .priority(i.getPriority() > 0 ? i.getPriority() : (short) 3)
                            .build());
                }
            }
            profileInterestRepository.saveAll(newInterests);
        }

        clearCache(userId);
        return getNetworkingProfile(userId);
    }

    @Transactional(readOnly = true)
    public List<PartnerSuggestionDto> suggestPartners(UUID currentUserId) {
        CacheEntry cached = SUGGESTIONS_CACHE.get(currentUserId);
        if (cached != null && !cached.isExpired()) {
            return cached.data;
        }

        Profile currentProfile = profileRepository.findById(currentUserId).orElse(null);

        // Batch preload skills and interests grouped by userId (replaces N+1 queries)
        Map<UUID, List<ProfileSkill>> skillsByUserId = profileSkillRepository.findAll().stream()
                .collect(Collectors.groupingBy(ProfileSkill::getProfileUserId));
        Map<UUID, List<ProfileInterest>> interestsByUserId = profileInterestRepository.findAll().stream()
                .collect(Collectors.groupingBy(ProfileInterest::getProfileUserId));

        List<ProfileSkill> mySkills = skillsByUserId.getOrDefault(currentUserId, List.of());
        List<ProfileInterest> myInterests = interestsByUserId.getOrDefault(currentUserId, List.of());

        Set<UUID> mySkillTagIds = mySkills.stream().map(ProfileSkill::getTagId).collect(Collectors.toSet());
        Set<UUID> myInterestTagIds = myInterests.stream().map(ProfileInterest::getTagId).collect(Collectors.toSet());

        Map<UUID, Tag> tagMap = tagRepository.findAll().stream()
                .collect(Collectors.toMap(Tag::getId, Function.identity(), (a, b) -> a));
        Map<UUID, com.cospace.app.entity.PartnerConnection> connections = partnerConnectionService.connectionsByMember(currentUserId);

        // Only fellow customers are suggested as partners.
        List<User> allCandidates = userRepository.findByRole(User.Role.customer).stream()
                .filter(u -> !u.getId().equals(currentUserId)
                        && u.getStatus() == User.Status.active
                        && (u.getEmail() == null || !u.getEmail().endsWith(UserService.WALKIN_EMAIL_DOMAIN)))
                .toList();

        if (allCandidates.isEmpty()) {
            return Collections.emptyList();
        }

        Map<UUID, Profile> profileMap = profileRepository.findAll().stream()
                .collect(Collectors.toMap(Profile::getUserId, Function.identity(), (a, b) -> a));

        // What each member has publicly written about, pulled in one query.
        Map<UUID, Set<UUID>> postTagsByAuthor = new HashMap<>();
        for (Object[] pair : postTagRepository.findAuthorTagPairs()) {
            UUID authorId = (UUID) pair[0];
            UUID tagId = (UUID) pair[1];
            postTagsByAuthor.computeIfAbsent(authorId, k -> new HashSet<>()).add(tagId);
        }

        // My own posts say as much about what I'm after as my profile tags do.
        Set<UUID> myTopicTagIds = new HashSet<>(mySkillTagIds);
        myTopicTagIds.addAll(myInterestTagIds);
        myTopicTagIds.addAll(postTagsByAuthor.getOrDefault(currentUserId, Set.of()));

        List<PartnerSuggestionDto> suggestions = new ArrayList<>();
        List<ProfileMatchScore> matchScoresToSave = new ArrayList<>();

        for (User candidate : allCandidates) {
            UUID candidateId = candidate.getId();
            Profile candProfile = profileMap.get(candidateId);

            List<ProfileSkill> candSkills = skillsByUserId.getOrDefault(candidateId, List.of());
            List<ProfileInterest> candInterests = interestsByUserId.getOrDefault(candidateId, List.of());

            Set<UUID> candSkillTagIds = candSkills.stream().map(ProfileSkill::getTagId).collect(Collectors.toSet());
            Set<UUID> candInterestTagIds = candInterests.stream().map(ProfileInterest::getTagId).collect(Collectors.toSet());

            // 1. Skill Overlap (Jaccard similarity)
            Set<UUID> sharedSkills = new HashSet<>(mySkillTagIds);
            sharedSkills.retainAll(candSkillTagIds);

            Set<UUID> unionSkills = new HashSet<>(mySkillTagIds);
            unionSkills.addAll(candSkillTagIds);
            double skillRatio = unionSkills.isEmpty() ? 0.0 : (double) sharedSkills.size() / unionSkills.size();

            // 2. Interest Overlap (Jaccard similarity)
            Set<UUID> sharedInterests = new HashSet<>(myInterestTagIds);
            sharedInterests.retainAll(candInterestTagIds);

            Set<UUID> unionInterests = new HashSet<>(myInterestTagIds);
            unionInterests.addAll(candInterestTagIds);
            double interestRatio = unionInterests.isEmpty() ? 0.0 : (double) sharedInterests.size() / unionInterests.size();

            // 3. Same Branch Bonus (Rule #18: +0.15)
            boolean isSameBranch = false;
            if (currentProfile != null && currentProfile.getPrimaryBranchId() != null
                    && candProfile != null && candProfile.getPrimaryBranchId() != null) {
                isSameBranch = currentProfile.getPrimaryBranchId().equals(candProfile.getPrimaryBranchId());
            } else if (candidate.getBranchId() != null && currentProfile != null && currentProfile.getPrimaryBranchId() != null) {
                isSameBranch = currentProfile.getPrimaryBranchId().equals(candidate.getBranchId());
            }

            double branchBonus = isSameBranch ? 0.15 : 0.0;

            // 4. Post affinity
            Set<UUID> candPostTagIds = postTagsByAuthor.getOrDefault(candidateId, Set.of());
            Set<UUID> sharedPostTags = new HashSet<>(candPostTagIds);
            sharedPostTags.retainAll(myTopicTagIds);
            double postRatio = candPostTagIds.isEmpty() || myTopicTagIds.isEmpty()
                    ? 0.0
                    : (double) sharedPostTags.size() / Math.min(candPostTagIds.size(), myTopicTagIds.size());

            // Weights: skills 0.5, interests 0.2, posts 0.2
            double weightedSum = 0.0;
            double availableWeight = 0.0;
            if (!mySkillTagIds.isEmpty() && !candSkillTagIds.isEmpty()) {
                weightedSum += skillRatio * 0.5;
                availableWeight += 0.5;
            }
            if (!myInterestTagIds.isEmpty() && !candInterestTagIds.isEmpty()) {
                weightedSum += interestRatio * 0.2;
                availableWeight += 0.2;
            }
            if (!myTopicTagIds.isEmpty() && !candPostTagIds.isEmpty()) {
                weightedSum += postRatio * 0.2;
                availableWeight += 0.2;
            }

            double totalScore = availableWeight == 0.0 ? 0.0 : (weightedSum / availableWeight);
            totalScore += branchBonus;
            if (totalScore > 1.0) totalScore = 1.0;

            // Filter out candidates with zero score if user has anything to match on
            if (totalScore <= 0.0
                    && (!mySkillTagIds.isEmpty() || !myInterestTagIds.isEmpty() || !myTopicTagIds.isEmpty())) {
                continue;
            }

            int scorePercent = (int) Math.round(totalScore * 100);

            // Extract common tags
            List<String> commonTags = new ArrayList<>();
            for (UUID tagId : sharedSkills) {
                Tag tag = tagMap.get(tagId);
                if (tag != null) commonTags.add(tag.getName());
            }
            for (UUID tagId : sharedInterests) {
                Tag tag = tagMap.get(tagId);
                if (tag != null && !commonTags.contains(tag.getName())) commonTags.add(tag.getName());
            }

            List<String> sharedPostTagNames = new ArrayList<>();
            for (UUID tagId : sharedPostTags) {
                Tag tag = tagMap.get(tagId);
                if (tag == null) continue;
                sharedPostTagNames.add(tag.getName());
                if (!commonTags.contains(tag.getName())) commonTags.add(tag.getName());
            }

            if (commonTags.isEmpty()) {
                for (UUID tagId : candSkillTagIds) {
                    Tag tag = tagMap.get(tagId);
                    if (tag != null) commonTags.add(tag.getName());
                    if (commonTags.size() >= 3) break;
                }
            }

            boolean contactPublic = candProfile != null && candProfile.isContactPublic();
            com.cospace.app.entity.PartnerConnection connection = connections.get(candidateId);
            String connectionState = connection == null ? com.cospace.app.dto.api.ConnectionDto.STATE_NONE
                    : PartnerConnectionService.stateFor(currentUserId, connection);
            boolean contactVisible = contactPublic || com.cospace.app.dto.api.ConnectionDto.STATE_CONNECTED.equals(connectionState);
            String email = (candProfile != null && contactVisible) ? (candProfile.getContactEmail() != null ? candProfile.getContactEmail() : candidate.getEmail()) : null;
            String phone = (candProfile != null && contactVisible) ? (candProfile.getContactPhone() != null ? candProfile.getContactPhone() : candidate.getPhone()) : null;

            String avatar = (candidate.getAvatarUrl() != null && !candidate.getAvatarUrl().isBlank())
                    ? candidate.getAvatarUrl()
                    : (candidate.getFullName() != null && !candidate.getFullName().isBlank()
                    ? String.valueOf(candidate.getFullName().charAt(0)).toUpperCase()
                    : "U");

            String profession = candProfile != null && candProfile.getProfession() != null ? candProfile.getProfession() : "Thành viên CoSpace";
            String company = candProfile != null && candProfile.getCompany() != null ? candProfile.getCompany() : "Freelancer";
            String bio = candProfile != null && candProfile.getBio() != null ? candProfile.getBio() : "";

            Map<String, String> links = candProfile != null && contactVisible
                    ? PartnerConnectionService.parseLinks(candProfile.getContactLink()) : Map.of();
            String candLinkedin = links.get("linkedin");
            String candGithub = links.get("github");

            suggestions.add(PartnerSuggestionDto.builder()
                    .id(candidateId.toString())
                    .name(candidate.getFullName())
                    .profession(profession)
                    .company(company)
                    .avatar(avatar)
                    .matchScore(scorePercent)
                    .commonTags(commonTags)
                    .contactPublic(contactPublic)
                    .contactVisible(contactVisible)
                    .connectionState(connectionState)
                    .connectionId(connection != null && !com.cospace.app.dto.api.ConnectionDto.STATE_NONE.equals(connectionState)
                            ? connection.getId().toString() : null)
                    .email(email)
                    .phone(phone)
                    .bio(bio)
                    .linkedin(candLinkedin)
                    .github(candGithub)
                    .isSameBranch(isSameBranch)
                    .postTags(sharedPostTagNames)
                    .build());

            // Collect match score record for batch save
            if (profileMap.containsKey(currentUserId) && profileMap.containsKey(candidateId)) {
                Map<String, Object> reasons = new HashMap<>();
                reasons.put("sharedSkillsCount", sharedSkills.size());
                reasons.put("sharedInterestsCount", sharedInterests.size());
                reasons.put("sharedPostTagsCount", sharedPostTags.size());
                reasons.put("isSameBranch", isSameBranch);
                reasons.put("scorePercent", scorePercent);

                ProfileMatchScore matchScoreRecord = ProfileMatchScore.builder()
                        .profileUserId(currentUserId)
                        .matchedUserId(candidateId)
                        .score(BigDecimal.valueOf(totalScore).setScale(4, RoundingMode.HALF_UP))
                        .reasonsJson(reasons)
                        .computedAt(OffsetDateTime.now(ZoneOffset.UTC))
                        .build();
                matchScoresToSave.add(matchScoreRecord);
            }
        }

        // Batch save match scores asynchronously without blocking user request
        if (!matchScoresToSave.isEmpty()) {
            java.util.concurrent.CompletableFuture.runAsync(() -> {
                try {
                    profileMatchScoreRepository.saveAll(matchScoresToSave);
                } catch (Exception e) {
                    log.warn("Async persist profile_match_scores failed: {}", e.getMessage());
                }
            });
        }

        // Sort descending by matchScore
        suggestions.sort((a, b) -> Integer.compare(b.getMatchScore(), a.getMatchScore()));

        // Limit top 20
        List<PartnerSuggestionDto> top = suggestions.size() > 20 ? suggestions.subList(0, 20) : suggestions;
        attachMatchReasons(top);

        SUGGESTIONS_CACHE.put(currentUserId, new CacheEntry(top, SUGGESTIONS_CACHE_TTL));
        return top;
    }

    /**
     * Writes the one-line "why you two should meet" shown on each suggestion.
     * Uses in-memory cache and immediate fallback reasons so the HTTP response is instantaneous,
     * while enriching with Gemini in the background asynchronously if configured.
     */
    private void attachMatchReasons(List<PartnerSuggestionDto> suggestions) {
        if (suggestions == null || suggestions.isEmpty()) {
            return;
        }

        List<PartnerSuggestionDto> needsAiGeneration = new ArrayList<>();
        for (PartnerSuggestionDto s : suggestions) {
            String cacheKey = getReasonCacheKey(s);
            String cached = MATCH_REASON_CACHE.get(cacheKey);
            if (cached != null) {
                s.setMatchReason(cached);
            } else {
                s.setMatchReason(fallbackReason(s));
                needsAiGeneration.add(s);
            }
        }

        if (!geminiClient.isConfigured() || needsAiGeneration.isEmpty()) {
            return;
        }

        List<PartnerSuggestionDto> shortlist = needsAiGeneration.size() > REASONED_SUGGESTIONS
                ? needsAiGeneration.subList(0, REASONED_SUGGESTIONS)
                : needsAiGeneration;

        // Run Gemini enrichment asynchronously so user request returns immediately without blocking
        java.util.concurrent.CompletableFuture.runAsync(() -> {
            try {
                StringBuilder prompt = new StringBuilder();
                for (int i = 0; i < shortlist.size(); i++) {
                    PartnerSuggestionDto s = shortlist.get(i);
                    prompt.append(i + 1).append(". ").append(s.getName())
                            .append(" — ").append(s.getProfession()).append(" tại ").append(s.getCompany())
                            .append("; điểm chung: ").append(String.join(", ", s.getCommonTags()));
                    if (s.getPostTags() != null && !s.getPostTags().isEmpty()) {
                        prompt.append("; đã viết bài về: ").append(String.join(", ", s.getPostTags()));
                    }
                    prompt.append('\n');
                }

                String systemPrompt = "Bạn giúp thành viên CoSpace hiểu vì sao nên kết nối với từng người được gợi ý. "
                        + "Với mỗi người trong danh sách, viết đúng MỘT câu tiếng Việt ngắn (tối đa 20 từ) "
                        + "nêu lý do nên kết nối, dựa trên điểm chung và chủ đề họ đã viết. "
                        + "Trả về mỗi người một dòng theo đúng thứ tự, bắt đầu bằng số thứ tự và dấu chấm. "
                        + "Không thêm tiêu đề hay giải thích nào khác.";

                JsonNode response = geminiClient.generateContent(
                        systemPrompt,
                        List.of(Map.of("role", "user", "parts", List.of(Map.of("text", prompt.toString())))),
                        null);

                StringBuilder reply = new StringBuilder();
                for (JsonNode part : response.path("candidates").path(0).path("content").path("parts")) {
                    if (part.has("text")) reply.append(part.get("text").asText()).append('\n');
                }

                for (String line : reply.toString().split("\\R")) {
                    String trimmed = line.trim();
                    if (trimmed.isEmpty()) continue;
                    java.util.regex.Matcher m = REASON_LINE.matcher(trimmed);
                    if (!m.matches()) continue;
                    int index = Integer.parseInt(m.group(1)) - 1;
                    String text = m.group(2).trim();
                    if (index >= 0 && index < shortlist.size() && !text.isEmpty()) {
                        PartnerSuggestionDto s = shortlist.get(index);
                        MATCH_REASON_CACHE.put(getReasonCacheKey(s), text);
                    }
                }
            } catch (Exception e) {
                log.warn("Async Gemini match-reason generation failed: {}", e.getMessage());
            }
        });
    }

    private String getReasonCacheKey(PartnerSuggestionDto s) {
        String common = s.getCommonTags() != null ? String.join(",", s.getCommonTags()) : "";
        String post = s.getPostTags() != null ? String.join(",", s.getPostTags()) : "";
        return s.getId() + "_" + s.isSameBranch() + "_" + common + "_" + post;
    }

    private String fallbackReason(PartnerSuggestionDto s) {
        List<String> tags = s.getCommonTags();
        if (tags != null && !tags.isEmpty()) {
            String joined = String.join(", ", tags.size() > 3 ? tags.subList(0, 3) : tags);
            return s.isSameBranch()
                    ? "Cùng chi nhánh và cùng quan tâm " + joined + "."
                    : "Cùng quan tâm " + joined + ".";
        }
        return s.isSameBranch()
                ? "Cùng làm việc tại chi nhánh của bạn."
                : "Có thể mở rộng mạng lưới của bạn.";
    }
}
