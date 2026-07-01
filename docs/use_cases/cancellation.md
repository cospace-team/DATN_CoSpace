# Use Case Specifications — Cancellation & Refund Module

> **Module**: Cancellation (Sprint 4)
> **Tham chiếu**: [SYSTEM_SPEC.md §3.6](file:///d:/DA/docs/SYSTEM_SPEC.md)
> **Ngày**: 2026-06-30

---

## UC-CAN-01: Cấu Hình Chính Sách Hủy

### Tổng quan
| Thuộc tính | Giá trị |
|-----------|--------|
| **Actor chính** | System Admin, Branch Admin |
| **Trigger** | Admin tạo bộ rules phạt/hoàn tiền khi khách hủy |
| **Postcondition** | Record bảng `cancellation_policies` được tạo |

### Luồng Chính
```
1. Admin vào trang Quản lý chính sách hủy.
2. Admin tạo policy mới:
   - name: "Hủy phòng họp sát giờ"
   - branch_id: NULL (Global) hoặc UUID (Branch-specific)
   - workspace_type_id: "meeting_room"
   - rule_type: 'BEFORE_START_HOURS'
   - min_value: 0
   - max_value: 24 (từ 0 đến 24 giờ trước khi bắt đầu)
   - refund_percent: 50 (hoàn 50%)
   - priority: 10
   - effective_from: now()
3. Hệ thống lưu vào database. Khi có yêu cầu hủy, engine sẽ lookup theo `priority` và `effective_from` để áp dụng luật.
```

---

## UC-CAN-02: Hủy Đặt Chỗ (Tự động hoàn tiền)

### Tổng quan
| Thuộc tính | Giá trị |
|-----------|--------|
| **Actor chính** | Customer |
| **Actor phụ** | Payment System (Ghi nhận refund nội bộ) |
| **Trigger** | Khách nhấn "Hủy đặt chỗ" |
| **Precondition** | Booking status ∈ `{'pending_payment', 'confirmed'}` |
| **Postcondition** | Booking status = `canceled`, `booking_cancellations` record được tạo |

### Luồng Chính
```
1. Customer chọn Booking đang active và nhấn Hủy.
2. Hệ thống kiểm tra hợp lệ:
   - Nếu `pending_payment` -> Chưa thanh toán -> Không cần tính hoàn tiền. Chuyển thẳng status = `canceled`. Kết thúc.
   - Nếu `confirmed` -> Đã thanh toán -> Tiếp tục Bước 3.
3. Cancellation Engine tìm Policy:
   a. Lọc ra các policies MATCH (cùng branch/global, cùng type/global, có hiệu lực).
   b. Sắp xếp theo ưu tiên: Branch-specific > Global, Priority cao > thấp, Created_at mới > cũ (ORDER BY branch_id NULLS LAST, priority DESC, created_at DESC LIMIT 1).
   c. Tính khoảng cách `start_at - now()`. Dựa vào `rule_type` (HOURS/DAYS) check xem lọt vào khung nào (min_value -> max_value).
   d. Chọn ra policy đầu tiên match khung giờ.
4. Tính toán tiền hoàn:
   - refund_base = booking.subtotal_amount - booking.discount_amount
   - refund_amount = FLOOR(refund_base * (refund_percent / 100)) + booking.addon_amount -- (MVP: Phạt trên tiền thuê, hoàn 100% tiền add-on)
   - penalty_amount = booking.total_amount - refund_amount
5. Ghi nhận `booking_cancellations`:
   - Lưu trữ snapshot policy dưới dạng JSON (`applied_rule_json`) để sau này đổi luật thì lịch sử không bị ảnh hưởng.
6. Cập nhật `bookings.status = 'canceled'`.
7. Gửi thông báo In-app cho Customer ("Bạn được hoàn X VND").
8. Gọi Payment Module tạo 1 giao dịch Refund nội bộ (Ghi âm tiền, KHÔNG call MoMo).
```

### Luồng Ngoại Lệ
| # | Điều kiện | Xử lý |
|---|----------|-------|
| E1 | Không tìm thấy policy match | Mặc định refund_percent = 0% (Penalty 100%). Hoặc hệ thống tự set 1 policy Default Global "Hủy muộn 0%". |
| E2 | Trạng thái không hợp lệ | Chỉ cho phép hủy khi `pending_payment` hoặc `confirmed`. Nếu trạng thái là `checked_in`, `completed`, `canceled`, `expired` -> Trả lỗi `400 BOOKING_NOT_CANCELLABLE`. |
