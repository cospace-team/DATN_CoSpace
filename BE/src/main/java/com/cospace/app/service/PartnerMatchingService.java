package com.cospace.app.service;

import com.cospace.app.dto.api.NetworkingProfileDto;
import com.cospace.app.dto.api.PartnerSuggestionDto;
import com.cospace.app.entity.Profile;
import com.cospace.app.entity.ProfileInterest;
import com.cospace.app.entity.ProfileMatchScore;
import com.cospace.app.entity.ProfileSkill;
import com.cospace.app.entity.Tag;
import com.cospace.app.entity.User;
import com.cospace.app.repository.ProfileInterestRepository;
import com.cospace.app.repository.ProfileMatchScoreRepository;
import com.cospace.app.repository.ProfileRepository;
import com.cospace.app.repository.ProfileSkillRepository;
import com.cospace.app.repository.TagRepository;
import com.cospace.app.repository.UserRepository;
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

    private final ProfileRepository profileRepository;
    private final ProfileSkillRepository profileSkillRepository;
    private final ProfileInterestRepository profileInterestRepository;
    private final ProfileMatchScoreRepository profileMatchScoreRepository;
    private final TagRepository tagRepository;
    private final UserRepository userRepository;

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
            List<ProfileSkill> newSkills = req.getSkills().stream()
                    .filter(s -> s.getTagId() != null)
                    .map(s -> ProfileSkill.builder()
                            .profileUserId(userId)
                            .tagId(s.getTagId())
                            .level(s.getLevel() > 0 ? s.getLevel() : (short) 3)
                            .build())
                    .toList();
            profileSkillRepository.saveAll(newSkills);
        }

        // Update Interests
        profileInterestRepository.deleteByProfileUserId(userId);
        if (req.getInterests() != null) {
            List<ProfileInterest> newInterests = req.getInterests().stream()
                    .filter(i -> i.getTagId() != null)
                    .map(i -> ProfileInterest.builder()
                            .profileUserId(userId)
                            .tagId(i.getTagId())
                            .priority(i.getPriority() > 0 ? i.getPriority() : (short) 3)
                            .build())
                    .toList();
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

        List<User> allCandidates = userRepository.findAll().stream()
                .filter(u -> !u.getId().equals(currentUserId) && u.getStatus() == User.Status.active)
                .toList();

        if (allCandidates.isEmpty()) {
            return Collections.emptyList();
        }

        Map<UUID, Profile> profileMap = profileRepository.findAll().stream()
                .collect(Collectors.toMap(Profile::getUserId, Function.identity(), (a, b) -> a));

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

            // Score formula: (skill * 0.6) + (interest * 0.25) + branch_bonus
            double totalScore = (skillRatio * 0.6) + (interestRatio * 0.25) + branchBonus;
            if (totalScore > 1.0) totalScore = 1.0;

            // Filter out candidates with zero score if user has tags
            if (totalScore <= 0.0 && (!mySkillTagIds.isEmpty() || !myInterestTagIds.isEmpty())) {
                continue;
            }

            int scorePercent = Math.max(10, (int) Math.round(totalScore * 100));

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

            // Also include candidate's primary tags if common tags empty
            if (commonTags.isEmpty()) {
                for (UUID tagId : candSkillTagIds) {
                    Tag tag = tagMap.get(tagId);
                    if (tag != null) commonTags.add(tag.getName());
                    if (commonTags.size() >= 3) break;
                }
            }

            boolean contactPublic = candProfile != null && candProfile.isContactPublic();
            String email = contactPublic ? (candProfile.getContactEmail() != null ? candProfile.getContactEmail() : candidate.getEmail()) : null;
            String phone = contactPublic ? (candProfile.getContactPhone() != null ? candProfile.getContactPhone() : candidate.getPhone()) : null;

            String avatar = (candidate.getAvatarUrl() != null && !candidate.getAvatarUrl().isBlank())
                    ? candidate.getAvatarUrl()
                    : (candidate.getFullName() != null && !candidate.getFullName().isBlank()
                    ? String.valueOf(candidate.getFullName().charAt(0)).toUpperCase()
                    : "U");

            String profession = candProfile != null && candProfile.getProfession() != null ? candProfile.getProfession() : "Thành viên CoSpace";
            String company = candProfile != null && candProfile.getCompany() != null ? candProfile.getCompany() : "Freelancer";
            String bio = candProfile != null && candProfile.getBio() != null ? candProfile.getBio() : "";

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
                    .linkedin(candProfile != null ? candProfile.getContactLink() : null)
                    .github(null)
                    .isSameBranch(isSameBranch)
                    .build());

            // Save match score record
            try {
                Map<String, Object> reasons = new HashMap<>();
                reasons.put("sharedSkillsCount", sharedSkills.size());
                reasons.put("sharedInterestsCount", sharedInterests.size());
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

        // Sort descending by matchScore
        suggestions.sort((a, b) -> Integer.compare(b.getMatchScore(), a.getMatchScore()));

        // Limit top 20
        if (suggestions.size() > 20) {
            return suggestions.subList(0, 20);
        }
        return suggestions;
    }
}
