package com.cospace.app.service;

import com.cospace.app.dto.api.BookingAddonDto;
import com.cospace.app.entity.Booking;
import com.cospace.app.entity.BookingServiceItem;
import com.cospace.app.entity.BookingStatus;
import com.cospace.app.entity.ExtraServiceEntity;
import com.cospace.app.entity.Payment;
import com.cospace.app.entity.PaymentStatus;
import com.cospace.app.repository.BookingRepository;
import com.cospace.app.repository.BookingServiceItemRepository;
import com.cospace.app.repository.ExtraServiceRepository;
import com.cospace.app.repository.PaymentRepository;
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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookingAddonServiceTest {

    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private ExtraServiceRepository extraServiceRepository;
    @Mock
    private BookingServiceItemRepository itemRepository;
    @Mock
    private PaymentRepository paymentRepository;

    @InjectMocks
    private BookingAddonService addonService;

    private final UUID branchId = UUID.randomUUID();

    private Booking booking(BookingStatus status) {
        Booking b = Booking.builder().id(UUID.randomUUID()).bookingCode("WH-ABC234").userId(UUID.randomUUID())
                .branchId(branchId).status(status).subtotalAmount(100_000L).totalAmount(100_000L).build();
        org.mockito.Mockito.lenient().when(bookingRepository.findByIdWithLock(b.getId())).thenReturn(Optional.of(b));
        return b;
    }

    private ExtraServiceEntity service(UUID serviceBranchId, long price, boolean active) {
        ExtraServiceEntity s = ExtraServiceEntity.builder().id(UUID.randomUUID()).branchId(serviceBranchId)
                .name("Cà phê").price(price).isActive(active).build();
        when(extraServiceRepository.findById(s.getId())).thenReturn(Optional.of(s));
        return s;
    }

    private BookingServiceItem unpaid(Booking b, long subtotal) {
        return BookingServiceItem.builder().id(UUID.randomUUID()).bookingId(b.getId()).quantity(1)
                .unitPrice(subtotal).subtotal(subtotal).status(BookingServiceItem.STATUS_UNPAID).build();
    }

    @Test
    void checkoutAddonsArePricedFromTheCatalogueNotTheClient() {
        ExtraServiceEntity coffee = service(null, 35_000L, true);

        List<BookingServiceItem> lines = addonService.priceLines(branchId, List.of(new BookingAddonDto.LineRequest(coffee.getId(), 3)));

        assertThat(lines).singleElement().satisfies(l -> {
            assertThat(l.getUnitPrice()).isEqualTo(35_000L);
            assertThat(l.getSubtotal()).isEqualTo(105_000L);
            assertThat(l.getStatus()).isEqualTo(BookingServiceItem.STATUS_UNPAID);
        });
    }

    @Test
    void serviceOfAnotherBranchOrInactiveServiceCannotBeOrdered() {
        ExtraServiceEntity otherBranch = service(UUID.randomUUID(), 35_000L, true);
        ExtraServiceEntity paused = service(branchId, 35_000L, false);

        assertThatThrownBy(() -> addonService.priceLines(branchId, List.of(new BookingAddonDto.LineRequest(otherBranch.getId(), 1))))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> addonService.priceLines(branchId, List.of(new BookingAddonDto.LineRequest(paused.getId(), 1))))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void quantityIsBounded() {
        ExtraServiceEntity coffee = service(null, 35_000L, true);

        assertThatThrownBy(() -> addonService.priceLines(branchId, List.of(new BookingAddonDto.LineRequest(coffee.getId(), 0))))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> addonService.priceLines(branchId, List.of(new BookingAddonDto.LineRequest(coffee.getId(), 101))))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void orderingDuringTheBookingPutsAnUnpaidLineOnTheTab() {
        Booking b = booking(BookingStatus.CHECKED_IN);
        ExtraServiceEntity coffee = service(branchId, 35_000L, true);
        when(itemRepository.save(any(BookingServiceItem.class))).thenAnswer(inv -> inv.getArgument(0));

        BookingServiceItem item = addonService.addServiceToBooking(UUID.randomUUID(), b.getId(), coffee.getId(), 2);

        assertThat(item.getStatus()).isEqualTo(BookingServiceItem.STATUS_UNPAID);
        assertThat(b.getAddonAmount()).isEqualTo(70_000L);
        assertThat(b.getTotalAmount()).isEqualTo(170_000L);
    }

    @Test
    void cannotOrderOnABookingThatIsNotActive() {
        Booking b = booking(BookingStatus.PENDING_PAYMENT);

        assertThatThrownBy(() -> addonService.addServiceToBooking(UUID.randomUUID(), b.getId(), UUID.randomUUID(), 1))
                .isInstanceOf(IllegalStateException.class);
        verify(itemRepository, never()).save(any());
    }

    @Test
    void settlingTheTabRecordsAnAddonPaymentForExactlyWhatIsOwed() {
        Booking b = booking(BookingStatus.CHECKED_IN);
        BookingServiceItem first = unpaid(b, 35_000L);
        BookingServiceItem second = unpaid(b, 20_000L);
        when(itemRepository.findByBookingIdAndStatus(b.getId(), BookingServiceItem.STATUS_UNPAID)).thenReturn(List.of(first, second));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        Payment payment = addonService.settleTab(UUID.randomUUID(), b.getId(), "cash");

        assertThat(payment.getAmount()).isEqualTo(55_000L);
        assertThat(payment.getPurpose()).isEqualTo(Payment.PURPOSE_ADDON);
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(payment.getUserId()).isEqualTo(b.getUserId());
        assertThat(List.of(first, second)).allSatisfy(i -> {
            assertThat(i.getStatus()).isEqualTo(BookingServiceItem.STATUS_PAID);
            assertThat(i.getPaymentId()).isEqualTo(payment.getId());
        });
    }

    @Test
    void settlingWithNothingOwedCreatesNoPayment() {
        Booking b = booking(BookingStatus.COMPLETED);
        when(itemRepository.findByBookingIdAndStatus(b.getId(), BookingServiceItem.STATUS_UNPAID)).thenReturn(List.of());

        assertThat(addonService.settleTab(UUID.randomUUID(), b.getId(), "bank_transfer")).isNull();
        verify(paymentRepository, never()).save(any());
    }

    @Test
    void unknownSettleMethodIsRejected() {
        assertThatThrownBy(() -> addonService.settleTab(UUID.randomUUID(), UUID.randomUUID(), "bitcoin"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void voidingUnpaidLinesTakesThemOffTheBill() {
        Booking b = booking(BookingStatus.CONFIRMED);
        b.setAddonAmount(55_000L);
        b.setTotalAmount(155_000L);
        BookingServiceItem first = unpaid(b, 35_000L);
        BookingServiceItem second = unpaid(b, 20_000L);
        when(itemRepository.findByBookingIdAndStatus(b.getId(), BookingServiceItem.STATUS_UNPAID)).thenReturn(List.of(first, second));

        assertThat(addonService.voidUnpaid(b, null)).isEqualTo(55_000L);

        assertThat(b.getAddonAmount()).isZero();
        assertThat(b.getTotalAmount()).isEqualTo(100_000L);
        assertThat(first.getStatus()).isEqualTo(BookingServiceItem.STATUS_VOID);
    }

    @Test
    void paidLineCannotBeVoided() {
        Booking b = booking(BookingStatus.CHECKED_IN);
        BookingServiceItem paid = unpaid(b, 35_000L);
        paid.setStatus(BookingServiceItem.STATUS_PAID);
        when(itemRepository.findById(paid.getId())).thenReturn(Optional.of(paid));

        assertThatThrownBy(() -> addonService.voidItem(UUID.randomUUID(), b.getId(), paid.getId(), true))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void preorderedLinesArePaidWithTheBooking() {
        Booking b = booking(BookingStatus.CONFIRMED);
        BookingServiceItem line = unpaid(b, 35_000L);
        UUID paymentId = UUID.randomUUID();
        when(itemRepository.findByBookingIdAndStatus(b.getId(), BookingServiceItem.STATUS_UNPAID)).thenReturn(List.of(line));

        addonService.markPreordersPaid(b.getId(), paymentId);

        assertThat(line.getStatus()).isEqualTo(BookingServiceItem.STATUS_PAID);
        assertThat(line.getPaymentId()).isEqualTo(paymentId);
    }

    @Test
    void changingQuantityRepricesTheLineAndTheBooking() {
        Booking b = booking(BookingStatus.CHECKED_IN);
        b.setAddonAmount(35_000L);
        b.setTotalAmount(135_000L);
        UUID customer = b.getUserId();
        BookingServiceItem line = unpaid(b, 35_000L);
        line.setCreatedBy(customer);
        when(itemRepository.findById(line.getId())).thenReturn(Optional.of(line));

        addonService.updateQuantity(customer, b.getId(), line.getId(), 3, false);

        assertThat(line.getQuantity()).isEqualTo(3);
        assertThat(line.getSubtotal()).isEqualTo(105_000L);
        assertThat(b.getAddonAmount()).isEqualTo(105_000L);
        assertThat(b.getTotalAmount()).isEqualTo(205_000L);
    }

    @Test
    void customerCannotEditLinesAddedByStaff() {
        Booking b = booking(BookingStatus.CHECKED_IN);
        BookingServiceItem line = unpaid(b, 35_000L);
        line.setCreatedBy(UUID.randomUUID());
        when(itemRepository.findById(line.getId())).thenReturn(Optional.of(line));

        assertThatThrownBy(() -> addonService.updateQuantity(b.getUserId(), b.getId(), line.getId(), 2, false))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> addonService.voidItem(b.getUserId(), b.getId(), line.getId(), false))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void customerCannotWaiveALateFee() {
        Booking b = booking(BookingStatus.CHECKED_IN);
        BookingServiceItem fee = unpaid(b, 50_000L);
        fee.setLineType(BookingServiceItem.LINE_LATE_FEE);
        fee.setCreatedBy(b.getUserId());
        when(itemRepository.findById(fee.getId())).thenReturn(Optional.of(fee));

        assertThatThrownBy(() -> addonService.voidItem(b.getUserId(), b.getId(), fee.getId(), false))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void editingALineCancelsTheQrItWasBeingPaidWith() {
        Booking b = booking(BookingStatus.CHECKED_IN);
        b.setAddonAmount(35_000L);
        b.setTotalAmount(135_000L);
        BookingServiceItem line = unpaid(b, 35_000L);
        Payment qr = Payment.builder().id(UUID.randomUUID()).status(PaymentStatus.PENDING).build();
        line.setPaymentId(qr.getId());
        when(itemRepository.findById(line.getId())).thenReturn(Optional.of(line));
        when(paymentRepository.findById(qr.getId())).thenReturn(Optional.of(qr));

        addonService.updateQuantity(UUID.randomUUID(), b.getId(), line.getId(), 2, true);

        assertThat(qr.getStatus()).isEqualTo(PaymentStatus.CANCELLED);
        assertThat(line.getPaymentId()).isNull();
    }

    @Test
    void tabPaymentOnlyCoversTheLinesItWasCreatedFor() {
        Booking b = booking(BookingStatus.CHECKED_IN);
        Payment qr = Payment.builder().id(UUID.randomUUID()).bookingId(b.getId()).amount(55_000L).build();
        BookingServiceItem linked = unpaid(b, 35_000L);
        linked.setPaymentId(qr.getId());
        BookingServiceItem orderedLater = unpaid(b, 20_000L);
        when(itemRepository.findByBookingIdAndStatus(b.getId(), BookingServiceItem.STATUS_UNPAID))
                .thenReturn(List.of(linked, orderedLater));

        assertThat(addonService.applyTabPayment(qr)).isEqualTo(35_000L);

        assertThat(linked.getStatus()).isEqualTo(BookingServiceItem.STATUS_PAID);
        assertThat(orderedLater.getStatus()).isEqualTo(BookingServiceItem.STATUS_UNPAID);
    }

    @Test
    void chargesAreAddedToTheBookingTotal() {
        Booking b = booking(BookingStatus.CHECKED_IN);
        b.setTotalAmount(100_000L);
        when(itemRepository.save(any(BookingServiceItem.class))).thenAnswer(inv -> inv.getArgument(0));

        BookingServiceItem fee = addonService.addCharge(b, BookingServiceItem.LINE_LATE_FEE, "Check-out muộn 1 giờ", 75_000L, null);

        assertThat(fee.getServiceId()).isNull();
        assertThat(fee.getLineType()).isEqualTo(BookingServiceItem.LINE_LATE_FEE);
        assertThat(b.getAddonAmount()).isEqualTo(75_000L);
        assertThat(b.getTotalAmount()).isEqualTo(175_000L);
    }
}
