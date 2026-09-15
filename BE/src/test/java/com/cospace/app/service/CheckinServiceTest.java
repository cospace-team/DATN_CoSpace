package com.cospace.app.service;

import com.cospace.app.dto.api.CheckinLogDto;
import com.cospace.app.entity.Booking;
import com.cospace.app.entity.BookingStatus;
import com.cospace.app.entity.CheckinLog;
import com.cospace.app.entity.DurationUnit;
import com.cospace.app.entity.User;
import com.cospace.app.repository.BookingRepository;
import com.cospace.app.repository.CheckinLogRepository;
import com.cospace.app.repository.UserRepository;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CheckinServiceTest {

    @Mock
    private CheckinLogRepository checkinLogRepository;
    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private BookingService bookingService;
    @Mock
    private UserRepository userRepository;
    @Mock
    private BookingAddonService bookingAddonService;

    @InjectMocks
    private CheckinService checkinService;

    private final UUID branchId = UUID.randomUUID();
    private final UUID staffId = UUID.randomUUID();

    private static OffsetDateTime now() {
        return OffsetDateTime.now(ZoneOffset.UTC);
    }

    private Booking booking(BookingStatus status, DurationUnit unit, int unitCount,
                            OffsetDateTime startAt, OffsetDateTime endAt) {
        return Booking.builder()
                .id(UUID.randomUUID())
                .userId(UUID.randomUUID())
                .branchId(branchId)
                .status(status)
                .unit(unit)
                .unitCount(unitCount)
                .isContract(unit == DurationUnit.week || unit == DurationUnit.month)
                .startAt(startAt)
                .endAt(endAt)
                .build();
    }

    private void givenStaffOfBranch(UUID staffBranchId) {
        when(userRepository.findById(staffId)).thenReturn(Optional.of(
                User.builder().id(staffId).role(User.Role.staff).branchId(staffBranchId).build()));
    }

    @Nested
    class Checkin {

        @Test
        void confirmedBookingInWindowIsCheckedIn() {
            Booking booking = booking(BookingStatus.CONFIRMED, DurationUnit.hour, 2, now().minusMinutes(10), now().plusHours(2));
            when(bookingRepository.findByIdWithLock(booking.getId())).thenReturn(Optional.of(booking));
            givenStaffOfBranch(branchId);
            when(checkinLogRepository.save(any(CheckinLog.class))).thenAnswer(inv -> inv.getArgument(0));

            CheckinLogDto dto = checkinService.checkin(staffId, booking.getId(), "ok");

            assertThat(booking.getStatus()).isEqualTo(BookingStatus.CHECKED_IN);
            assertThat(dto.getBookingId()).isEqualTo(booking.getId());
            assertThat(dto.getStaffUserId()).isEqualTo(staffId);
            assertThat(dto.getCheckoutAt()).isNull();
            verify(bookingRepository).save(booking);
        }

        @Test
        void allowsCheckinUpTo30MinutesEarly() {
            Booking booking = booking(BookingStatus.CONFIRMED, DurationUnit.hour, 1, now().plusMinutes(25), now().plusHours(2));
            when(bookingRepository.findByIdWithLock(booking.getId())).thenReturn(Optional.of(booking));
            givenStaffOfBranch(branchId);
            when(checkinLogRepository.save(any(CheckinLog.class))).thenAnswer(inv -> inv.getArgument(0));

            checkinService.checkin(staffId, booking.getId(), null);

            assertThat(booking.getStatus()).isEqualTo(BookingStatus.CHECKED_IN);
        }

        @Test
        void rejectsStaffFromAnotherBranch() {
            Booking booking = booking(BookingStatus.CONFIRMED, DurationUnit.hour, 2, now(), now().plusHours(2));
            when(bookingRepository.findByIdWithLock(booking.getId())).thenReturn(Optional.of(booking));
            givenStaffOfBranch(UUID.randomUUID());

            assertThatThrownBy(() -> checkinService.checkin(staffId, booking.getId(), null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("chi nhánh");
            verify(checkinLogRepository, never()).save(any());
        }

        @Test
        void rejectsUnpaidBooking() {
            Booking booking = booking(BookingStatus.PENDING_PAYMENT, DurationUnit.hour, 2, now(), now().plusHours(2));
            when(bookingRepository.findByIdWithLock(booking.getId())).thenReturn(Optional.of(booking));
            givenStaffOfBranch(branchId);

            assertThatThrownBy(() -> checkinService.checkin(staffId, booking.getId(), null))
                    .isInstanceOf(IllegalArgumentException.class);
            verify(checkinLogRepository, never()).save(any());
        }

        @Test
        void rejectsDoubleCheckin() {
            Booking booking = booking(BookingStatus.CONFIRMED, DurationUnit.hour, 2, now(), now().plusHours(2));
            when(bookingRepository.findByIdWithLock(booking.getId())).thenReturn(Optional.of(booking));
            givenStaffOfBranch(branchId);
            when(checkinLogRepository.existsByBookingIdAndCheckoutAtIsNull(booking.getId())).thenReturn(true);

            assertThatThrownBy(() -> checkinService.checkin(staffId, booking.getId(), null))
                    .isInstanceOf(IllegalArgumentException.class);
            verify(checkinLogRepository, never()).save(any());
        }

        @Test
        void rejectsCheckinMoreThan30MinutesEarly() {
            Booking booking = booking(BookingStatus.CONFIRMED, DurationUnit.hour, 2, now().plusHours(2), now().plusHours(4));
            when(bookingRepository.findByIdWithLock(booking.getId())).thenReturn(Optional.of(booking));
            givenStaffOfBranch(branchId);

            assertThatThrownBy(() -> checkinService.checkin(staffId, booking.getId(), null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("30 phút");
        }

        @Test
        void rejectsCheckinAfterBookingEnded() {
            Booking booking = booking(BookingStatus.CONFIRMED, DurationUnit.hour, 2, now().minusHours(3), now().minusHours(1));
            when(bookingRepository.findByIdWithLock(booking.getId())).thenReturn(Optional.of(booking));
            givenStaffOfBranch(branchId);

            assertThatThrownBy(() -> checkinService.checkin(staffId, booking.getId(), null))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        void multiDayPassCanCheckInAgainWhileStatusIsCheckedIn() {
            Booking booking = booking(BookingStatus.CHECKED_IN, DurationUnit.month, 1, now().minusDays(3), now().plusDays(27));
            when(bookingRepository.findByIdWithLock(booking.getId())).thenReturn(Optional.of(booking));
            givenStaffOfBranch(branchId);
            when(checkinLogRepository.save(any(CheckinLog.class))).thenAnswer(inv -> inv.getArgument(0));

            checkinService.checkin(staffId, booking.getId(), null);

            assertThat(booking.getStatus()).isEqualTo(BookingStatus.CHECKED_IN);
            verify(checkinLogRepository).save(any(CheckinLog.class));
        }
    }

    @Nested
    class Checkout {

        private CheckinLog activeLog(Booking booking) {
            return CheckinLog.builder()
                    .id(UUID.randomUUID())
                    .bookingId(booking.getId())
                    .staffUserId(staffId)
                    .checkinAt(now().minusHours(1))
                    .note("in")
                    .build();
        }

        @Test
        void earlyCheckoutCompletesBookingAndReleasesSpace() {
            Booking booking = booking(BookingStatus.CHECKED_IN, DurationUnit.hour, 3, now().minusHours(1), now().plusHours(2));
            CheckinLog log = activeLog(booking);
            when(checkinLogRepository.findById(log.getId())).thenReturn(Optional.of(log));
            when(checkinLogRepository.save(log)).thenReturn(log);
            when(bookingRepository.findByIdWithLock(booking.getId())).thenReturn(Optional.of(booking));
            givenStaffOfBranch(branchId);

            CheckinLogDto dto = checkinService.checkout(staffId, log.getId(), "xong");

            assertThat(booking.getStatus()).isEqualTo(BookingStatus.COMPLETED);
            assertThat(booking.getEndAt()).isBeforeOrEqualTo(now());
            assertThat(dto.getCheckoutAt()).isNotNull();
            assertThat(log.getNote()).isEqualTo("in | Checkout: xong");
        }

        @Test
        void multiDayPassReturnsToConfirmedBeforeItEnds() {
            Booking booking = booking(BookingStatus.CHECKED_IN, DurationUnit.month, 1, now().minusDays(1), now().plusDays(29));
            OffsetDateTime originalEnd = booking.getEndAt();
            CheckinLog log = activeLog(booking);
            when(checkinLogRepository.findById(log.getId())).thenReturn(Optional.of(log));
            when(checkinLogRepository.save(log)).thenReturn(log);
            when(bookingRepository.findByIdWithLock(booking.getId())).thenReturn(Optional.of(booking));
            givenStaffOfBranch(branchId);

            checkinService.checkout(staffId, log.getId(), null);

            assertThat(booking.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
            assertThat(booking.getEndAt()).isEqualTo(originalEnd);
        }

        @Test
        void guestCannotBeCheckedOutWithAnUnpaidTab() {
            Booking booking = booking(BookingStatus.CHECKED_IN, DurationUnit.hour, 3, now().minusHours(1), now().plusHours(2));
            CheckinLog log = activeLog(booking);
            when(checkinLogRepository.findById(log.getId())).thenReturn(Optional.of(log));
            when(bookingAddonService.unpaidAmount(booking.getId())).thenReturn(35_000L);

            assertThatThrownBy(() -> checkinService.checkout(staffId, log.getId(), null))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("chưa thanh toán");
            assertThat(log.getCheckoutAt()).isNull();
            assertThat(booking.getStatus()).isEqualTo(BookingStatus.CHECKED_IN);
            verify(checkinLogRepository, never()).save(any());
        }

        @Test
        void rejectsSecondCheckout() {
            CheckinLog log = CheckinLog.builder().id(UUID.randomUUID()).checkoutAt(now().minusMinutes(5)).build();
            when(checkinLogRepository.findById(log.getId())).thenReturn(Optional.of(log));

            assertThatThrownBy(() -> checkinService.checkout(staffId, log.getId(), null))
                    .isInstanceOf(IllegalArgumentException.class);
            verify(checkinLogRepository, never()).save(any());
        }

        @Test
        void rejectsStaffFromAnotherBranch() {
            Booking booking = booking(BookingStatus.CHECKED_IN, DurationUnit.hour, 3, now().minusHours(1), now().plusHours(2));
            CheckinLog log = activeLog(booking);
            when(checkinLogRepository.findById(log.getId())).thenReturn(Optional.of(log));
            when(checkinLogRepository.save(log)).thenReturn(log);
            when(bookingRepository.findByIdWithLock(booking.getId())).thenReturn(Optional.of(booking));
            givenStaffOfBranch(UUID.randomUUID());

            assertThatThrownBy(() -> checkinService.checkout(staffId, log.getId(), null))
                    .isInstanceOf(IllegalArgumentException.class);
            assertThat(booking.getStatus()).isEqualTo(BookingStatus.CHECKED_IN);
            verify(bookingRepository, never()).save(any());
        }
    }
}
