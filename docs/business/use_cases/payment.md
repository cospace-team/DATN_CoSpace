# Use Case Specifications — Payment Module

> **Module**: Payment (Sprint 3)
> **Tham chiếu**: [SYSTEM_SPEC.md §3.4](file:///d:/DA/docs/SYSTEM_SPEC.md)
> **Ngày**: 2026-06-30

---

## UC-PAY-01: Thanh Toán Đặt Chỗ Qua MoMo

### Tổng quan
| Thuộc tính | Giá trị |
|-----------|--------|
| **Actor chính** | Customer |
| **Actor phụ** | MoMo IPN System |
| **Trigger** | Customer nhấn "Thanh toán" tại trang checkout |
| **Precondition** | Booking tồn tại, status = `pending_payment`, `total_amount > 0` |
| **Postcondition** | Payment record tạo, Booking cập nhật thành `confirmed`, gửi Notification |

### Luồng Chính (Main Flow)

```
1. Customer gửi yêu cầu thanh toán cho booking_id
2. Hệ thống kiểm tra:
   a. Booking tồn tại và là của Customer này
   b. Booking status == 'pending_payment'
   c. `payment_deadline_at` chưa hết hạn
3. Hệ thống gọi MoMoService (đã có trong BE) để tạo QR/URL thanh toán:
   - orderId = {booking_id}_{timestamp}
   - amount = booking.total_amount
4. Hệ thống tạo record trong bảng `payments`:
   - id = UUID mới
   - booking_id = booking.id
   - provider = 'momo'
   - method = 'ewallet'
   - amount = total_amount
   - status = 'pending'
   - transaction_id = orderId (chờ map với MoMo)
5. Hệ thống trả về payUrl của MoMo cho Customer
6. Customer quét QR/thanh toán trên MoMo
7. MoMo gọi webhook (IPN) về endpoint `/momo/notify` của hệ thống:
   - Hệ thống verify signature HMAC SHA256 (đã implement trong MomoService)
   - Nếu resultCode = 0 (Thành công):
     a. Update `payments.status = 'paid'`, ghi nhận `paid_at = now()`
     b. Update `bookings.status = 'confirmed'`
     c. Log vào `payment_events`
     d. Tạo `notifications` (booking_confirmed)
8. Customer được redirect về trang Return URL của FE hiển thị thành công.
```

### Luồng Ngoại Lệ (Exception Flows)

| # | Điều kiện | Xử lý |
|---|----------|-------|
| E1 | Quá hạn 15 phút (timeout) | Background job quét và update booking thành `expired`. Trả lỗi `BOOKING_EXPIRED` nếu Customer cố thanh toán. |
| E2 | Thanh toán thất bại trên MoMo | Webhook trả resultCode != 0 → Update payment status = `failed`. Booking vẫn giữ `pending_payment` cho đến khi hết hạn. |
| E3 | Webhook gọi 2 lần (Network retry) | Dùng Idempotency: Kiểm tra transaction_id trong payment_events, nếu đã xử lý thì trả 200 OK ngay (không làm lại logic c+d). |
| E4 | Chữ ký HMAC không khớp | Từ chối request (400 Bad Request), log cảnh báo bảo mật. |

---

## UC-PAY-02: Thanh Toán Tiền Mặt Tại Quầy

### Tổng quan
| Thuộc tính | Giá trị |
|-----------|--------|
| **Actor chính** | Staff, Branch Admin |
| **Trigger** | Staff xác nhận đã nhận tiền mặt từ khách |
| **Precondition** | Booking tạo tại quầy (source = 'counter'), status = `pending_payment` |
| **Postcondition** | Payment record tạo, Booking cập nhật thành `confirmed` |

### Luồng Chính

```
1. Staff mở màn hình Booking đang chờ thanh toán
2. Staff chọn "Thu tiền mặt" và xác nhận đã thu đủ số tiền
3. Hệ thống xác thực: Actor có quyền tại branch này (staff.branch_id == booking.branch_id)
4. Hệ thống tạo record trong bảng `payments`:
   - provider = 'internal'
   - method = 'cash'
   - status = 'paid'
   - amount = booking.total_amount
   - paid_at = now()
5. Hệ thống cập nhật `bookings.status = 'confirmed'`
6. Sinh notification (tùy chọn) và log audit
```

### Luồng Ngoại Lệ
| # | Điều kiện | Xử lý |
|---|----------|-------|
| E1 | Customer tự gọi API cash | Trả lỗi `403 Forbidden` (Chỉ Staff/Admin mới được cash) |
| E2 | Staff khác chi nhánh | Trả lỗi `403 UNAUTHORIZED_BRANCH` |

---

## UC-PAY-03: Hoàn Tiền (Refund) - Ghi nhận nội bộ

### Tổng quan
| Thuộc tính | Giá trị |
|-----------|--------|
| **Actor chính** | System (Tự động) hoặc Admin |
| **Trigger** | Sau khi Customer hủy (UC-BOOK-04) sinh ra `booking_cancellations` record |
| **Postcondition** | Payment record (type=refund) được tạo |

### Luồng Chính
```
1. Module Booking trigger sự kiện Cancel thành công, hoàn x%
2. Module Payment tiếp nhận số tiền refund_amount
3. Nếu payment gốc là MoMo:
   - MVP: CHỈ ghi nhận database, không gọi API MoMo hoàn thật.
   - Tạo `payments` record (provider=momo, type=refund, amount=-refund_amount, status=paid)
4. Nếu payment gốc là Cash:
   - Staff phải trả tiền mặt cho khách. Ghi nhận record như trên (provider=internal, method=cash).
```
> **Gotcha**: Quyết định L5 đã chốt: MVP không call API refund của MoMo. Chỉ tracking nội bộ.

---

## Danh Sách Error Codes (Payment)

| Code | HTTP Status | Mô tả |
|------|------------|--------|
| `BOOKING_NOT_FOUND` | 404 | Booking không tồn tại |
| `BOOKING_EXPIRED` | 400 | Booking đã quá hạn 15 phút |
| `BOOKING_ALREADY_PAID` | 400 | Booking đã được thanh toán |
| `MOMO_SYSTEM_ERROR` | 502 | Lỗi gọi sang MoMo API |
| `INVALID_SIGNATURE` | 400 | Sai chữ ký HMAC |
| `METHOD_NOT_ALLOWED` | 403 | Customer cố xài tiền mặt |
