# API Documentation — Đặt nhiều chỗ cùng lúc (đơn nhóm)

**Base URL:** `http://localhost:8080` · Mọi endpoint cần `Authorization: Bearer <access token>` của khách hàng.

---

## 1. Thiết kế

Khách chọn **1 hoặc nhiều chỗ** (tối đa `app.booking.max-group-size`, mặc định 10) trong **cùng một chi nhánh**, cho **cùng một khung giờ**, rồi thanh toán **một lần**.

| Quyết định | Lý do |
|---|---|
| Mỗi chỗ vẫn là **một đơn `bookings` riêng**, gắn vào nhóm qua `bookings.group_id` | Check-in, gia hạn, dịch vụ gọi thêm, hủy, hoàn tiền, no-show, điểm uy tín… đều đã chạy theo từng đơn. Giữ nguyên nên không phải viết lại các luồng đó. |
| Bảng `booking_groups` (mã `GR-XXXXXX`, chủ đơn, chi nhánh, khung giờ) | Có một mã để khách tra cứu, thanh toán và hủy cả nhóm. |
| **Tất cả hoặc không**: tạo nhóm trong một transaction, chỗ nào lỗi thì cả nhóm bị hủy và báo đúng tên chỗ | Khách không bị kẹt với một nhóm thiếu chỗ phải tự dọn. |
| Khóa advisory theo **thứ tự id cố định** của các chỗ | Hai yêu cầu đặt nhóm chồng nhau không thể deadlock. |
| Thanh toán: **1 đơn hàng PayOS, N dòng `payments`** (mỗi dòng đúng số tiền của một chỗ) dùng chung `group_order_id` | `RefundService` tính "số tiền đã nhận" theo từng đơn. Nhờ đó hủy hay hoàn tiền một chỗ vẫn đúng như đơn lẻ. |
| Webhook / trang trả về / mô phỏng xác nhận **mọi dòng** của đơn hàng | Chỗ nào đã hết hạn hoặc bị hủy khi tiền về thì phần tiền đó tự vào hàng đợi hoàn tiền (quy tắc #26 sẵn có). |
| Giới hạn 3 đơn chờ thanh toán (Rule #33): **một nhóm tính là một đơn** | Đặt 5 chỗ không làm khách bị khóa đặt tiếp. |
| Điểm uy tín dưới 50: chỉ được đặt **1 chỗ** mỗi lần; dưới 30: không đặt online | Đồng bộ với quy tắc "chỉ giữ 1 đơn chưa sử dụng". |
| Mã khuyến mãi **chỉ cho đơn 1 chỗ**; nhóm vẫn giảm theo hạng thành viên | Mã khuyến mãi được đổi theo từng đơn. Áp cho N chỗ sẽ tiêu N lượt hoặc vượt giới hạn của chương trình. |
| Dịch vụ đặt kèm gắn vào **chỗ đầu tiên** | Dịch vụ phục vụ một lần cho cả nhóm. |
| Thanh toán nhóm chỉ qua **VietQR (PayOS)** | Một đơn MoMo ứng với một đơn đặt chỗ. |

Giao diện chỉ cho chọn các chỗ **trên cùng tầng** đang xem. API thì nhận mọi chỗ trong cùng chi nhánh.

### Schema (Migration V6)

```
booking_groups(id, group_code UNIQUE, user_id → users, branch_id → branches, start_at, end_at, created_at)
bookings.group_id            → booking_groups (nullable)
payments.booking_group_id    → booking_groups (nullable)
payments.group_order_id      varchar(64), = order_id của dòng đầu (mã gửi PayOS)
```

---

## 2. Endpoints

### `POST /api/bookings/groups/quote` — báo giá

```json
{ "workspaceIds": ["…", "…"], "unit": "hour", "startAt": "2026-10-03T06:00:00Z", "endAt": "2026-10-03T08:00:00Z",
  "addons": [{ "serviceId": "…", "quantity": 2 }] }
```

Trả về giá từng chỗ (`seats[]`: `pricePerUnit`, `unitCount`, `subtotalAmount`, `discountAmount`, `totalAmount`) và tổng (`subtotalAmount`, `discountAmount`, `addonAmount`, `totalAmount`, `membershipTierName`, `membershipDiscountPercent`).

### `POST /api/bookings/groups` — tạo đơn nhóm → `201`

Body như báo giá với `unit` là `hour|day|week|month`, có thêm `promotionCode` (chỉ hợp lệ khi đặt 1 chỗ). Trả về `GroupResponse`:

```json
{ "id": "…", "groupCode": "GR-EX6BGK", "branchId": "…", "startAt": "…", "endAt": "…",
  "seatCount": 3, "totalAmount": 180000, "amountDue": 180000, "paymentDeadlineAt": "…",
  "bookings": [ /* BookingDto từng chỗ, mỗi chỗ có mã WH-… riêng */ ] }
```

Lỗi `400` thường gặp:
- Danh sách chỗ rỗng hoặc vượt quá số chỗ tối đa.
- Các chỗ khác chi nhánh.
- Dùng mã khuyến mãi khi đặt từ 2 chỗ.
- `Chỗ "Bàn Hotdesk 101": Vị trí đã có người đặt…`.
- Bị giới hạn bởi điểm uy tín hoặc bởi quy tắc tối đa 3 đơn chờ thanh toán.

### `GET /api/bookings/groups/{groupId}` — xem đơn nhóm của mình

### `POST /api/bookings/groups/{groupId}/pay/payos` — một mã VietQR cho cả nhóm

Gộp các chỗ còn `PENDING_PAYMENT` và còn hạn giữ chỗ. Gọi lại khi link cũ vẫn mở cho đúng các chỗ đó thì trả về link cũ, không tạo thêm giao dịch. Response giống `POST /api/payments/payos/create`, trong đó `amount` là tổng tiền.

### `POST /api/bookings/groups/{groupId}/cancel` — hủy cả nhóm

Body tùy chọn `{ "reason": "…" }`. Hủy mọi chỗ còn hủy được trực tuyến (đang chờ thanh toán, hoặc đã thanh toán nhưng chưa tới giờ), mỗi chỗ tính hoàn tiền theo chính sách hủy như đơn lẻ. Trả về `GroupResponse` sau khi hủy.

Từng chỗ vẫn hủy riêng được qua endpoint hủy đơn lẻ sẵn có.

### `BookingDto` (danh sách đơn của tôi)

Thêm `groupId`, `groupCode`, `groupSize` cho các chỗ thuộc nhóm.
