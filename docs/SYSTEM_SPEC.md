# Hệ Thống Quản Lý Co-Working Space — Đặc Tả Hệ Thống

**Ngày cập nhật**: 18/05/2026  
**Giai đoạn**: MVP  
**Stack**: Spring Boot Backend + React/TypeScript Frontend + PostgreSQL

---

## 1. Tổng Quan

### 1.1 Mô Tả

Hệ thống hỗ trợ ban quản lý và khách hàng trong việc quản lý và sử dụng hiệu quả các dịch vụ của văn phòng chia sẻ (co-working space). Bao gồm quản lý thông tin không gian làm việc, phòng họp, chỗ ngồi, gói dịch vụ, khách hàng và các hợp đồng thuê.

Hệ thống cung cấp chức năng đặt chỗ và đăng ký sử dụng dịch vụ theo giờ/ngày/tuần/tháng, theo dõi tình trạng sử dụng không gian, quản lý lịch sử đặt chỗ và thanh toán. Hệ thống hỗ trợ thống kê và báo cáo tình hình khai thác không gian, doanh thu và mức độ sử dụng dịch vụ.

Ngoài ra, hệ thống hỗ trợ kết nối và tìm kiếm đối tác (partner) giữa các thành viên trong không gian làm việc chung. Người dùng có thể khai báo thông tin cá nhân, lĩnh vực chuyên môn, kỹ năng, nhu cầu hợp tác và từ khóa quan tâm. Dựa trên các thông tin này, hệ thống gợi ý các thành viên phù hợp.

Hệ thống cung cấp cổng thông tin trên nền tảng web (responsive, tương thích mobile), cho phép người dùng đặt chỗ, quản lý lịch sử sử dụng dịch vụ, tìm kiếm đối tác phù hợp và tương tác với cộng đồng.

### 1.2 Phạm Vi MVP

| Trạng thái | Chức năng |
|------------|-----------|
| ✅ | Quản lý không gian (branch → floor → workspace) |
| ✅ | Đặt chỗ chống trùng lịch + bảo trì |
| ✅ | Thanh toán (MoMo + tiền mặt) |
| ✅ | Hủy tự động theo chính sách + hoàn tiền nội bộ |
| ✅ | Check-in / Check-out bằng booking code |
| ✅ | Giá cơ bản (global default + branch override) |
| ✅ | Dịch vụ bổ sung (global + branch override) |
| ✅ | Gợi ý đối tác (matching partner) |
| ✅ | Đăng ký/Đăng nhập (Email+Password & Google SSO) |
| ✅ | 4 vai trò phân quyền |
| ✅ | Lịch sử hành động (audit logs) |
| ✅ | Hợp đồng thuê dài hạn (tuần/tháng) |
| ✅ | Thống kê & báo cáo cơ bản (dashboard + biểu đồ + filter + CSV export) |
| ❌ | Chat/messaging (V2+) |
| ❌ | Lịch sử giá/chính sách (V2+) |
| ❌ | PDF export báo cáo (V2+) |

---

## 2. Vai Trò & Phân Quyền (4 Roles)

| Vai trò | DB Enum | branch_id | Phạm vi |
|---------|---------|-----------|---------|
| **Quản trị hệ thống** | `super_admin` | NULL | Toàn bộ hệ thống |
| **Quản lý chi nhánh** | `branch_admin` | required | Chi nhánh được gán |
| **Nhân viên** | `staff` | required | Chi nhánh được gán |
| **Khách hàng** | `customer` | NULL | Sử dụng dịch vụ |

### 2.1 Khách Hàng (Customer)

**Tài khoản:**
- Đăng ký bằng email/số điện thoại + mật khẩu, hoặc Google SSO
- Đăng nhập bằng tài khoản đã tạo hoặc Google SSO
- Xem và chỉnh sửa hồ sơ cá nhân (bio, kỹ năng, sở thích, liên hệ)

**Tìm kiếm & đặt chỗ:**
- Xem danh sách chi nhánh, tầng, sơ đồ mặt bằng (SVG floorplan)
- Tìm kiếm và lọc không gian theo loại, thời gian, sức chứa
- Kiểm tra tình trạng còn trống và đặt chỗ

**Thanh toán & quản lý:**
- Thanh toán trực tuyến qua MoMo hoặc tiền mặt tại quầy (nhân viên xác nhận)
- Xem lịch sử đặt chỗ và giao dịch thanh toán
- Gửi yêu cầu hủy đặt chỗ (hệ thống tự động tính refund theo chính sách, thông báo kết quả)

**Dịch vụ & tương tác:**
- Chọn thêm dịch vụ bổ sung (đồ uống, in ấn, v.v.) vào đơn đặt chỗ
- Xem danh sách đối tác gợi ý dựa trên kỹ năng/sở thích

### 2.2 Nhân Viên (Staff)

**Hỗ trợ khách hàng:**
- Tạo booking thay mặt khách hàng (source = counter)
- Xác nhận booking đã thanh toán tiền mặt

**Vận hành tại chi nhánh:**
- Check-in/check-out cho khách bằng mã đặt chỗ
- Nhận thông báo nếu khách không checkout đúng giờ
- Tạo lịch bảo trì cho workspace
- Xem dashboard vận hành trong ngày

### 2.3 Quản Lý Chi Nhánh (Branch Admin)

**Quản lý kinh doanh:**
- Thiết lập bảng giá cho chi nhánh (override global defaults)
- Thiết lập giá dịch vụ bổ sung cho chi nhánh
- Xem dashboard chi nhánh: occupancy rate, doanh thu, top services
- Xem báo cáo dạng bảng + biểu đồ, filter theo thời gian
- Export dữ liệu CSV
- Xem lịch sử hoạt động chi nhánh

**Quản lý nội bộ:**
- Tạo, chỉnh sửa, khóa tài khoản staff thuộc chi nhánh
- Cấu hình thông tin chi nhánh, tầng, workspace

### 2.4 Quản Trị Hệ Thống (System Admin)

**Cấu hình & giám sát:**
- Quản lý danh mục dùng chung: chi nhánh, workspace types, chính sách mặc định, loại dịch vụ
- Xem dashboard tổng hợp toàn hệ thống: tổng booking, doanh thu, occupancy, so sánh chi nhánh
- Xem báo cáo dạng bảng + biểu đồ, filter theo chi nhánh/thời gian, export CSV
- Xem Audit Log toàn hệ thống (ai, làm gì, khi nào, ở chi nhánh nào)
- Quản lý tất cả tài khoản người dùng và phân quyền

---

## 3. Kiến Trúc & Module

### 3.1 Identity & Access

| Bảng | Mô tả | Cột chính |
|------|-------|-----------|
| **users** | Tài khoản người dùng | email (citext), role, branch_id, status |
| **auth_accounts** | OAuth providers | user_id (NOT UNIQUE), provider, provider_user_id |
| **profiles** | Hồ sơ cá nhân | bio, profession, company, contact_public, primary_branch_id |

**Authentication (Supabase Auth):**
- Supabase quản lý toàn bộ auth: password hashing, Google OAuth, JWT token
- `password_hash` trong bảng `users` **KHÔNG DÙNG** ở MVP (Supabase tự lưu password)
- FE dùng `@supabase/supabase-js` để login → nhận JWT → gửi cho BE
- BE verify JWT với `issuer-uri` của Supabase → tìm user trong bảng `users`
- `auth_accounts.user_id` không UNIQUE → 1 user có thể link nhiều provider

**Role mapping (BE → FE):**
- DB lưu 4 roles: `super_admin`, `branch_admin`, `staff`, `customer`
- BE endpoint `/api/auth/me` map: `super_admin` → `admin`, `branch_admin` → `admin`
- FE nhận 3 roles: `admin`, `staff`, `customer` — phân biệt admin/branch_admin bằng `branchId`
- `CHECK (role IN ('super_admin','customer') AND branch_id IS NULL) OR (role IN ('branch_admin','staff') AND branch_id IS NOT NULL)`

### 3.2 Space Management

| Bảng | Mô tả | Cột chính |
|------|-------|-----------|
| **branches** | Chi nhánh | code (unique), name, address, timezone, open_time, close_time, status |
| **floors** | Tầng | branch_id, floor_no, svg_url (bắt buộc), is_published |
| **workspace_types** | Loại không gian | code (desk/meeting_room/private_office), name, capacity_default |
| **amenities** | Tiện ích phòng | name, icon_name, is_active |
| **workspace_type_amenities** | Tiện ích của Loại phòng | workspace_type_id, amenity_id, quantity |
| **workspaces** | Không gian làm việc | floor_id, type_id, code, svg_element_id, capacity, status |
| **workspace_maintenance** | Lịch bảo trì | workspace_id, [start_at, end_at), reason, status |

- **Template/Variant Pattern**: Tiện ích (Amenities) được gán ở mức `workspace_types`. Mọi phòng (`workspaces`) thuộc loại đó sẽ tự động thừa hưởng các tiện ích chung, giúp tối ưu thao tác nhập liệu.
- `(branch_id, floor_no)` UNIQUE — mỗi tầng duy nhất trong chi nhánh
- `(floor_id, code)` UNIQUE + `(floor_id, svg_element_id)` UNIQUE

### 3.3 Booking Engine

| Bảng | Mô tả | Cột chính |
|------|-------|-----------|
| **bookings** | Đơn đặt chỗ / hợp đồng thuê | booking_code, user_id, workspace_id, branch_id, [start_at, end_at), duration_unit, is_contract, status, price breakdown |
| **checkin_logs** | Check-in/out | booking_id, staff_user_id, checkin_at, checkout_at |

**Đặt chỗ vs Hợp đồng thuê:**
- `duration_unit` = hour/day → **Đặt chỗ ngắn hạn** (`is_contract = false`)
- `duration_unit` = week/month → **Hợp đồng thuê dài hạn** (`is_contract = true`, tự động set)
- Cùng bảng `bookings`, cùng API, cùng flow — chỉ khác duration và có thể áp cancellation policy riêng
- Giao diện: tab "Đặt chỗ" (giờ/ngày) và tab "Thuê dài hạn" (tuần/tháng)

**Booking status flow:**
```
pending_payment → confirmed → checked_in → completed (Staff checkout hoặc Auto EOD)
                                         ↘ canceled (Khách yêu cầu hoàn tiền sớm)
pending_payment → expired (15 min timeout)
pending_payment → canceled (Khách tự hủy / Auto-cancel bảo trì)
```

**Constraints:**
- `total_amount = subtotal_amount - discount_amount + addon_amount`
- `end_at > start_at`
- Mỗi booking chỉ 1 checkin mở (`checkout_at IS NULL`) — partial unique index

### 3.4 Payment

| Bảng | Mô tả | Cột chính |
|------|-------|-----------|
| **payments** | Giao dịch thanh toán | booking_id, provider (momo/cash), method, amount, status, order_id |
| **payment_events** | Webhook events | payment_id, idempotency_key (unique), payload_json, processed |

**Payment status flow:**
```
initiated → paid (MoMo webhook success)
initiated → failed / expired
pending → paid (Staff xác nhận cash)
```

- `idempotency_key` unique — chống webhook lặp
- `created_by_staff_id` — ghi nhận staff nào xác nhận cash
- 1 booking có thể có nhiều payment attempts

### 3.5 Pricing

| Bảng | Mô tả | Cột chính |
|------|-------|-----------|
| **price_policies** | Bảng giá | branch_id (nullable), workspace_type_id, duration_unit, price, is_active |

- `branch_id = NULL` → global default
- `branch_id = <id>` → branch-specific (override)
- Query: ưu tiên branch-specific, fallback global
- MVP: Chỉ giá hiện tại, không lịch sử/effective_dates

### 3.6 Add-on Services

| Bảng | Mô tả | Cột chính |
|------|-------|-----------|
| **extra_services** | Dịch vụ bổ sung | branch_id (nullable), code, name, service_type, unit, price |
| **booking_services** | Dịch vụ trong booking | booking_id, extra_service_id, quantity, unit_price (snapshot), line_total |

- Scope giống pricing: `branch_id = NULL` → global, khác → branch-specific
- Cho phép nhiều dòng cùng service per booking (Running Tab model). Mỗi lần gọi thêm = 1 dòng mới, kèm `added_by_staff_id` để truy vết

### 3.7 Cancellation & Refund (Tự Động)

| Bảng | Mô tả | Cột chính |
|------|-------|-----------|
| **cancellation_policies** | Chính sách hủy | rule_type, min/max_value, refund_percent, priority, branch_id, workspace_type_id |
| **booking_cancellations** | Ghi nhận hủy | booking_id, policy_id, refund_amount, penalty_amount, applied_rule_json |

**Rule types:**
- `GRACE_HOURS`: Hủy trong N giờ đầu sau khi đặt → refund %
- `BEFORE_START_DAYS`: Hủy N ngày trước start_at → refund %

**Luồng tự động:**
1. Khách gửi yêu cầu hủy
2. Hệ thống tìm policy phù hợp (ưu tiên branch → global, priority DESC)
3. Tính refund_amount = total_amount × refund_percent / 100
4. Ghi nhận `refund_status = confirmed` ngay (không cần admin xét duyệt)
5. Thông báo khách: chính sách áp dụng + số tiền hoàn
6. MVP: Chỉ ghi nhận nội bộ, không payout MoMo thực tế

### 3.8 Partner Matching

| Bảng | Mô tả | Cột chính |
|------|-------|-----------|
| **tags** | Thẻ kỹ năng/sở thích | name (unique), category (skill/interest/industry) |
| **profile_skills** | Kỹ năng user | profile_user_id, tag_id, level (1-5) |
| **profile_interests** | Sở thích user | profile_user_id, tag_id, priority (1-5) |
| **profile_match_scores** | Điểm matching | profile_user_id, matched_user_id, score, reasons_json |

- `profile_user_id <> matched_user_id` — không tự match
- Batch job tính score → API `/suggested-partners`
- Contact chỉ hiển thị nếu `contact_public = true`
- MVP: Chỉ gợi ý, không chat (V2+)

**Tags — Predefined System (MVP):**
- Admin tạo & quản lý danh sách tags (user KHÔNG tự tạo)
- User chọn tags từ danh sách có sẵn (multi-select)
- V2+: AI-Powered Matching dùng embedding + cosine similarity

**Matching Formula (MVP):**
```
score = (skill_overlap × 0.6) + (interest_overlap × 0.25) + (same_branch_bonus × 0.15)
```
- `skill_overlap` = số skill tags trùng / tổng skill tags (Jaccard)
- `interest_overlap` = số interest tags trùng / tổng interest tags (Jaccard)
- `same_branch_bonus` = 1.0 nếu cùng `primary_branch_id`, 0.0 nếu khác
- Scope: **Toàn hệ thống** (cross-branch), cùng branch = bonus

### 3.9 Notification (In-app)

| Bảng | Mô tả | Cột chính |
|------|-------|-----------|
| **notifications** | Thông báo trong app | user_id, type, title, message, data_json, is_read |

**Notification triggers:**
- Booking confirmed → gửi booking_code cho customer
- Payment timeout (15 min) → thông báo customer
- Checkout trễ → thông báo staff
- Cancel + Refund → thông báo kết quả cho customer

- MVP: In-app notification only (bảng `notifications` + API đọc/đánh dấu đã đọc)
- V2+: Email notification, push notification

### 3.10 Audit

| Bảng | Mô tả | Cột chính |
|------|-------|-----------|
| **audit_logs** | Lịch sử hành động | actor_user_id, branch_id, action, target_table, target_id, request_id, action_result, metadata |

- Ghi lại: ai, làm gì, khi nào, ở chi nhánh nào, kết quả
- Index: `(branch_id, created_at DESC)` cho query theo chi nhánh

---

## 4. Luồng Nghiệp Vụ

### 4.1 Đăng Ký / Đăng Nhập

```
[Email+Password]
  Khách nhập email + password → tạo user (role=customer, branch_id=null)
  → tạo profile mặc định → đăng nhập thành công

[Google SSO]
  Khách click Google → OAuth callback
  → tìm/tạo user + auth_account → đăng nhập thành công

[Redirect theo role]
  customer → /bookings
  staff → /staff/dashboard
  branch_admin → /branch/dashboard
  super_admin → /admin/dashboard
```

### 4.2 Đặt Chỗ + Thanh Toán MoMo (Dành cho Customer)

```
Customer chọn workspace (kiểm tra overlap + maintenance)
→ Booking (pending_payment) + Payment (initiated)
→ MoMo pay_url (15 min timeout)
→ Khách thanh toán → MoMo webhook callback (idempotency check)
→ Payment (paid) + Booking (confirmed)
→ Gửi booking_code cho customer
```

### 4.3 Đặt Chỗ + Thanh Toán Tiền Mặt (Chỉ dành cho Staff)

```
Staff tạo booking cho khách tại quầy (source=counter)
→ Booking (pending) + Payment (pending)
→ Staff nhận tiền mặt và xác nhận thu tiền trên hệ thống
→ Payment (paid) + Booking (confirmed) + booking_code gửi cho khách
* Lưu ý: Customer tự đặt chỗ qua web/app KHÔNG ĐƯỢC phép chọn thanh toán Tiền mặt.
```

### 4.4 Check-in / Check-out

```
Staff nhập booking_code
→ Validate: confirmed, đúng thời gian, chưa check-in
→ Tạo checkin_logs (checkin_at) + Booking (checked_in)
→ Customer làm việc
→ Staff checkout → checkin_logs.checkout_at + Booking (completed)
→ Nếu khách không checkout đúng giờ → thông báo staff
```

### 4.5 Hủy & Hoàn Tiền (Tự Động)

```
Customer gửi yêu cầu hủy
→ Hệ thống tìm cancellation_policy (ưu tiên branch → global, priority DESC)
→ Tính refund% và refund_amount
→ Ghi booking_cancellations (refund_status = confirmed ngay)
→ Thông báo khách: chính sách áp dụng + số tiền hoàn
→ Booking (canceled)
→ Ghi nhận nội bộ (không payout MoMo thực tế ở MVP)
```

### 4.6 Tìm Đối Tác (Matching)

```
Customer cập nhật profile → chọn skills/interests từ danh sách tags có sẵn
→ Batch job tính match_scores:
    score = (skill_overlap × 0.6) + (interest_overlap × 0.25) + (same_branch × 0.15)
→ API /suggested-partners → danh sách partner + score + reasons
→ Contact chỉ hiển thị nếu contact_public = true
→ Scope: toàn hệ thống, cùng branch = bonus score
```

### 4.7 Cấu Hình (Admin / Branch Admin)

```
[System Admin]
  Tạo branch → Tạo workspace_types → Tạo cancellation_policies (global)
  → Tạo extra_services (global) → Tạo price_policies (global default)
  → Tạo Branch Admin (gán branch_id)

[Branch Admin]  
  Cấu hình branch info → Tạo floors (+ SVG) → Tạo workspaces
  → Override price_policies (branch-specific)
  → Override extra_services (branch-specific)
  → Tạo staff (gán branch_id cùng chi nhánh)
```

---

## 5. API Endpoints

### Auth
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| POST | /auth/register | Đăng ký (email+password) | Public |
| POST | /auth/login | Đăng nhập (email+password) | Public |
| POST | /auth/login/google | Đăng nhập Google SSO | Public |
| GET | /auth/me | Thông tin user hiện tại | All |

### Space
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| GET | /branches | Danh sách chi nhánh | All |
| GET | /branches/{id}/floors | Danh sách tầng | All |
| GET | /floors/{id}/workspaces | Danh sách workspace | All |
| GET | /workspaces/available | Tìm workspace trống | Customer |
| POST | /workspaces/{id}/maintenance | Tạo bảo trì | Staff |

### Booking
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| POST | /bookings | Tạo booking | Customer, Staff |
| GET | /bookings/{id} | Chi tiết booking | Owner, Staff, Admin |
| GET | /bookings/history | Lịch sử đặt chỗ | Customer, Branch Admin |
| POST | /bookings/{id}/cancel | Hủy booking (tự động) | Customer |
| POST | /bookings/{id}/services | Thêm dịch vụ vào booking | Customer |

### Payment
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| POST | /payments/momo/create | Tạo thanh toán MoMo | Customer |
| POST | /payments/momo/webhook | MoMo webhook callback | System |
| POST | /payments/cash/confirm | Xác nhận tiền mặt | Staff |
| GET | /payments/history | Lịch sử thanh toán | Customer |

### Check-in
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| POST | /checkin | Check-in (booking_code) | Staff |
| POST | /checkout | Check-out | Staff |

### Add-on & Matching
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| GET | /extra-services | Danh sách dịch vụ phụ | All |
| GET/PUT | /profiles/{id} | Hồ sơ cá nhân | Owner |
| GET | /suggested-partners | Gợi ý đối tác | Customer |

### Branch Admin
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| PUT | /branch/config | Cấu hình chi nhánh | Branch Admin |
| POST/PUT | /branch/staff | Quản lý staff | Branch Admin |
| POST/PUT | /branch/price-policies | Giá chi nhánh | Branch Admin |
| POST/PUT | /branch/extra-services | Dịch vụ chi nhánh | Branch Admin |
| POST/PUT | /branch/floors | Tầng chi nhánh | Branch Admin |
| POST/PUT | /branch/workspaces | Workspace chi nhánh | Branch Admin |

### System Admin
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| POST/PUT | /admin/branches | Quản lý chi nhánh | System Admin |
| POST/PUT | /admin/workspace-types | Loại workspace | System Admin |
| POST/PUT | /admin/cancellation-policies | Chính sách hủy | System Admin |
| GET/POST/PUT | /admin/users | Quản lý tài khoản | System Admin |
| GET | /admin/audit-logs | Audit log toàn hệ thống | System Admin |

### Staff
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| GET | /staff/dashboard | Dashboard vận hành | Staff |

### Reports & Statistics
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| GET | /reports/overview | Tổng hợp: tổng booking, doanh thu, occupancy | Branch Admin, System Admin |
| GET | /reports/revenue | Doanh thu theo thời gian (filter: branch, date range) | Branch Admin, System Admin |
| GET | /reports/occupancy | Tỷ lệ sử dụng workspace (filter: branch, workspace type) | Branch Admin, System Admin |
| GET | /reports/services | Top dịch vụ bổ sung (filter: branch, date range) | Branch Admin, System Admin |
| GET | /reports/bookings | Thống kê booking (ngắn hạn vs dài hạn, filter) | Branch Admin, System Admin |
| GET | /reports/export/csv | Export dữ liệu báo cáo ra CSV | Branch Admin, System Admin |

---

## 6. Database Schema

### 6.1 Tổng Quan (17+ bảng)

| Module | Bảng |
|--------|------|
| Identity | `users`, `auth_accounts`, `profiles` |
| Space | `branches`, `floors`, `workspace_types`, `workspaces`, `workspace_maintenance` |
| Booking | `bookings`, `checkin_logs` |
| Payment | `payments`, `payment_events` |
| Pricing | `price_policies` |
| Add-on | `extra_services`, `booking_services` |
| Cancellation | `cancellation_policies`, `booking_cancellations` |
| Matching | `tags`, `profile_skills`, `profile_interests`, `profile_match_scores` |
| Notification | `notifications` |
| Audit | `audit_logs` |

### 6.2 Enum Types

| Enum | Values |
|------|--------|
| `user_role` | super_admin, branch_admin, staff, customer |
| `user_status` | active, suspended |
| `branch_status` | active, inactive |
| `workspace_status` | active, maintenance, inactive |
| `maintenance_status` | scheduled, active, done, canceled |
| `booking_status` | pending_payment, confirmed, checked_in, completed, canceled, expired |
| `booking_source` | web, mobile, counter, admin |
| `payment_provider` | momo, cash |
| `payment_method` | ewallet, qr, cash |
| `payment_status` | initiated, pending, paid, failed, expired, canceled, refunded |
| `duration_unit` | hour, day, week, month |
| `cancel_rule_type` | GRACE_HOURS, BEFORE_START_DAYS |
| `refund_status` | none, pending, confirmed, rejected |
| `tag_category` | skill, interest, industry |
| `service_type` | drink, meal, printing, other |
| `membership_tier` | standard, premium |

### 6.3 Key Constraints & Indexes

| Constraint | Mô tả |
|-----------|-------|
| `check_branch_by_role` | super_admin/customer → branch_id NULL; staff/branch_admin → NOT NULL |
| `check_booking_time` | end_at > start_at |
| `check_booking_amounts` | total = subtotal - discount + addon |
| `check_maintenance_time` | end_at > start_at |
| `check_payment_amount` | amount >= 0 |
| `check_policy_percent` | refund_percent [0, 100] |
| `check_skill_level` | level [1, 5] |
| `check_no_self_match` | profile_user_id <> matched_user_id |
| `uq_checkin_open` | Partial unique: 1 checkin mở per booking |
| `idempotency_key` UNIQUE | Webhook chống lặp |
| `idx_bookings_workspace_time` | Query overlap nhanh |

---

## 7. Quy Tắc & Ràng Buộc

1. **Chống trùng lịch**: Advisory Lock + kiểm tra overlap ở app-layer, không DB EXCLUDE constraint. Quy trình: (1) `pg_advisory_xact_lock(hashtext('booking:' || workspace_id))` → (2) kiểm tra overlap booking + maintenance → (3) INSERT booking. Advisory lock ngăn race condition khi 2 request đồng thời đặt workspace trống (chưa có booking row để lock)
2. **Branch consistency**: booking.branch_id = workspace.floor.branch_id
3. **Maintenance block**: Booking không overlap maintenance (status ∈ {scheduled, active})
4. **Payment timeout**: pending_payment auto-expire sau 15 phút
5. **Hủy tự động**: Tính refund% theo policy, confirmed ngay, thông báo khách
6. **Idempotency**: payment_events.idempotency_key unique (webhook chống lặp)
7. **Staff scope**: Staff chỉ thao tác chi nhánh của mình
8. **Branch Admin scope**: Branch Admin chỉ quản lý chi nhánh được gán
9. **Một check-in mở**: Mỗi booking tối đa 1 checkin_logs với checkout_at = null
10. **Giá hiện tại**: Không lịch sử/effective_dates ở MVP
11. **Pricing fallback**: Branch-specific → Global default
12. **Tiền tệ**: VND
13. **Phương thức thanh toán**: Customer chỉ được dùng MoMo. Chỉ Staff/Admin mới được tạo đơn bằng Tiền mặt tại quầy.
14. **1 booking = 1 workspace**: Nếu cần nhiều workspace → tạo nhiều booking riêng biệt.
15. **Pricing đơn giản**: `subtotal = price × unit_count`. Giá bậc thang → V2+ (thêm bảng `price_tiers`).
16. **Workspace type lock**: KHÔNG cho đổi workspace type khi còn booking active (pending_payment/confirmed/checked_in). Phải được thực thi ở App Layer khi gọi API `PUT /workspaces/{id}` bằng cách kiểm tra bảng `bookings`.
17. **Tags predefined**: Admin quản lý danh sách tags. User chỉ chọn, không tự tạo.
18. **Matching scope**: Toàn hệ thống, cùng `primary_branch_id` = bonus score (+0.15).
19. **Membership tier**: V2+ — không implement business rules ở MVP, tất cả user = `standard`. (Placeholder cho việc mở rộng).
20. **Notification**: In-app notification qua bảng `notifications`. Email → V2+.
21. **Timezone**: API trả UTC. FE convert theo `branch.timezone`.
22. **SVG Storage**: Upload qua Supabase Storage. Khi cập nhật bản đồ (tăng `map_version`), CHỈ cho phép thêm mới hoặc giữ nguyên SVG ID cũ. Nếu một không gian vật lý bị xóa, phải đánh dấu `workspace.status = 'inactive'` thay vì xóa cứng để tránh mồ côi dữ liệu lịch sử.
23. **Cancel rule snapshot**: `applied_rule_json` format: `{ "rule_type", "refund_percent", "policy_name", "min_value", "max_value" }`.
24. **Kiểm tra Overlap (Trùng lịch)**: App Layer và DB Script không nên dùng hàm `OVERLAPS` vì dễ dính biên, phải dùng logic rõ ràng: `(new.start_at < existing.end_at AND new.end_at > existing.start_at)`.
25. **Identity Auth Sync**: Bất kỳ thay đổi Auth nào (như đổi email) phải thực hiện qua API của CoSpace Backend. BE sẽ đồng thời gọi Admin API của Supabase và update DB nội bộ để đảm bảo đồng bộ.
26. **Late Webhook (Ghost Payment)**: Khách lỡ chuyển tiền muộn, hoặc khách bấm Hủy đúng lúc webhook đang bay về. Nếu Webhook MoMo trả Success nhưng booking đã `expired` hoặc `canceled`, hệ thống sẽ cập nhật `payments.status = 'paid'`, giữ nguyên `bookings.status` (`expired`/`canceled`), và TỰ ĐỘNG tạo một bản ghi Refund (đưa vào `booking_cancellations` với `refund_status = pending`) để hoàn tiền lại cho khách. **Race condition prevention**: Cả webhook handler và timer/cancel handler PHẢI `SELECT ... FROM bookings WHERE id = ? FOR UPDATE` trước khi đọc/sửa status.
27. **Giờ Hoạt Động (Operating Hours)**: Bảng `branches` có `open_time` và `close_time`. Hệ thống kiểm tra giờ mở cửa khi đặt chỗ. Nếu `NULL`, mặc định là 24/7.
28. **Bỏ Cọc (No-Show)**: Nếu khách đã thanh toán (`confirmed`) nhưng không đến check-in và qua giờ `end_at`, hệ thống tự động coi như `completed`. Khách mất phí, nhân viên không cần xử lý đóng ca thủ công.
29. **Sức Chứa (Capacity)**: Cột `capacity` mang tính chất tham khảo. Nếu khách đi quá số người, nhân viên linh động tạo thêm phiếu Add-on để thu phụ phí. Không block cứng ở DB.
30. **Gọi Thêm Dịch Vụ (Running Tab — Cyber-cafe model)**: Booking row là "hóa đơn chạy" (running tab). Khi khách đã check-in, Staff INSERT dòng mới vào `booking_services` (cho phép nhiều dòng cùng service — không UNIQUE) và UPDATE `bookings.addon_amount += line_total`, `bookings.total_amount += line_total` trong cùng 1 transaction. Sau đó tạo Payment mới (tiền mặt) cho phần add-on. Invariant: `SUM(payments.amount WHERE status='paid') = booking.total_amount`. Giao dịch bán lẻ độc lập (POS) → V2+.
31. **Check-in/out Hợp Đồng Dài Hạn**: Khách thuê theo tuần/tháng (`is_contract = true`) vẫn phải thực hiện quét mã check-in khi đến và check-out khi về **MỖI NGÀY** để xác thực danh tính và kiểm soát an ninh. Bảng `checkin_logs` hỗ trợ nhiều lần check-in trên cùng 1 booking.
32. **Quyền Quản Lý Dịch Vụ**: Branch Admin được phép TẠO MỚI, SỬA, XÓA các dịch vụ phụ (Extra Services) dành riêng cho chi nhánh của mình (`branch_id` NOT NULL). System Admin có quyền quản lý cả dịch vụ chung (Global) lẫn dịch vụ riêng của bất kỳ chi nhánh nào.
33. **Chống Spam Đặt Chỗ (Concurrent Rate Limit)**: Mỗi user chỉ được có tối đa **3 booking đang ở trạng thái `pending_payment`**. Để chống Race Condition (script bắn spam request), App Layer BẮT BUỘC phải dùng `pg_advisory_xact_lock(hashtext('rate_limit:' || user_id))` để xin khóa độc quyền của user trước khi thực hiện lệnh `COUNT(*)`.
34. **Gia Hạn Thời Gian (Extending Duration)**: Cập nhật `end_at` của booking hiện tại (khách muốn ngồi thêm). Điều kiện: khoảng thời gian gia hạn không Overlap (dùng Advisory Lock kiểm tra). Khi gia hạn, UPDATE `bookings.end_at`, `bookings.subtotal_amount += delta_price`, `bookings.total_amount += delta_price` trong cùng transaction, tạo Payment mới cho số tiền chênh lệch. CHECK constraint `total = subtotal - discount + addon` luôn đúng vì UPDATE atomic.
35. **Bảo Trì Tự Động Hủy (Maintenance Auto-Cancel)**: Khi Admin tạo lịch bảo trì (`workspace_maintenance`), hệ thống quét TẤT CẢ booking (`pending_payment`, `confirmed`, `checked_in`) bị TRÙNG LỊCH:
    - `pending_payment`: Chuyển sang `canceled` (từ chối thanh toán).
    - `confirmed`: Chuyển sang `canceled`, hoàn tiền 100%, báo Noti.
    - `checked_in`: Ép buộc checkout sớm (sang `completed`), hoàn tiền % thời gian chưa sử dụng, báo Noti.
36. **Cách Ly Chi Nhánh (Branch Isolation)**: Tài khoản Staff chỉ được phép xem sơ đồ (floorplan), danh sách booking và thao tác trong phạm vi chi nhánh (`branch_id`) của mình. Không được quyền xem chéo chi nhánh khác.
37. **Bảo Lưu Giá (Price Immutability)**: Khi Admin thay đổi hoặc vô hiệu hóa Bảng giá (`price_policies`), giá của các Booking ĐÃ ĐẶT (lưu trong `bookings.subtotal_amount`) sẽ không bị thay đổi.
38. **Webhook Transaction Atomicity**: Toàn bộ xử lý webhook (cập nhật `payments.status`, `bookings.status`, đánh dấu `payment_events.processed`) PHẢI chạy trong 1 DB transaction (`@Transactional`). Nếu bất kỳ bước nào fail → rollback toàn bộ. Webhook retry + idempotency_key ngăn xử lý lặp.
39. **Cancellation Policy Default**: Nếu không tìm được cancellation policy phù hợp khi hủy booking → refund = 0% (no refund). App layer phải handle edge case này và thông báo rõ cho khách.
40. **Cancellation Amount Invariant**: `refund_amount + penalty_amount` PHẢI bằng `booking.total_amount`. App layer enforce invariant này, viết unit test verify.
41. **No Hard Delete (Space)**: KHÔNG xóa cứng floor/workspace nếu còn booking liên quan (FK sẽ block). Admin set `status = 'inactive'` thay vì DELETE.
42. **Branch ID Computed**: `bookings.branch_id` được compute từ `workspace → floor → branch` ở app layer, KHÔNG cho client truyền trực tiếp. Đảm bảo branch consistency.
43. **Maintenance Overlap Check & Race Condition**: App layer kiểm tra overlap trước khi tạo lịch bảo trì (`workspace_maintenance`). BẮT BUỘC API tạo bảo trì phải dùng chung cơ chế Advisory Lock (`pg_advisory_xact_lock(hashtext('booking:' || workspace_id))`) y hệt như API tạo Booking. Nếu không, luồng tạo Booking và luồng tạo Bảo trì sẽ lọt qua check overlap của nhau khi gọi đồng thời (Race Condition).
44. **Pessimistic Lock Ordering (Chống Deadlock)**: Vì DB có Trigger tự động cộng/trừ tiền từ `booking_services` lên `bookings`, App Layer BẮT BUỘC tuân thủ chuẩn Lock Ordering: Bất kỳ transaction nào thao tác (INSERT/UPDATE/DELETE) trên bảng con (`booking_services`, `checkin_logs`, `payments`) đều phải gọi `SELECT * FROM bookings WHERE id = ? FOR UPDATE` ĐẦU TIÊN để lấy khóa của Booking cha. Tránh Deadlock chéo.

---

## 8. Quyết Định Thiết Kế

| Quyết định | Lựa chọn | Lý do |
|-----------|---------|-------|
| ID | UUID only | Đơn giản, không cần public_id |
| User Role | 4 roles trong `users.role` + `branch_id` | Không cần bảng user_roles riêng |
| Auth | Email/Password + Google SSO | Hỗ trợ cả 2 phương thức |
| Floorplan | svg_url bắt buộc + svg_element_id mapping | Render trực quan tầng |
| Pricing | `subtotal = price × unit_count`, V2+ giá bậc thang | Đơn giản MVP, dễ mở rộng |
| Add-on | Global default + Branch override | Nhất quán với pricing |
| Overlap check | App-layer (Advisory Lock + overlap check) | Advisory Lock ngăn race condition, dễ debug hơn DB EXCLUDE |
| Cancellation | Tự động theo policy, không cần admin duyệt | Trải nghiệm khách tốt hơn |
| Matching MVP | Predefined Tags + Weighted Score, batch job | Đơn giản, chuẩn hóa tags |
| Matching V2+ | AI-Powered (embedding + cosine similarity) | Giảng viên thích AI features |
| Refund | Ghi nhận nội bộ, không payout MoMo | MVP scope |
| Contract | `is_contract` boolean, auto-set khi week/month | Cùng bảng bookings, không cần bảng riêng |
| Booking scope | 1 booking = 1 workspace | Đơn giản, V2+ nhóm booking_group_id |
| Notification | In-app (bảng `notifications`), Email V2+ | Đủ cho MVP |
| Reports | Query trực tiếp, materialized view nếu chậm | Đơn giản, real-time |
| Export | CSV only (MVP), PDF export V2+ | CSV dễ implement |
| Membership | V2+ — giữ cột placeholder, không có rules MVP | Tập trung core |
| Workspace type | Khóa type change khi có booking active | Tránh conflict giá |

---
