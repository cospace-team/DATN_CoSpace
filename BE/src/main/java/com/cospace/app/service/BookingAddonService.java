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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Add-on services on a booking — the running tab.
 * <p>
 * Add-ons chosen at checkout are part of the booking's total and are paid with it. Add-ons ordered
 * later (while the booking is confirmed or in use) stay {@code unpaid} until staff collect them at
 * the counter; the guest cannot be checked out while anything is still owed. Lines that were never
 * consumed because the booking was cancelled, expired or not shown up for are voided, so the
 * booking's total only ever contains what the customer actually owes.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BookingAddonService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int MAX_QUANTITY = 100;
    private static final Set<String> SETTLE_METHODS = Set.of("cash", "bank_transfer");

    private final BookingRepository bookingRepository;
    private final ExtraServiceRepository extraServiceRepository;
    private final BookingServiceItemRepository bookingServiceItemRepository;
    private final PaymentRepository paymentRepository;

    /**
     * Prices add-ons ordered together with a new booking, from the server-side catalogue. The lines
     * are not saved yet: {@link #attachToNewBooking} does that once the booking exists.
     */
    @Transactional(readOnly = true)
    public List<BookingServiceItem> priceLines(UUID branchId, List<BookingAddonDto.LineRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            return List.of();
        }
        List<BookingServiceItem> lines = new ArrayList<>();
        for (BookingAddonDto.LineRequest req : requests) {
            if (req == null || req.getServiceId() == null) {
                throw new IllegalArgumentException("Dịch vụ thêm không hợp lệ.");
            }
            ExtraServiceEntity service = requireOrderableService(req.getServiceId(), branchId);
            int quantity = requireQuantity(req.getQuantity());
            lines.add(BookingServiceItem.builder()
                    .serviceId(service.getId())
                    .quantity(quantity)
                    .unitPrice(service.getPrice())
                    .subtotal(service.getPrice() * quantity)
                    .status(BookingServiceItem.STATUS_UNPAID)
                    .build());
        }
        return lines;
    }

    public static long total(List<BookingServiceItem> lines) {
        return lines.stream().mapToLong(BookingServiceItem::getSubtotal).sum();
    }

    /** Saves add-ons priced by {@link #priceLines} against the booking just created. */
    @Transactional
    public void attachToNewBooking(Booking booking, UUID orderedBy, List<BookingServiceItem> lines) {
        for (BookingServiceItem line : lines) {
            line.setBookingId(booking.getId());
            line.setCreatedBy(orderedBy);
            bookingServiceItemRepository.save(line);
        }
    }

    /** Puts a service on a confirmed or in-use booking's tab; it is owed until collected at the counter. */
    @Transactional
    public BookingServiceItem addServiceToBooking(UUID actorId, UUID bookingId, UUID serviceId, int quantity) {
        Booking booking = bookingRepository.findByIdWithLock(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đặt chỗ."));
        if (booking.getStatus() != BookingStatus.CHECKED_IN && booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new IllegalStateException("Chỉ có thể gọi thêm dịch vụ khi đơn đã xác nhận hoặc đang sử dụng.");
        }
        ExtraServiceEntity service = requireOrderableService(serviceId, booking.getBranchId());
        int qty = requireQuantity(quantity);
        long lineTotal = service.getPrice() * qty;

        BookingServiceItem item = bookingServiceItemRepository.save(BookingServiceItem.builder()
                .bookingId(bookingId)
                .serviceId(serviceId)
                .quantity(qty)
                .unitPrice(service.getPrice())
                .subtotal(lineTotal)
                .status(BookingServiceItem.STATUS_UNPAID)
                .createdBy(actorId)
                .build());

        booking.setAddonAmount(booking.getAddonAmount() + lineTotal);
        booking.setTotalAmount(booking.getTotalAmount() + lineTotal);
        bookingRepository.save(booking);

        log.info("Added {}x {} to booking {} tab ({}đ)", qty, service.getName(), booking.getBookingCode(), lineTotal);
        return item;
    }

    /**
     * Cancels an unpaid line on the tab (wrong order, item not served, fee waived). A customer may
     * only cancel services they ordered themselves; extension and late-fee lines are staff-only.
     */
    @Transactional
    public void voidItem(UUID actorId, UUID bookingId, UUID itemId, boolean asStaff) {
        Booking booking = bookingRepository.findByIdWithLock(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đặt chỗ."));
        BookingServiceItem item = requireEditableLine(booking, itemId, actorId, asStaff);
        voidLine(booking, item, actorId);
        bookingRepository.save(booking);
    }

    /** Changes how many of an unpaid service line were ordered; the line's subtotal and the booking's total follow. */
    @Transactional
    public BookingServiceItem updateQuantity(UUID actorId, UUID bookingId, UUID itemId, int quantity, boolean asStaff) {
        Booking booking = bookingRepository.findByIdWithLock(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đặt chỗ."));
        BookingServiceItem item = requireEditableLine(booking, itemId, actorId, asStaff);
        if (!BookingServiceItem.LINE_SERVICE.equals(item.getLineType())) {
            throw new IllegalStateException("Chỉ đổi được số lượng của dịch vụ thêm.");
        }
        int qty = requireQuantity(quantity);
        if (qty == item.getQuantity()) {
            return item;
        }
        releaseOpenPayment(item);
        long newSubtotal = item.getUnitPrice() * qty;
        long delta = newSubtotal - item.getSubtotal();
        item.setQuantity(qty);
        item.setSubtotal(newSubtotal);
        bookingServiceItemRepository.save(item);
        booking.setAddonAmount(Math.max(0, booking.getAddonAmount() + delta));
        booking.setTotalAmount(Math.max(0, booking.getTotalAmount() + delta));
        bookingRepository.save(booking);
        return item;
    }

    /**
     * Puts a charge that is not a catalogue service (extra hours, late check-out) on the tab. It is
     * owed like any add-on, so the guest cannot check out until it is paid. The caller saves the booking.
     */
    @Transactional
    public BookingServiceItem addCharge(Booking booking, String lineType, String description, long amount, UUID actorId) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Số tiền phụ phí không hợp lệ.");
        }
        BookingServiceItem item = bookingServiceItemRepository.save(BookingServiceItem.builder()
                .bookingId(booking.getId())
                .lineType(lineType)
                .description(description)
                .quantity(1)
                .unitPrice(amount)
                .subtotal(amount)
                .status(BookingServiceItem.STATUS_UNPAID)
                .createdBy(actorId)
                .build());
        booking.setAddonAmount(booking.getAddonAmount() + amount);
        booking.setTotalAmount(booking.getTotalAmount() + amount);
        return item;
    }

    /** True if the booking ever had a line of this type, including one that was cancelled (waived). */
    @Transactional(readOnly = true)
    public boolean hasAnyLine(UUID bookingId, String lineType) {
        return bookingServiceItemRepository.findByBookingIdOrderByCreatedAtAsc(bookingId).stream()
                .anyMatch(i -> lineType.equals(i.getLineType()));
    }

    /**
     * Ties every unpaid line to a payment that is about to be made online (QR). Lines already tied
     * to an earlier open payment are moved over and that payment is cancelled, so only one QR is
     * ever valid for a set of lines.
     *
     * @return the amount the new payment must collect
     */
    @Transactional
    public long linkUnpaidToPayment(UUID bookingId, UUID paymentId) {
        List<BookingServiceItem> unpaid = bookingServiceItemRepository.findByBookingIdAndStatus(bookingId, BookingServiceItem.STATUS_UNPAID);
        for (BookingServiceItem item : unpaid) {
            releaseOpenPayment(item);
            item.setPaymentId(paymentId);
            bookingServiceItemRepository.save(item);
        }
        return total(unpaid);
    }

    /**
     * Marks the lines an add-on payment was created for as paid.
     *
     * @return the amount of those lines still unpaid when the money arrived, i.e. what the payment
     *         actually covered; anything above it was paid for lines settled or cancelled meanwhile
     */
    @Transactional
    public long applyTabPayment(Payment payment) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        long covered = 0;
        for (BookingServiceItem item : bookingServiceItemRepository.findByBookingIdAndStatus(payment.getBookingId(), BookingServiceItem.STATUS_UNPAID)) {
            if (!payment.getId().equals(item.getPaymentId())) continue;
            item.setStatus(BookingServiceItem.STATUS_PAID);
            item.setPaidAt(now);
            bookingServiceItemRepository.save(item);
            covered += item.getSubtotal();
        }
        return covered;
    }

    /**
     * Collects everything still owed on the tab at the counter, recorded as a paid add-on payment.
     *
     * @return the payment, or {@code null} when nothing is owed
     */
    @Transactional
    public Payment settleTab(UUID staffId, UUID bookingId, String method) {
        String normalizedMethod = method == null || method.isBlank() ? "cash" : method.trim().toLowerCase();
        if (!SETTLE_METHODS.contains(normalizedMethod)) {
            throw new IllegalArgumentException("Hình thức thu tiền không hợp lệ (cash hoặc bank_transfer).");
        }
        Booking booking = bookingRepository.findByIdWithLock(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đặt chỗ."));
        if (booking.getStatus() != BookingStatus.CONFIRMED && booking.getStatus() != BookingStatus.CHECKED_IN
                && booking.getStatus() != BookingStatus.COMPLETED) {
            throw new IllegalStateException("Không thể thu tiền dịch vụ cho đơn ở trạng thái "
                    + BookingStateMachine.label(booking.getStatus()) + ".");
        }
        List<BookingServiceItem> unpaid = bookingServiceItemRepository.findByBookingIdAndStatus(bookingId, BookingServiceItem.STATUS_UNPAID);
        long amount = total(unpaid);
        if (amount <= 0) {
            return null;
        }
        // Collected at the counter: a QR still open for these lines must not be paid on top of it.
        unpaid.forEach(this::releaseOpenPayment);

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        Payment payment = paymentRepository.save(Payment.builder()
                .id(UUID.randomUUID())
                .bookingId(bookingId)
                .userId(booking.getUserId())
                .provider("cash".equals(normalizedMethod) ? "cash" : "bank")
                .method(normalizedMethod)
                .orderId(generateOrderId())
                .requestId(UUID.randomUUID().toString())
                .amount(amount)
                .status(PaymentStatus.PAID)
                .paidAt(now)
                .purpose(Payment.PURPOSE_ADDON)
                .build());

        for (BookingServiceItem item : unpaid) {
            item.setStatus(BookingServiceItem.STATUS_PAID);
            item.setPaymentId(payment.getId());
            item.setPaidAt(now);
            bookingServiceItemRepository.save(item);
        }
        log.info("Settled {}đ of add-ons for booking {} by {} ({})", amount, booking.getBookingCode(), staffId, normalizedMethod);
        return payment;
    }

    /** Add-ons ordered with the booking are covered by the payment that just confirmed it. */
    @Transactional
    public void markPreordersPaid(UUID bookingId, UUID paymentId) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        for (BookingServiceItem item : bookingServiceItemRepository.findByBookingIdAndStatus(bookingId, BookingServiceItem.STATUS_UNPAID)) {
            item.setStatus(BookingServiceItem.STATUS_PAID);
            item.setPaymentId(paymentId);
            item.setPaidAt(now);
            bookingServiceItemRepository.save(item);
        }
    }

    /**
     * Voids every unpaid line of a booking that will never be used (cancelled, expired, no-show),
     * taking them off its add-on amount and total. The caller saves the booking.
     *
     * @return the amount removed
     */
    @Transactional
    public long voidUnpaid(Booking booking, UUID actorId) {
        long removed = 0;
        for (BookingServiceItem item : bookingServiceItemRepository.findByBookingIdAndStatus(booking.getId(), BookingServiceItem.STATUS_UNPAID)) {
            removed += voidLine(booking, item, actorId);
        }
        return removed;
    }

    @Transactional(readOnly = true)
    public long unpaidAmount(UUID bookingId) {
        return bookingServiceItemRepository.sumSubtotalByBookingIdAndStatus(bookingId, BookingServiceItem.STATUS_UNPAID);
    }

    @Transactional(readOnly = true)
    public BookingAddonDto.TabResponse getTab(UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đặt chỗ."));
        List<BookingServiceItem> items = bookingServiceItemRepository.findByBookingIdOrderByCreatedAtAsc(bookingId);
        Map<UUID, ExtraServiceEntity> services = extraServiceRepository.findAllById(
                        items.stream().map(BookingServiceItem::getServiceId).filter(Objects::nonNull).distinct().toList())
                .stream().collect(Collectors.toMap(ExtraServiceEntity::getId, Function.identity()));

        long unpaid = 0;
        long paid = 0;
        List<BookingAddonDto.ItemResponse> responses = new ArrayList<>();
        for (BookingServiceItem item : items) {
            if (BookingServiceItem.STATUS_UNPAID.equals(item.getStatus())) unpaid += item.getSubtotal();
            if (BookingServiceItem.STATUS_PAID.equals(item.getStatus())) paid += item.getSubtotal();
            ExtraServiceEntity service = item.getServiceId() != null ? services.get(item.getServiceId()) : null;
            String name = item.getDescription() != null ? item.getDescription()
                    : service != null ? service.getName() : "Dịch vụ đã xóa";
            responses.add(BookingAddonDto.ItemResponse.builder()
                    .id(item.getId())
                    .serviceId(item.getServiceId())
                    .lineType(item.getLineType())
                    .serviceName(name)
                    .serviceUnit(service != null ? service.getUnit() : null)
                    .createdBy(item.getCreatedBy())
                    .quantity(item.getQuantity())
                    .unitPrice(item.getUnitPrice())
                    .subtotal(item.getSubtotal())
                    .status(item.getStatus())
                    .createdAt(item.getCreatedAt())
                    .paidAt(item.getPaidAt())
                    .build());
        }
        return BookingAddonDto.TabResponse.builder()
                .bookingId(booking.getId())
                .bookingCode(booking.getBookingCode())
                .bookingStatus(booking.getStatus() != null ? booking.getStatus().name() : null)
                .branchId(booking.getBranchId())
                .items(responses)
                .unpaidAmount(unpaid)
                .paidAmount(paid)
                .build();
    }

    @Transactional(readOnly = true)
    public Booking requireBooking(UUID bookingId) {
        return bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đặt chỗ."));
    }

    /** An unpaid line of a booking whose tab can still change, that this caller is allowed to edit. */
    private BookingServiceItem requireEditableLine(Booking booking, UUID itemId, UUID actorId, boolean asStaff) {
        BookingServiceItem item = bookingServiceItemRepository.findById(itemId)
                .filter(i -> i.getBookingId().equals(booking.getId()))
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy dịch vụ trong đơn."));
        if (!BookingServiceItem.STATUS_UNPAID.equals(item.getStatus())) {
            throw new IllegalStateException("Chỉ sửa hoặc hủy được dịch vụ chưa thanh toán.");
        }
        if (booking.getStatus() == BookingStatus.PENDING_PAYMENT) {
            // The pending payment was created for the full total; changing it now would let the
            // gateway confirm a different amount than the booking owes.
            throw new IllegalStateException("Đơn đang chờ thanh toán, không thể thay đổi dịch vụ đã đặt kèm.");
        }
        if (!asStaff) {
            if (!BookingServiceItem.LINE_SERVICE.equals(item.getLineType())) {
                throw new IllegalStateException("Phí gia hạn / check-out muộn chỉ nhân viên mới điều chỉnh được.");
            }
            if (!Objects.equals(item.getCreatedBy(), actorId)) {
                throw new IllegalStateException("Dịch vụ do nhân viên thêm, vui lòng liên hệ quầy để điều chỉnh.");
            }
        }
        return item;
    }

    /** Cancels the still-open online payment a line was tied to, and unties the line. */
    private void releaseOpenPayment(BookingServiceItem item) {
        if (item.getPaymentId() == null) return;
        paymentRepository.findById(item.getPaymentId())
                .filter(p -> p.getStatus() == PaymentStatus.INITIATED || p.getStatus() == PaymentStatus.PENDING)
                .ifPresent(p -> {
                    p.setStatus(PaymentStatus.CANCELLED);
                    paymentRepository.save(p);
                });
        item.setPaymentId(null);
    }

    private long voidLine(Booking booking, BookingServiceItem item, UUID actorId) {
        releaseOpenPayment(item);
        item.setStatus(BookingServiceItem.STATUS_VOID);
        item.setVoidedAt(OffsetDateTime.now(ZoneOffset.UTC));
        item.setVoidedBy(actorId);
        bookingServiceItemRepository.save(item);
        booking.setAddonAmount(Math.max(0, booking.getAddonAmount() - item.getSubtotal()));
        booking.setTotalAmount(Math.max(0, booking.getTotalAmount() - item.getSubtotal()));
        return item.getSubtotal();
    }

    /** An active service from the global catalogue or the booking's own branch. */
    private ExtraServiceEntity requireOrderableService(UUID serviceId, UUID branchId) {
        ExtraServiceEntity service = extraServiceRepository.findById(serviceId)
                .orElseThrow(() -> new IllegalArgumentException("Dịch vụ không tồn tại."));
        if (!service.isActive()) {
            throw new IllegalStateException("Dịch vụ \"" + service.getName() + "\" hiện đang tạm ngưng phục vụ.");
        }
        if (service.getBranchId() != null && !Objects.equals(service.getBranchId(), branchId)) {
            throw new IllegalArgumentException("Dịch vụ \"" + service.getName() + "\" không được cung cấp tại chi nhánh này.");
        }
        return service;
    }

    private static int requireQuantity(int quantity) {
        if (quantity < 1 || quantity > MAX_QUANTITY) {
            throw new IllegalArgumentException("Số lượng dịch vụ phải từ 1 đến " + MAX_QUANTITY + ".");
        }
        return quantity;
    }

    private static String generateOrderId() {
        StringBuilder sb = new StringBuilder("TAB-");
        for (int i = 0; i < 12; i++) {
            sb.append(CODE_CHARS.charAt(RANDOM.nextInt(CODE_CHARS.length())));
        }
        return sb.toString();
    }
}
