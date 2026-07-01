# 🎯 Phân Tích Khung GOAL — CoSpace Management System

> **Mode**: [Plan / Khởi động] — GOAL Framework
> **Ngày phân tích**: 2026-06-30
> **Nguồn dữ liệu đối chiếu**: [SYSTEM_SPEC.md](file:///d:/DA/docs/SYSTEM_SPEC.md), [DEVELOPMENT_PLAN.md](file:///d:/DA/docs/DEVELOPMENT_PLAN.md), [migration_v1_core_schema.sql](file:///d:/DA/database/migration_v1_core_schema.sql), [Database_dbdiagram_script](file:///d:/DA/docs/Database_dbdiagram_script)

---

## G — Goal (Mục tiêu cốt lõi)

Hệ thống CoSpace phục vụ **2 mục tiêu song song, ngang hàng**:

### Trụ cột 1: Nền tảng Quản lý Vận hành Co-working Space
> Số hóa toàn bộ quy trình vận hành văn phòng chia sẻ — từ quản lý không gian, đặt chỗ, thanh toán đến check-in/check-out — cho phép Ban quản lý (Admin/Staff) vận hành hiệu quả, khách hàng (Customer) tự phục vụ qua web/mobile.

### Trụ cột 2: Mạng lưới Kết nối Đối tác (Partner Network)
> Tạo giá trị gia tăng vượt xa "cho thuê chỗ ngồi" — biến không gian vật lý thành một hệ sinh thái kết nối chuyên môn, nơi các thành viên tìm được đối tác phù hợp dựa trên kỹ năng, sở thích và nhu cầu hợp tác.

### Tầm nhìn MVP
> Một hệ thống **chạy được end-to-end** cho cả 2 trụ cột: Customer đặt phòng → thanh toán → check-in → tìm partner. Admin/Staff quản lý vận hành, cấu hình giá, xem báo cáo. Không cần hoàn hảo, cần **hoàn chỉnh luồng chính**.

---

## O — Objectives (Các luồng nghiệp vụ lớn)

Tôi xác định **8 luồng nghiệp vụ trọng yếu**, xếp theo thứ tự ưu tiên triển khai (dựa trên dependency chain trong [DEVELOPMENT_PLAN.md](file:///d:/DA/docs/DEVELOPMENT_PLAN.md)):

| # | Luồng nghiệp vụ | Module | Sprint | Hiện trạng |
|---|-----------------|--------|--------|-----------|
| 1 | **Identity & Access Management** | Auth, RBAC | 1 | ✅ Schema done, API đang code |
| 2 | **Space Management** | Branch → Floor → Workspace | 2 | ✅ Schema done, cần API + SVG |
| 3 | **Booking Engine** | Đặt chỗ + Hợp đồng + Pricing | 3 | ✅ Schema done, cần API + Rule engine |
| 4 | **Payment & Check-in** | MoMo + Cash + QR check-in | 4 | ✅ Schema done, cần tích hợp |
| 5 | **Cancellation & Refund** | Hủy tự động + hoàn tiền | 5 | ✅ Schema done, cần API |
| 6 | **Partner Matching** | Tags + Scoring + Gợi ý | 5 | ✅ Schema done, cần Batch job + API |
| 7 | **Reports & Dashboard** | Thống kê + Biểu đồ + CSV | 5 | ⬜ Chưa thiết kế chi tiết |
| 8 | **Add-on Services** | Dịch vụ bổ sung | 3 | ✅ Schema done, cần API |

### Nhận xét tổng quan

> [!TIP]
> Database schema (17+ bảng) đã rất hoàn chỉnh với đầy đủ constraints, indexes, và enum types. Đây là nền tảng vững chắc. **Pha tiếp theo nên tập trung vào nghiệp vụ chi tiết (Use Case specs) và API contract** thay vì chỉnh sửa schema.

---

## A — Actions (Kế hoạch hành động cụ thể)

### Bước 1: Hoàn thiện phân tích nghiệp vụ (Bạn + Tôi)

| Việc cần làm | Output | Ưu tiên |
|-------------|--------|---------|
| Viết Use Case spec chi tiết cho **Booking Engine** (UC-BOOK-01 → 04) | `docs/business/use_cases/booking.md` | P0 |
| Viết Use Case spec cho **Payment** (UC-PAY-01 → 03) | `docs/business/use_cases/payment.md` | P0 |
| Viết Use Case spec cho **Cancellation** (UC-CAN-01 → 02) | `docs/business/use_cases/cancellation.md` | P0 |
| Viết Use Case spec cho **Partner Matching** (UC-MAT-01 → 02) | `docs/business/use_cases/matching.md` | P1 |
| Hoàn thiện **User Stories** cho Sprint đang chạy | `docs/business/user_stories/` | P1 |

### Bước 2: Thiết kế cụm bảng Database (Bạn dẫn dắt)

Thứ tự review và bổ sung schema (nếu cần):

```
1. Booking + Pricing (core flow, nhiều constraint nhất)
2. Payment + Payment Events (tích hợp MoMo, idempotency)
3. Cancellation + Refund (business rules phức tạp)
4. Matching (Tags, Scores, batch job)
5. Reports (có cần materialized views? hay query trực tiếp?)
```

### Bước 3: Viết API Contracts chi tiết (Bạn viết — Bạn bạn code)

Theo phương pháp **API-First** trong [working_methodology.md](file:///d:/DA/docs/working_methodology.md):

| Module | File | Nội dung |
|--------|------|---------|
| Booking | `docs/api-contracts/bookings.md` | Request/Response JSON, status codes, error codes |
| Payment | `docs/api-contracts/payments.md` | MoMo flow, webhook format, cash confirm |
| Space | `docs/api-contracts/spaces.md` | Branch/Floor/Workspace CRUD, availability |
| Matching | `docs/api-contracts/matching.md` | Profile CRUD, suggested-partners query |

### Bước 4: Prototype quan trọng nhất trước

| Prototype | Mục đích | Ai làm |
|-----------|---------|--------|
| Booking overlap check | Chứng minh logic chống trùng lịch hoạt động | Backend dev |
| MoMo Sandbox integration | Verify webhook flow E2E | Backend dev |
| SVG Floorplan interactive | Chứng minh render + click workspace | Frontend dev |

### Bước 5: Review & Iterate

- Sau mỗi cụm, chạy **[Brainstorm nghiệp vụ]** mode để Critique
- Cập nhật `task.md` và tài liệu tương ứng

---

## L — Limits (Điểm mờ, lỗ hổng, rủi ro)

> [!CAUTION]
> Đây là phần quan trọng nhất. Tôi phát hiện **12 điểm mờ** sau khi đối chiếu tất cả tài liệu hiện có. Bạn cần trả lời hoặc ra quyết định cho từng điểm.

---

### 🔴 Mức Nghiêm Trọng CAO (Ảnh hưởng trực tiếp đến thiết kế DB/API)

#### L1. Enum `user_role` không khớp giữa dbdiagram và SQL migration

| Nguồn | Giá trị enum |
|-------|-------------|
| [SYSTEM_SPEC.md](file:///d:/DA/docs/SYSTEM_SPEC.md#L48) | `super_admin, branch_admin, staff, customer` (4 roles) |
| [migration SQL](file:///d:/DA/database/migration_v1_core_schema.sql#L19) | `super_admin, branch_admin, staff, customer` ✅ |
| [dbdiagram script](file:///d:/DA/docs/Database_dbdiagram_script#L11-L15) | `admin, staff, customer` ❌ (chỉ 3 roles, thiếu branch_admin) |

> **Câu hỏi**: dbdiagram script đã outdated so với migration SQL đúng không? Cần sync lại?

---

#### L2. Chính sách giá khi workspace thay đổi loại (Type Change)

- `price_policies` gắn theo `workspace_type_id` + `duration_unit`
- Nếu Admin đổi type của 1 workspace (desk → meeting_room), booking cũ có bị ảnh hưởng giá không?
- **Hiện tại**: Chưa có rule rõ ràng. MVP nên **khóa type change khi có booking active** hay tính lại giá?

> **Câu hỏi**: Workspace đã có booking active có được phép thay đổi type không?

---

#### L3. Multi-workspace booking (đặt nhiều workspace trong 1 lần)

- Mô tả chỉ nói "đặt chỗ" nhưng không rõ: 1 booking = 1 workspace hay 1 booking có thể gồm nhiều workspace?
- Schema hiện tại: `bookings.workspace_id` là **single FK** → 1 booking = 1 workspace
- Nếu muốn multi: cần bảng `booking_items` (giống order_items trong e-commerce)

> **Câu hỏi**: MVP chấp nhận 1 booking = 1 workspace? Nếu customer muốn đặt 3 bàn cho team, tạo 3 booking riêng?

---

#### L4. Quy tắc tính giá khi `unit_count > 1` chưa rõ

- `bookings` có `unit_count` (số đơn vị: 2 giờ, 3 ngày...)
- Nhưng `price_policies` chỉ có `price` (giá/đơn vị)
- `subtotal_amount = price × unit_count`? Hay có thể có **giá bậc thang** (10 giờ rẻ hơn 1 giờ × 10)?

> **Câu hỏi**: MVP dùng công thức đơn giản `subtotal = price × unit_count`? Không giảm giá theo số lượng?

---

### 🟡 Mức Trung Bình (Cần clarify trước khi code API)

#### L5. Notification Engine hoàn toàn vắng mặt ở MVP

Nhiều flow cần notification nhưng MVP không có:
- Payment timeout → thông báo customer
- Checkout trễ → thông báo staff
- Booking confirmed → gửi booking_code
- Cancel → thông báo kết quả refund

> **Câu hỏi**: MVP dùng gì để "thông báo"? Email? In-app notification? Hay chỉ hiện kết quả trên UI response?

---

#### L6. Matching Score Formula cần làm rõ hơn

- SYSTEM_SPEC nói: `skill overlap × 0.7 + interest overlap × 0.3`
- Nhưng "overlap" là gì chính xác?
  - Số tag trùng / tổng tag? (Jaccard similarity)
  - Có tính `level` (1-5) và `priority` (1-5) vào score không?
  - 2 user cùng tag "Python" nhưng level 1 vs level 5 → match score khác nhau?

> **Câu hỏi**: Có nên tính weighted score dựa trên level/priority, hay chỉ đếm số tag trùng đơn giản?

---

#### L7. Scope hiển thị "Gợi ý đối tác"

- Gợi ý trong **cùng chi nhánh** hay **toàn hệ thống**?
- Customer chưa từng booking (chưa có primary_branch) thì match với ai?
- Có giới hạn top N gợi ý không?

> **Câu hỏi**: Matching scope = cùng primary_branch? Cùng branch đang/đã booking? Hay toàn hệ thống?

---

#### L8. `membership_tier` (standard/premium) không có business rule

- Enum `membership_tier` tồn tại trong schema nhưng **không có nghiệp vụ nào sử dụng** trong SYSTEM_SPEC
- Không có: premium discount, ưu tiên đặt phòng, giới hạn booking/tháng...

> **Câu hỏi**: `membership_tier` là placeholder cho V2+ hay cần business rules ở MVP? Nếu V2+ thì nên remove khỏi MVP schema để tránh confusion?

---

### 🟢 Mức Thấp (Ghi nhận, có thể xử lý sau)

#### L9. `applied_rule_json` trong `booking_cancellations` — format chưa define

- Cột này snapshot chính sách hủy tại thời điểm áp dụng, nhưng chưa có JSON schema cụ thể
- Cần define rõ structure để đảm bảo tính nhất quán khi query

> **Đề xuất**: Define format: `{ "rule_type": "...", "min_value": N, "max_value": N, "refund_percent": N, "policy_name": "..." }`

---

#### L10. Report Dashboard — Query strategy chưa rõ

- SYSTEM_SPEC nói "query trực tiếp từ bookings/payments, không bảng riêng"
- Với lượng dữ liệu lớn, query trực tiếp có thể chậm
- Có cần **materialized views** cho các metric thường xuyên (doanh thu tháng, occupancy rate)?

> **Đề xuất**: MVP query trực tiếp. Nếu chậm ở demo, tạo materialized view refresh hàng ngày.

---

#### L11. SVG Floorplan — workflow tạo và cập nhật

- `floors.svg_url` bắt buộc, nhưng:
  - SVG upload ở đâu? (local storage? S3? Supabase Storage?)
  - Ai vẽ SVG? (tool nào?)
  - Khi thêm workspace mới, SVG có tự cập nhật hay phải upload lại?

> **Đề xuất**: Dùng Supabase Storage. Admin upload SVG, map `svg_element_id` thủ công.

---

#### L12. Timezone handling khi đặt chỗ cross-branch

- `branches.timezone` có thể khác nhau (TP.HCM vs Đà Nẵng)
- `bookings.start_at` và `end_at` dùng `timestamptz` — tốt!
- Nhưng **hiển thị trên FE** cần convert theo timezone của branch, không phải timezone của user

> **Đề xuất**: API luôn trả UTC. FE convert theo `branch.timezone` khi hiển thị.

---

## 📊 Tổng Kết Limits — Priority Matrix

| # | Vấn đề | Mức độ | Cần trả lời trước khi |
|---|--------|--------|----------------------|
| L1 | Enum mismatch dbdiagram vs SQL | 🔴 | Sync tài liệu |
| L2 | Workspace type change rule | 🔴 | Code Space API |
| L3 | Multi-workspace booking | 🔴 | Code Booking API |
| L4 | Price calculation formula | 🔴 | Code Pricing Service |
| L5 | Notification strategy | 🟡 | Code Payment/Cancel API |
| L6 | Matching score formula | 🟡 | Code Matching batch job |
| L7 | Matching scope | 🟡 | Code Matching API |
| L8 | Membership tier usage | 🟡 | Dọn dẹp schema |
| L9 | Cancel rule JSON format | 🟢 | Code Cancel API |
| L10 | Report query strategy | 🟢 | Code Dashboard |
| L11 | SVG upload workflow | 🟢 | Code Space FE |
| L12 | Timezone display | 🟢 | Code Booking FE |

---

## ⏭️ Bước Tiếp Theo Đề Xuất

Sau khi bạn trả lời **L1 → L8** (8 câu hỏi mức 🔴 và 🟡), tôi sẽ:

1. **Sync lại toàn bộ tài liệu** (fix inconsistency)
2. **Viết Use Case spec chi tiết** cho Booking Engine (module phức tạp nhất, nhiều dependency nhất)
3. **Dùng mode [Brainstorm nghiệp vụ]** để Critique luồng Booking → Payment → Cancel
4. **Thiết kế API contracts** cho module đầu tiên

> Bạn muốn trả lời L1-L8 ngay, hay muốn tôi chuyển sang mode **[Brainstorm nghiệp vụ]** để cùng thảo luận từng điểm?
