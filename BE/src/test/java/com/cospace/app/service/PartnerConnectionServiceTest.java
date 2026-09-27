package com.cospace.app.service;

import com.cospace.app.dto.api.ConnectionDto;
import com.cospace.app.entity.PartnerConnection;
import com.cospace.app.entity.Profile;
import com.cospace.app.entity.User;
import com.cospace.app.repository.BranchEntityRepository;
import com.cospace.app.repository.PartnerConnectionRepository;
import com.cospace.app.repository.ProfileRepository;
import com.cospace.app.repository.ProfileSkillRepository;
import com.cospace.app.repository.TagRepository;
import com.cospace.app.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PartnerConnectionServiceTest {

    @Mock
    private PartnerConnectionRepository connectionRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ProfileRepository profileRepository;
    @Mock
    private ProfileSkillRepository profileSkillRepository;
    @Mock
    private TagRepository tagRepository;
    @Mock
    private BranchEntityRepository branchRepository;
    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private PartnerConnectionService service;

    private User alice;
    private User bob;

    private User user(String name) {
        User u = User.builder().id(UUID.randomUUID()).fullName(name).email(name.toLowerCase() + "@mail.vn")
                .phone("0900000000").status(User.Status.active).role(User.Role.customer).build();
        lenient().when(userRepository.findById(u.getId())).thenReturn(Optional.of(u));
        return u;
    }

    @BeforeEach
    void setUp() {
        alice = user("Alice");
        bob = user("Bob");
        lenient().when(connectionRepository.save(any(PartnerConnection.class))).thenAnswer(inv -> {
            PartnerConnection c = inv.getArgument(0);
            if (c.getId() == null) c.setId(UUID.randomUUID());
            return c;
        });
        lenient().when(profileSkillRepository.findByProfileUserIdIn(any())).thenReturn(List.of());
        lenient().when(tagRepository.findAllById(any())).thenReturn(List.of());
    }

    private void bobHasPrivateContact() {
        lenient().when(profileRepository.findAllById(List.of(bob.getId()))).thenReturn(List.of(Profile.builder()
                .userId(bob.getId()).contactPublic(false).contactEmail("bob@work.vn")
                .contactLink("{\"linkedin\":\"https://linkedin.com/in/bob\"}").build()));
    }

    @Test
    void sendingARequestNotifiesTheOtherMemberAndKeepsContactHidden() {
        bobHasPrivateContact();
        when(connectionRepository.findBetween(alice.getId(), bob.getId())).thenReturn(Optional.empty());

        service.send(alice.getId(), bob.getId(), "Chào Bob");

        verify(notificationService).createNotification(eq(bob.getId()), anyString(), anyString(), eq("PARTNER_MATCH"), any(), eq("CONNECTION"));
    }

    @Test
    void privateContactIsOnlyShownOnceConnected() {
        bobHasPrivateContact();
        PartnerConnection pending = PartnerConnection.builder().id(UUID.randomUUID())
                .requesterId(alice.getId()).addresseeId(bob.getId()).status(PartnerConnection.STATUS_PENDING).build();
        when(connectionRepository.findBetween(alice.getId(), bob.getId())).thenReturn(Optional.of(pending));

        ConnectionDto.MemberProfile before = service.profileFor(alice.getId(), bob.getId());
        assertThat(before.getConnectionState()).isEqualTo(ConnectionDto.STATE_OUTGOING);
        assertThat(before.isContactVisible()).isFalse();
        assertThat(before.getEmail()).isNull();

        pending.setStatus(PartnerConnection.STATUS_ACCEPTED);
        ConnectionDto.MemberProfile after = service.profileFor(alice.getId(), bob.getId());
        assertThat(after.isContactVisible()).isTrue();
        assertThat(after.getEmail()).isEqualTo("bob@work.vn");
        assertThat(after.getLinkedin()).isEqualTo("https://linkedin.com/in/bob");
    }

    @Test
    void invitingSomeoneWhoAlreadyInvitedYouAcceptsTheirRequest() {
        PartnerConnection theirs = PartnerConnection.builder().id(UUID.randomUUID())
                .requesterId(bob.getId()).addresseeId(alice.getId()).status(PartnerConnection.STATUS_PENDING).build();
        when(connectionRepository.findBetween(alice.getId(), bob.getId())).thenReturn(Optional.of(theirs));

        service.send(alice.getId(), bob.getId(), null);

        assertThat(theirs.getStatus()).isEqualTo(PartnerConnection.STATUS_ACCEPTED);
        verify(notificationService).createNotification(eq(bob.getId()), anyString(), anyString(), eq("PARTNER_MATCH"), any(), eq("CONNECTION"));
    }

    @Test
    void onlyTheInvitedMemberCanAnswer() {
        PartnerConnection pending = PartnerConnection.builder().id(UUID.randomUUID())
                .requesterId(alice.getId()).addresseeId(bob.getId()).status(PartnerConnection.STATUS_PENDING).build();
        when(connectionRepository.findById(pending.getId())).thenReturn(Optional.of(pending));

        assertThatThrownBy(() -> service.respond(alice.getId(), pending.getId(), true)).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void declinedRequestCanBeSentAgainAfterAWhile() {
        PartnerConnection declined = PartnerConnection.builder().id(UUID.randomUUID())
                .requesterId(alice.getId()).addresseeId(bob.getId()).status(PartnerConnection.STATUS_DECLINED)
                .respondedAt(java.time.OffsetDateTime.now().minusDays(8)).build();
        when(connectionRepository.findBetween(alice.getId(), bob.getId())).thenReturn(Optional.of(declined));

        service.send(alice.getId(), bob.getId(), null);

        assertThat(declined.getStatus()).isEqualTo(PartnerConnection.STATUS_PENDING);
    }

    @Test
    void staffAreNotPartOfTheNetwork() {
        User staff = user("Staff");
        staff.setRole(User.Role.staff);

        assertThatThrownBy(() -> service.send(alice.getId(), staff.getId(), "hi")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.profileFor(alice.getId(), staff.getId())).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void recentlyDeclinedRequestCannotBeResentStraightAway() {
        PartnerConnection declined = PartnerConnection.builder().id(UUID.randomUUID())
                .requesterId(alice.getId()).addresseeId(bob.getId()).status(PartnerConnection.STATUS_DECLINED)
                .respondedAt(java.time.OffsetDateTime.now().minusDays(1)).build();
        when(connectionRepository.findBetween(alice.getId(), bob.getId())).thenReturn(Optional.of(declined));

        assertThatThrownBy(() -> service.send(alice.getId(), bob.getId(), null)).isInstanceOf(IllegalStateException.class);
        assertThat(declined.getStatus()).isEqualTo(PartnerConnection.STATUS_DECLINED);
    }

    @Test
    void cannotConnectWithYourself() {
        assertThatThrownBy(() -> service.send(alice.getId(), alice.getId(), null)).isInstanceOf(IllegalArgumentException.class);
    }
}
