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

    private final ProfileRepository profileRepository;
    private final ProfileSkillRepository profileSkillRepository;
    private final ProfileInterestRepository profileInterestRepository;
    private final ProfileMatchScoreRepository profileMatchScoreRepository;
    private final TagRepository tagRepository;
    private final UserRepository userRepository;
    private final PostTagRepository postTagRepository;
    private final GeminiClient geminiClient;

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
        profile.setContactPhone(req.getContactPhone() != null ? req.getContactPhone() : user.getPhone());
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

        return getNetworkingProfile(userId);
    }

    @Transactional
    public List<PartnerSuggestionDto> suggestPartners(UUID currentUserId) {
        Profile currentProfile = profileRepository.findById(currentUserId).orElse(null);
        List<ProfileSkill> mySkills = profileSkillRepository.findByProfileUserId(currentUserId);
        List<ProfileInterest> myInterests = profileInterestRepository.findByProfileUserId(currentUserId);

        Set<UUID> mySkillTagIds = mySkills.stream().map(ProfileSkill::getTagId).collect(Collectors.toSet());
        Set<UUID> myInterestTagIds = myInterests.stream().map(ProfileInterest::getTagId).collect(Collectors.toSet());

        Map<UUID, Tag> tagMap = tagRepository.findAll().stream()
                .collect(Collectors.toMap(Tag::getId, Function.identity(), (a, b) -> a));

        // Only fellow customers are suggested as partners. Staff and admins work here, they did not
        // sign up for networking, and a same-branch bonus alone was enough to surface every
        // colleague of the viewer's branch by name. Walk-in guests never signed up at all.
        List<User> allCandidates = userRepository.findAll().stream()
                .filter(u -> !u.getId().equals(currentUserId)
                        && u.getStatus() == User.Status.active
                        && u.getRole() == User.Role.customer
                        && (u.getEmail() == null || !u.getEmail().endsWith(UserService.WALKIN_EMAIL_DOMAIN)))
                .toList();

        if (allCandidates.isEmpty()) {
            return Collections.emptyList();
        }

        Map<UUID, Profile> profileMap = profileRepository.findAll().stream()
                .collect(Collectors.toMap(Profile::getUserId, Function.identity(), (a, b) -> a));

        // What each member has publicly written about, pulled in one query. A post is the freshest
        // signal of what someone is working on right now, so it counts alongside their static tags.
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

        for (User candidate : allCandidates) {
            UUID candidateId = candidate.getId();
            Profile candProfile = profileMap.get(candidateId);

            List<ProfileSkill> candSkills = profileSkillRepository.findByProfileUserId(candidateId);
            List<ProfileInterest> candInterests = profileInterestRepository.findByProfileUserId(candidateId);

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

            // 4. Post affinity: what this candidate has actually written about, against everything
            // I care about (my skills, interests and my own posts).
            Set<UUID> candPostTagIds = postTagsByAuthor.getOrDefault(candidateId, Set.of());
            Set<UUID> sharedPostTags = new HashSet<>(candPostTagIds);
            sharedPostTags.retainAll(myTopicTagIds);
            double postRatio = candPostTagIds.isEmpty() || myTopicTagIds.isEmpty()
                    ? 0.0
                    : (double) sharedPostTags.size() / Math.min(candPostTagIds.size(), myTopicTagIds.size());

            // Weights: skills 0.5, interests 0.2, posts 0.2 — but only over the signals both sides
            // actually have. A member who hasn't filled in skills yet still gets a meaningful score
            // from what they've written, instead of being capped at the posts weight alone.
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

            // The score is reported as it is: a floor of 10% made unrelated members look like a
            // partial match, which is exactly what this screen is supposed to tell apart.
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

            // Topics they've posted about that I also care about — surfaced separately so the UI
            // can say "đã viết về ..." rather than lumping it in with static profile tags.
            List<String> sharedPostTagNames = new ArrayList<>();
            for (UUID tagId : sharedPostTags) {
                Tag tag = tagMap.get(tagId);
                if (tag == null) continue;
                sharedPostTagNames.add(tag.getName());
                if (!commonTags.contains(tag.getName())) commonTags.add(tag.getName());
            }

            // Also include candidate's primary tags if common tags empty
            if (commonTags.isEmpty()) {
                for (UUID tagId : candSkillTagIds) {
                    Tag tag = tagMap.get(tagId);
                    if (tag != null) commonTags.add(tag.getName());
                    if (commonTags.size() >= 3) break;
                }
            }

            boolean contactPublic = candProfile != null && candProfile.isContactPublic();
            String email = (candProfile != null && contactPublic) ? (candProfile.getContactEmail() != null ? candProfile.getContactEmail() : candidate.getEmail()) : null;
            String phone = (candProfile != null && contactPublic) ? (candProfile.getContactPhone() != null ? candProfile.getContactPhone() : candidate.getPhone()) : null;

            String avatar = (candidate.getAvatarUrl() != null && !candidate.getAvatarUrl().isBlank())
                    ? candidate.getAvatarUrl()
                    : (candidate.getFullName() != null && !candidate.getFullName().isBlank()
                    ? String.valueOf(candidate.getFullName().charAt(0)).toUpperCase()
                    : "U");

            String profession = candProfile != null && candProfile.getProfession() != null ? candProfile.getProfession() : "Thành viên CoSpace";
            String company = candProfile != null && candProfile.getCompany() != null ? candProfile.getCompany() : "Freelancer";
            String bio = candProfile != null && candProfile.getBio() != null ? candProfile.getBio() : "";

            String candLinkedin = null;
            String candGithub = null;
            if (candProfile != null && contactPublic && candProfile.getContactLink() != null) {
                String rawLink = candProfile.getContactLink().trim();
                if (rawLink.startsWith("{")) {
                    try {
                        JsonNode linkNode = new com.fasterxml.jackson.databind.ObjectMapper().readTree(rawLink);
                        candLinkedin = linkNode.path("linkedin").asText(null);
                        candGithub = linkNode.path("github").asText(null);
                    } catch (Exception e) {
                        candLinkedin = rawLink;
                    }
                } else {
                    candLinkedin = rawLink;
                }
            }

            suggestions.add(PartnerSuggestionDto.builder()
                    .id(candidateId.toString())
                    .name(candidate.getFullName())
                    .profession(profession)
                    .company(company)
                    .avatar(avatar)
                    .matchScore(scorePercent)
                    .commonTags(commonTags)
                    .contactPublic(contactPublic)
                    .email(email)
                    .phone(phone)
                    .bio(bio)
                    .linkedin(candLinkedin)
                    .github(candGithub)
                    .isSameBranch(isSameBranch)
                    .postTags(sharedPostTagNames)
                    .build());

            // Save match score record
            // profile_match_scores FKs both sides to profiles, and a member only gets a profiles
            // row once they save a networking profile. Skipping the cache write for members
            // without one keeps suggestions working for everyone else — a constraint violation
            // here would poison the whole transaction and fail the request at commit, where the
            // catch below can no longer help.
            if (profileMap.containsKey(currentUserId) && profileMap.containsKey(candidateId)) {
                try {
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
                    profileMatchScoreRepository.save(matchScoreRecord);
                } catch (Exception e) {
                    log.warn("Failed to persist profile_match_scores: {}", e.getMessage());
                }
            }
        }

        // Sort descending by matchScore
        suggestions.sort((a, b) -> Integer.compare(b.getMatchScore(), a.getMatchScore()));

        // Limit top 20
        List<PartnerSuggestionDto> top = suggestions.size() > 20 ? suggestions.subList(0, 20) : suggestions;
        attachMatchReasons(top);
        return top;
    }

    /**
     * Writes the one-line "why you two should meet" shown on each suggestion. Gemini gets the whole
     * shortlist in a single call (per-person calls would multiply latency and quota), and every
     * suggestion falls back to a sentence built from the shared tags if AI is unavailable.
     */
    private void attachMatchReasons(List<PartnerSuggestionDto> suggestions) {
        for (PartnerSuggestionDto s : suggestions) {
            s.setMatchReason(fallbackReason(s));
        }
        if (suggestions.isEmpty() || !geminiClient.isConfigured()) {
            return;
        }

        List<PartnerSuggestionDto> shortlist = suggestions.size() > REASONED_SUGGESTIONS
                ? suggestions.subList(0, REASONED_SUGGESTIONS)
                : suggestions;
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
                    shortlist.get(index).setMatchReason(text);
                }
            }
        } catch (Exception e) {
            log.warn("Gemini match-reason generation failed, keeping tag-based reasons: {}", e.getMessage());
        }
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
