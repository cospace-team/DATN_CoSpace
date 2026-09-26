package com.cospace.app.service;

import com.cospace.app.dto.api.ConnectionDto;
import com.cospace.app.entity.PartnerConnection;
import com.cospace.app.entity.Profile;
import com.cospace.app.entity.ProfileSkill;
import com.cospace.app.entity.User;
import com.cospace.app.repository.BranchEntityRepository;
import com.cospace.app.repository.PartnerConnectionRepository;
import com.cospace.app.repository.ProfileRepository;
import com.cospace.app.repository.ProfileSkillRepository;
import com.cospace.app.repository.TagRepository;
import com.cospace.app.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Connections between members: one sends a request, the other accepts or declines it. Contact
 * details a member keeps private are only shown to the members they are connected with.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PartnerConnectionService {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    /** How long a member must wait before inviting someone who declined them again. */
    static final long RESEND_AFTER_DECLINE_DAYS = 7;

    private final PartnerConnectionRepository connectionRepository;
    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;
    private final ProfileSkillRepository profileSkillRepository;
    private final TagRepository tagRepository;
    private final BranchEntityRepository branchRepository;
    private final NotificationService notificationService;

    /* ─────────────── Requests ─────────────── */

    /**
     * Sends a connection request. If the other member had already invited the sender, this accepts
     * their request instead; a declined request can be sent again.
     */
    @Transactional
    public ConnectionDto.MemberProfile send(UUID requesterId, UUID addresseeId, String message) {
        if (requesterId.equals(addresseeId)) {
            throw new IllegalArgumentException("Bạn không thể kết nối với chính mình.");
        }
        User addressee = userRepository.findById(addresseeId)
                .filter(PartnerConnectionService::isNetworkingMember)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thành viên."));
        User requester = requireUser(requesterId);
        if (!isNetworkingMember(requester)) {
            throw new AccessDeniedException("Chỉ thành viên khách hàng mới dùng được mạng lưới kết nối.");
        }
        String note = message == null || message.isBlank() ? null : message.trim();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        PartnerConnection existing = connectionRepository.findBetween(requesterId, addresseeId).orElse(null);
        if (existing != null && PartnerConnection.STATUS_ACCEPTED.equals(existing.getStatus())) {
            throw new IllegalStateException("Hai bạn đã kết nối với nhau.");
        }
        if (existing != null && PartnerConnection.STATUS_PENDING.equals(existing.getStatus())) {
            if (existing.getRequesterId().equals(requesterId)) {
                throw new IllegalStateException("Bạn đã gửi lời mời kết nối, vui lòng chờ phản hồi.");
            }
            // They invited us first: sending back means yes.
            accept(existing, now);
            return profileFor(requesterId, addresseeId);
        }

        if (existing != null && PartnerConnection.STATUS_DECLINED.equals(existing.getStatus())
                && existing.getRequesterId().equals(requesterId) && existing.getRespondedAt() != null
                && existing.getRespondedAt().isAfter(now.minusDays(RESEND_AFTER_DECLINE_DAYS))) {
            // Otherwise a declined member could be sent the same request (and notification) again and again.
            throw new IllegalStateException("Bạn chưa thể gửi lại lời mời cho thành viên này lúc này. Vui lòng thử lại sau.");
        }

        PartnerConnection connection = existing != null ? existing : new PartnerConnection();
        connection.setRequesterId(requesterId);
        connection.setAddresseeId(addresseeId);
        connection.setStatus(PartnerConnection.STATUS_PENDING);
        connection.setMessage(note);
        connection.setRespondedAt(null);
        connection = connectionRepository.save(connection);

        notificationService.createNotification(addressee.getId(),
                "Lời mời kết nối mới",
                displayName(requester) + " muốn kết nối với bạn." + (note != null ? " Lời nhắn: \"" + note + "\"" : "")
                        + " Xem hồ sơ và phản hồi trong mục Mạng lưới kết nối.",
                "PARTNER_MATCH", connection.getId(), "CONNECTION");
        return profileFor(requesterId, addresseeId);
    }

    @Transactional
    public ConnectionDto.MemberProfile respond(UUID userId, UUID connectionId, boolean accept) {
        PartnerConnection connection = connectionRepository.findById(connectionId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy lời mời kết nối."));
        if (!connection.getAddresseeId().equals(userId)) {
            throw new AccessDeniedException("Bạn không thể phản hồi lời mời này.");
        }
        if (!PartnerConnection.STATUS_PENDING.equals(connection.getStatus())) {
            throw new IllegalStateException("Lời mời này đã được phản hồi.");
        }
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        if (accept) {
            accept(connection, now);
        } else {
            // The requester is not told about a decline, only that the request is no longer pending.
            connection.setStatus(PartnerConnection.STATUS_DECLINED);
            connection.setRespondedAt(now);
            connectionRepository.save(connection);
        }
        return profileFor(userId, connection.getRequesterId());
    }

    /** Withdraws a request the caller sent, or removes an existing connection. */
    @Transactional
    public void remove(UUID userId, UUID connectionId) {
        PartnerConnection connection = connectionRepository.findById(connectionId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy kết nối."));
        boolean ownRequest = connection.getRequesterId().equals(userId)
                && PartnerConnection.STATUS_PENDING.equals(connection.getStatus());
        boolean connected = PartnerConnection.STATUS_ACCEPTED.equals(connection.getStatus())
                && (connection.getRequesterId().equals(userId) || connection.getAddresseeId().equals(userId));
        if (!ownRequest && !connected) {
            throw new AccessDeniedException("Bạn không thể xóa kết nối này.");
        }
        connectionRepository.delete(connection);
    }

    private void accept(PartnerConnection connection, OffsetDateTime now) {
        connection.setStatus(PartnerConnection.STATUS_ACCEPTED);
        connection.setRespondedAt(now);
        connectionRepository.save(connection);
        User addressee = requireUser(connection.getAddresseeId());
        notificationService.createNotification(connection.getRequesterId(),
                "Lời mời kết nối đã được chấp nhận",
                displayName(addressee) + " đã chấp nhận kết nối. Bạn có thể xem thông tin liên hệ trong hồ sơ của họ.",
                "PARTNER_MATCH", connection.getId(), "CONNECTION");
    }

    /* ─────────────── Reads ─────────────── */

    @Transactional(readOnly = true)
    public ConnectionDto.Overview overview(UUID userId) {
        List<PartnerConnection> all = connectionRepository.findAllInvolving(userId).stream()
                .filter(c -> !ConnectionDto.STATE_NONE.equals(stateFor(userId, c)))
                .toList();
        // Load every counterpart's user, profile and skills in a few queries instead of per connection.
        List<UUID> memberIds = all.stream().map(c -> c.otherThan(userId)).distinct().toList();
        ProfileData data = loadProfileData(memberIds);

        List<ConnectionDto.ConnectionItem> incoming = new ArrayList<>();
        List<ConnectionDto.ConnectionItem> outgoing = new ArrayList<>();
        List<ConnectionDto.ConnectionItem> connected = new ArrayList<>();
        for (PartnerConnection c : all) {
            UUID memberId = c.otherThan(userId);
            User member = data.users().get(memberId);
            if (member == null) continue;
            String state = stateFor(userId, c);
            ConnectionDto.ConnectionItem item = ConnectionDto.ConnectionItem.builder()
                    .id(c.getId())
                    .state(state)
                    .message(c.getMessage())
                    .createdAt(c.getCreatedAt())
                    .respondedAt(c.getRespondedAt())
                    .member(buildProfile(member, data.profiles().get(memberId), data.skills().getOrDefault(memberId, List.of()),
                            c, state))
                    .build();
            switch (state) {
                case ConnectionDto.STATE_INCOMING -> incoming.add(item);
                case ConnectionDto.STATE_OUTGOING -> outgoing.add(item);
                default -> connected.add(item);
            }
        }
        return ConnectionDto.Overview.builder().incoming(incoming).outgoing(outgoing).connected(connected).build();
    }

    private record ProfileData(Map<UUID, User> users, Map<UUID, Profile> profiles, Map<UUID, List<String>> skills) {
    }

    private ProfileData loadProfileData(List<UUID> memberIds) {
        if (memberIds.isEmpty()) return new ProfileData(Map.of(), Map.of(), Map.of());
        Map<UUID, User> users = new HashMap<>();
        userRepository.findAllById(memberIds).forEach(u -> users.put(u.getId(), u));
        Map<UUID, Profile> profiles = new HashMap<>();
        profileRepository.findAllById(memberIds).forEach(p -> profiles.put(p.getUserId(), p));
        List<ProfileSkill> skillRows = profileSkillRepository.findByProfileUserIdIn(memberIds);
        Map<UUID, String> tagNames = new HashMap<>();
        tagRepository.findAllById(skillRows.stream().map(ProfileSkill::getTagId).distinct().toList())
                .forEach(t -> tagNames.put(t.getId(), t.getName()));
        Map<UUID, List<String>> skills = new HashMap<>();
        for (ProfileSkill row : skillRows) {
            String name = tagNames.get(row.getTagId());
            if (name != null) skills.computeIfAbsent(row.getProfileUserId(), k -> new ArrayList<>()).add(name);
        }
        skills.values().forEach(list -> list.sort(null));
        return new ProfileData(users, profiles, skills);
    }

    /** Another member's profile, with contact details only if they are public or the two are connected. */
    @Transactional(readOnly = true)
    public ConnectionDto.MemberProfile profileFor(UUID viewerId, UUID memberId) {
        User member = requireUser(memberId);
        // Staff and admins are not part of the networking directory (same rule as the suggestions).
        if (!viewerId.equals(memberId) && !isNetworkingMember(member)) {
            throw new IllegalArgumentException("Không tìm thấy thành viên.");
        }
        PartnerConnection c = viewerId.equals(memberId) ? null : connectionRepository.findBetween(viewerId, memberId).orElse(null);
        ProfileData data = loadProfileData(List.of(memberId));
        return buildProfile(member, data.profiles().get(memberId), data.skills().getOrDefault(memberId, List.of()),
                c, c == null ? ConnectionDto.STATE_NONE : stateFor(viewerId, c));
    }

    /** Connection state and id towards every member the viewer has a live connection or request with. */
    @Transactional(readOnly = true)
    public Map<UUID, PartnerConnection> connectionsByMember(UUID viewerId) {
        Map<UUID, PartnerConnection> map = new HashMap<>();
        for (PartnerConnection c : connectionRepository.findAllInvolving(viewerId)) {
            if (!ConnectionDto.STATE_NONE.equals(stateFor(viewerId, c))) {
                map.put(c.otherThan(viewerId), c);
            }
        }
        return map;
    }

    /** A declined request looks like no connection to both sides, so it can be sent again. */
    public static String stateFor(UUID viewerId, PartnerConnection c) {
        if (PartnerConnection.STATUS_ACCEPTED.equals(c.getStatus())) return ConnectionDto.STATE_CONNECTED;
        if (PartnerConnection.STATUS_PENDING.equals(c.getStatus())) {
            return c.getRequesterId().equals(viewerId) ? ConnectionDto.STATE_OUTGOING : ConnectionDto.STATE_INCOMING;
        }
        return ConnectionDto.STATE_NONE;
    }

    private ConnectionDto.MemberProfile buildProfile(User member, Profile profile, List<String> skills,
                                                     PartnerConnection connection, String state) {
        UUID memberId = member.getId();
        boolean contactPublic = profile != null && profile.isContactPublic();
        boolean contactVisible = contactPublic || ConnectionDto.STATE_CONNECTED.equals(state);

        ConnectionDto.MemberProfile.MemberProfileBuilder b = ConnectionDto.MemberProfile.builder()
                .userId(memberId)
                .name(displayName(member))
                .avatarUrl(member.getAvatarUrl())
                .profession(profile != null ? profile.getProfession() : null)
                .company(profile != null ? profile.getCompany() : null)
                .bio(profile != null ? profile.getBio() : null)
                .skills(skills)
                .branchName(profile != null && profile.getPrimaryBranchId() != null
                        ? branchRepository.findById(profile.getPrimaryBranchId()).map(br -> br.getName()).orElse(null) : null)
                .memberSince(member.getCreatedAt())
                .connectionState(state)
                .connectionId(ConnectionDto.STATE_NONE.equals(state) || connection == null ? null : connection.getId())
                .connectionMessage(connection != null && !ConnectionDto.STATE_NONE.equals(state) ? connection.getMessage() : null)
                .contactPublic(contactPublic)
                .contactVisible(contactVisible);

        if (contactVisible) {
            b.email(profile != null && profile.getContactEmail() != null ? profile.getContactEmail() : member.getEmail());
            b.phone(profile != null && profile.getContactPhone() != null ? profile.getContactPhone() : member.getPhone());
            Map<String, String> links = parseLinks(profile != null ? profile.getContactLink() : null);
            b.linkedin(links.get("linkedin")).github(links.get("github")).facebook(links.get("facebook")).website(links.get("website"));
        }
        return b.build();
    }

    /** contact_link holds either a JSON object of social links or, in older rows, a single URL. */
    static Map<String, String> parseLinks(String raw) {
        Map<String, String> links = new HashMap<>();
        if (raw == null || raw.isBlank()) return links;
        String trimmed = raw.trim();
        if (!trimmed.startsWith("{")) {
            links.put("website", trimmed);
            return links;
        }
        try {
            JsonNode node = MAPPER.readTree(trimmed);
            for (String key : List.of("linkedin", "github", "facebook", "website")) {
                String value = node.path(key).asText("");
                if (!value.isBlank()) links.put(key, value.trim());
            }
        } catch (Exception e) {
            log.debug("Unreadable contact_link JSON: {}", e.getMessage());
        }
        return links;
    }

    /** Active customers who signed up themselves; walk-in guests created at the counter are excluded. */
    static boolean isNetworkingMember(User u) {
        return u.getStatus() == User.Status.active
                && u.getRole() == User.Role.customer
                && (u.getEmail() == null || !u.getEmail().endsWith(UserService.WALKIN_EMAIL_DOMAIN));
    }

    private User requireUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thành viên."));
    }

    private static String displayName(User user) {
        return Objects.requireNonNullElse(user.getFullName(), "Thành viên CoSpace");
    }
}
