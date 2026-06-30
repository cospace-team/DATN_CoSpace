# 📋 Tổng Hợp Quyết Định Nghiệp Vụ — GOAL Analysis Resolution

> **Mode**: [Plan / Khởi động] — Chốt quyết định
> **Ngày**: 2026-06-30
> **Trạng thái**: Chờ user xác nhận lần cuối

---

## Tóm Tắt Nhanh

| # | Vấn đề | Quyết định | Status |
|---|--------|-----------|--------|
| L1 | Enum mismatch dbdiagram | **Sync → 4 roles** | ✅ Đã fix |
| L2 | Workspace type change | **Khóa khi có booking active** | 📋 Đề xuất |
| L3 | Multi-workspace booking | **1 booking = 1 workspace** | ✅ Chốt |
| L4 | Price calculation | **subtotal = price × unit_count** | ✅ Chốt |
| L5 | Notification strategy | **Email + In-app toast** | 📋 Đề xuất |
| L6 | Matching approach | **Predefined tags (MVP), AI V2+** | 📋 Đề xuất |
| L7 | Matching scope | **Toàn hệ thống, cùng branch = bonus** | ✅ Chốt |
| L8 | Membership tier | **V2+, giữ cột placeholder** | ✅ Chốt |
| L9-L12 | Misc | **Theo đề xuất ban đầu** | ✅ Chốt |

---

## Chi Tiết Từng Quyết Định

### ✅ L1 — Enum `user_role` đã sync

**Hành động đã thực hiện**: Fix [Database_dbdiagram_script](file:///d:/DA/docs/Database_dbdiagram_script) — đổi `admin, staff, customer` (3) → `super_admin, branch_admin, staff, customer` (4) khớp với [migration SQL](file:///d:/DA/database/migration_v1_core_schema.sql#L19).

---

### 📋 L2 — Workspace Type Change: Khóa khi có booking active

**Bạn nói**: "chưa rõ, chọn hướng đa số hệ thống làm, dễ thay đổi sau"

**Đề xuất (hướng phổ biến nhất)**:

> **Rule**: Workspace **KHÔNG ĐƯỢC đổi type** khi còn booking với status ∈ {`pending_payment`, `confirmed`, `checked_in`}

**Lý do**:
- Đây là cách WeWork, IWG, và hầu hết booking systems xử lý
- Tránh edge case: Admin đổi desk → meeting_room → giá thay đổi → booking cũ tính sai tiền
- **Rất dễ nới lỏng sau** (chỉ cần bỏ check ở API layer)

**Implementation**: Chỉ cần 1 query check trước khi cho phép UPDATE workspace:
```sql
-- Block type change if active bookings exist
SELECT COUNT(*) FROM bookings 
WHERE workspace_id = :id 
  AND status IN ('pending_payment', 'confirmed', 'checked_in');
-- Nếu count > 0 → reject type change
```

> Không cần thay đổi schema, chỉ thêm business rule ở API layer.

---

### ✅ L3 — 1 Booking = 1 Workspace

**Bạn chốt**: Đúng, luồng là chọn workspace → đặt chỗ → thanh toán.

**Quy tắc**:
- 1 booking record = 1 workspace
- Nếu team cần 3 bàn → tạo 3 bookings riêng biệt
- Mỗi booking có booking_code, payment, check-in riêng
- **V2+** có thể nhóm bằng `booking_group_id` nếu cần

> Không cần thay đổi schema. Design hiện tại đã đúng.

---

### ✅ L4 — Pricing: Đơn giản, Dễ Mở Rộng

**Bạn chốt**: `subtotal_amount = price × unit_count` cho MVP.

**Khả năng mở rộng giá bậc thang sau này**:

> [!TIP]
> **Rất dễ mở rộng mà không phá schema hiện tại.** Đây là cách:

```
MVP (hiện tại):
  price_policies → 1 giá cố định per (type, duration_unit, branch)
  subtotal = price × unit_count

V2+ Giá bậc thang:
  Thêm bảng price_tiers:
  ┌────────────────────┬───────────┬────────────┬──────────┐
  │ price_policy_id    │ min_units │ max_units  │ price    │
  ├────────────────────┼───────────┼────────────┼──────────┤
  │ policy-desk-hour   │ 1         │ 4          │ 50,000   │
  │ policy-desk-hour   │ 5         │ 10         │ 40,000   │  ← giảm 20%
  │ policy-desk-hour   │ 11        │ NULL       │ 35,000   │  ← giảm 30%
  └────────────────────┴───────────┴────────────┴──────────┘
```

- Schema hiện tại **không cần sửa**
- Chỉ thêm bảng `price_tiers` và update Pricing Service logic
- `bookings` vẫn giữ `subtotal_amount` — chỉ cách tính thay đổi

---

### 📋 L5 — Notification: Email + In-app Toast

**Bạn chốt**: 4 scenario notification đều hợp lý, nên làm đủ.

**Đề xuất MVP notification strategy**:

| Sự kiện | Kênh MVP | Nội dung |
|---------|---------|---------|
| Booking confirmed | ✉️ Email + 🔔 In-app | "Đặt chỗ thành công. Mã: {code}" |
| Payment timeout (15 min) | 🔔 In-app | "Đặt chỗ đã hết hạn thanh toán" |
| Checkout trễ | 🔔 In-app (Staff) | "Khách {name} chưa checkout workspace {code}" |
| Cancel + Refund | ✉️ Email + 🔔 In-app | "Hủy thành công. Hoàn {amount} VND ({percent}%)" |

**Implementation**:
- **In-app**: Toast notification trên FE (không cần bảng DB riêng ở MVP)
- **Email**: Dùng Supabase Edge Function hoặc Spring Boot Mail
- **V2+**: Thêm bảng `notifications` + push notification

> Cần 1 bảng `notifications` không? MVP có thể skip bảng này nếu chỉ dùng email + toast response.

---

### 📋 L6 — Matching: Predefined Tags + Taxonomy

**Bạn đặt vấn đề rất hay**: "FE" và "UI/UX" là 2 tag khác nhau nhưng thực chất liên quan. Free-text tags sẽ không match được.

**Đề xuất 2 tầng**:

#### Tầng 1 — MVP: Predefined Tag System (Admin quản lý)

```
Bảng tags hiện tại đã đủ:
┌──────────────────┬───────────┬──────────┐
│ name             │ category  │ is_active│
├──────────────────┼───────────┼──────────┤
│ Frontend Dev     │ skill     │ true     │
│ Backend Dev      │ skill     │ true     │
│ UI/UX Design     │ skill     │ true     │
│ Marketing        │ skill     │ true     │
│ FinTech          │ industry  │ true     │
│ EdTech           │ industry  │ true     │
│ Networking       │ interest  │ true     │
│ Co-founder       │ interest  │ true     │
└──────────────────┴───────────┴──────────┘
```

- **Admin tạo & quản lý danh sách tags** (không cho user tự tạo)
- User **chọn từ danh sách có sẵn** (multi-select dropdown)
- Matching = đếm tags trùng theo category, tính weighted score

> [!IMPORTANT]
> **Điểm mấu chốt**: User CHỌN tags chứ không TỰ GÕ. Giải quyết hoàn toàn vấn đề "FE vs Frontend" mà bạn lo ngại.

#### Tầng 2 — V2+: AI-Powered Matching

- Dùng embedding model (OpenAI/Gemini) encode profile text (bio, profession, company)
- Tính cosine similarity thay vì tag overlap
- Có thể dùng `pgvector` (đã ghi nhận ở C4-03 trong [DEVELOPMENT_PLAN.md](file:///d:/DA/docs/DEVELOPMENT_PLAN.md#L285))

> Schema hiện tại **không cần sửa gì**. Chỉ thay đổi batch job logic.

---

### ✅ L7 — Matching Scope: Toàn hệ thống + Branch Bonus

**Quy tắc**:
- Matching chạy **toàn hệ thống** (cross-branch)
- Cùng `primary_branch_id` → **cộng bonus** vào score (ví dụ: +0.1)
- Hiển thị: public profile info + contact (nếu `contact_public = true`)
- V2+: Real-time chat giữa matched partners

**Cập nhật formula**:
```
score = (skill_overlap × 0.6) + (interest_overlap × 0.25) + (same_branch × 0.15)
```

---

### ✅ L8 — Membership Tier → V2+

**Quyết định**: Giữ cột `membership_tier` trong schema nhưng **không implement business rules** ở MVP.
- Tất cả user mặc định `standard`
- Không có pricing/access difference giữa standard/premium
- V2+ sẽ define: premium discount, priority booking, exclusive rooms, etc.

> Giữ cột ≠ giữ code. Không cần service logic cho membership ở MVP.

---

### ✅ L9-L12 — Theo Đề Xuất

| # | Quyết định |
|---|-----------|
| L9 | `applied_rule_json` format: `{ "rule_type": "...", "refund_percent": N, "policy_name": "..." }` |
| L10 | MVP query trực tiếp. Nếu chậm → materialized view refresh hàng ngày |
| L11 | SVG upload qua Supabase Storage. Admin upload, map `svg_element_id` thủ công |
| L12 | API trả UTC. FE convert theo `branch.timezone` khi hiển thị |

---

## ⏭️ Bước Tiếp Theo

Sau khi bạn confirm, tôi sẽ:

1. **Cập nhật [SYSTEM_SPEC.md](file:///d:/DA/docs/SYSTEM_SPEC.md)** — bổ sung các quyết định L2-L8 vào mục "Quy Tắc & Ràng Buộc"
2. **Viết Use Case spec chi tiết** cho **Booking Engine** (module phức tạp nhất)
3. **Viết API contract** cho module Booking (Request/Response JSON đầy đủ)
4. **Dùng [Brainstorm nghiệp vụ]** mode để Critique luồng Booking → Payment → Cancel

> Bạn muốn bắt đầu từ module nào trước? Hay theo thứ tự đề xuất (Booking → Payment → Cancel)?
