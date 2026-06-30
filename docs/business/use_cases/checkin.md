# Use Case Specifications — Check-in / Check-out Module

> **Module**: Check-in (Sprint 3)
> **Tham chiếu**: [SYSTEM_SPEC.md §3.3 & Quy tắc #9](file:///d:/DA/docs/SYSTEM_SPEC.md)
> **Ngày**: 2026-06-30

---

## UC-CHK-01: Staff Check-in Cho Khách

### Tổng quan
| Thuộc tính | Giá trị |
|-----------|--------|
| **Actor chính** | Staff, Branch Admin |
| **Trigger** | Khách tới quầy đọc mã đặt chỗ (booking_code) hoặc Staff scan QR |
| **Precondition** | Booking tồn tại, status = `confirmed` |
| **Postcondition** | Record `checkin_logs` được tạo, Booking status = `checked_in` |

### Luồng Chính
```
1. Khách hàng tới quầy và cung cấp `booking_code`
2. Staff nhập `booking_code` vào hệ thống
3. Hệ thống kiểm tra:
   a. Booking có tồn tại và thuộc branch hiện tại của Staff
   b. Booking status == 'confirmed'
   c. Thời gian hiện tại nằm trong khoảng cho phép (VD: không sớm hơn start_at quá 30 phút)
4. Hệ thống tạo record trong `checkin_logs`:
   - booking_id = booking.id
   - checkin_at = now()
   - checkout_at = NULL
   - staff_id = current_user.id
5. Hệ thống cập nhật `bookings.status = 'checked_in'`
6. Hiển thị thông báo thành công cho Staff, hiển thị hướng dẫn vị trí bàn (SVG highlight) để Staff chỉ cho khách.
```

### Luồng Ngoại Lệ
| # | Điều kiện | Xử lý |
|---|----------|-------|
| E1 | Khách đến quá sớm | Hệ thống cảnh báo "Chưa đến giờ". Staff có thể override nếu chi nhánh đang vắng (tùy chính sách, hiện tại MVP chặn cứng sớm > 30p). |
| E2 | Khách chưa thanh toán | Booking status = `pending_payment`. Yêu cầu khách thanh toán (chuyển sang UC-PAY-02) rồi mới check-in. |
| E3 | Trùng check-in | Khách đã check-in (status = `checked_in`). Báo lỗi `ALREADY_CHECKED_IN`. |

---

## UC-CHK-02: Staff Check-out Cho Khách

### Tổng quan
| Thuộc tính | Giá trị |
|-----------|--------|
| **Actor chính** | Staff, Branch Admin |
| **Trigger** | Khách báo trả chỗ hoặc Staff đi kiểm tra và thấy khách đã về |
| **Precondition** | Booking status = `checked_in` |
| **Postcondition** | Update `checkin_logs.checkout_at`, Booking status = `completed` |

### Luồng Chính
```
1. Staff tìm booking đang active (qua list hoặc nhập code)
2. Staff nhấn "Check-out"
3. Hệ thống tìm record `checkin_logs` có `booking_id` và `checkout_at IS NULL`
4. Hệ thống cập nhật:
   - checkin_logs.checkout_at = now()
   - checkin_logs.checkout_staff_id = current_user.id
5. Hệ thống cập nhật `bookings.status = 'completed'`
6. (Tùy chọn) Gửi notification cho khách cảm ơn.
```

### Luồng Ngoại Lệ
| # | Điều kiện | Xử lý |
|---|----------|-------|
| E1 | Overdue (Quá hạn end_at) | Quá giờ nhưng khách chưa về. Background job gửi `notification` báo Staff đi nhắc nhở. Khi check-out hệ thống ghi nhận thời gian thực tế. (V2+: Tính thêm phí phạt trả muộn). |
| E2 | Mất record check-in | Lỗi data (status checked_in nhưng không tìm thấy log). Hệ thống tự tạo mới log với `checkout_at = now()`. |

---

## Danh Sách Error Codes (Check-in)

| Code | HTTP Status | Mô tả |
|------|------------|--------|
| `BOOKING_NOT_CONFIRMED` | 400 | Phải thanh toán xong mới được check-in |
| `TOO_EARLY_TO_CHECKIN` | 400 | Khách đến quá sớm ( > 30p trước giờ ) |
| `ALREADY_CHECKED_IN` | 400 | Booking đang ở trạng thái checked_in |
| `NOT_CHECKED_IN` | 400 | Cố check-out khi chưa check-in |
