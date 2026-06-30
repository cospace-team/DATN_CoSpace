# Kế Hoạch Phát Triển — Co-Working Space MVP

**Ngày cập nhật**: 18/05/2026  
**Stack**: Spring Boot + React/TypeScript + PostgreSQL  
**Roles**: 4 vai trò — System Admin (`super_admin`), Branch Admin (`branch_admin`), Staff (`staff`), Customer (`customer`)

---

## 1. Tổng Quan

### Mốc Sprint (6 sprints × 2 tuần)

| Sprint | Mục tiêu | Epic |
|--------|---------|------|
| 1 | Foundation + Identity + Schema | A |
| 2 | Space Management + Availability | B |
| 3 | Booking + Pricing + Add-on | C |
| 4 | Payment + Check-in/Check-out | D |
| 5 | Cancellation/Refund + Matching + Dashboard | E |
| 6 | Hardening + E2E + UAT | F |

### Ưu tiên
- **P0**: Bắt buộc — không ship được nếu thiếu
- **P1**: Nên có — nâng chất lượng đáng kể
- **P2**: Tăng chất lượng — có thời gian thì làm

### Definition of Done (mọi task)
- Code đã được review
- Có test tương ứng cho logic chính
- Có log và xử lý lỗi rõ ràng
- API docs được cập nhật
- Không vi phạm các rule cốt lõi trong SYSTEM_SPEC.md

---

## 2. Sprint Backlog

### Sprint 1 — Foundation + Identity + Schema

**Mục tiêu**: Có bộ khung chạy được, đăng nhập, dữ liệu lõi và phân quyền cơ bản.

1. [P0][8SP] Khởi tạo backend Spring Boot theo module
   - AC: Có cấu trúc module Auth, Space, Booking, Payment, Checkin, Matching.
   - AC: Có profile dev/test và cấu hình PostgreSQL.
   - AC: App chạy local ổn định, health endpoint hoạt động.

2. [P0][5SP] Khởi tạo frontend React/Next.js + layout base
   - AC: Có login page, shell dashboard cho 4 role.
   - AC: Có route guard cơ bản theo role.

3. [P0][8SP] Thiết kế migration V1 schema lõi (✅ DONE)
   - Phạm vi: users, auth_accounts, profiles, branches, floors, workspace_types, workspaces, bookings, payments, audit_logs, v.v (17+ bảng).
   - AC: Dùng UUID toàn bộ PK.
   - AC: Ràng buộc unique quan trọng hoạt động.
   - AC: C1-01 đến C1-08 tất cả implement.
   - **File:** migration_v1_core_schema.sql (✅ sẵn, ready to execute)

4. [P0][5SP] Đăng ký/Đăng nhập (Email+Password & Google SSO)
   - AC: Đăng ký bằng email/phone + mật khẩu thành công (password_hash lưu trong users).
   - AC: Đăng nhập bằng email + mật khẩu thành công.
   - AC: Đăng nhập bằng Google OAuth thành công.
   - AC: Tạo mới user nếu chưa tồn tại, map đúng role mặc định customer.
   - AC: Endpoint /auth/me trả đúng thông tin user và profile.

5. [P0][3SP] RBAC và branch scope cho staff + branch admin
   - AC: Staff và Branch Admin bắt buộc có branch_id.
   - AC: Staff không truy cập dữ liệu branch khác.
   - AC: Branch Admin chỉ quản lý chi nhánh được gán.
   - AC: System Admin (super_admin) có quyền toàn hệ thống.

6. [P1][3SP] Seed dữ liệu nền tảng
   - AC: Seed được workspace types mặc định (desk, meeting_room, private_office).
   - AC: Seed được 1 super_admin, 1 branch_admin, 1 staff, 1 customer, 1 branch mẫu.

7. [P1][2SP] Logging + audit nền tảng
   - AC: Log được request id và user id.
   - AC: Có bảng audit_logs bản tối thiểu.

---

### Sprint 2 — Space Management + Availability

**Mục tiêu**: Quản lý branch/floor/workspace hoàn chỉnh, có floorplan SVG và tra cứu khả dụng.

1. [P0][5SP] API quản lý Branch/Floor/Workspace cho System Admin & Branch Admin
   - AC: System Admin: CRUD branch. Branch Admin: CRUD floor, workspace trong chi nhánh mình.
   - AC: floor bắt buộc svg_url.
   - AC: workspace bắt buộc svg_element_id unique trong cùng floor.

2. [P0][5SP] API đọc dữ liệu không gian cho customer/staff
   - AC: GET branches, floors, workspaces, floorplan.
   - AC: Staff chỉ xem được branch của mình.

3. [P0][8SP] Workspace maintenance
   - AC: Tạo/sửa lịch bảo trì theo [start_at, end_at).
   - AC: Chỉ trạng thái scheduled và active chặn booking.

4. [P0][8SP] API available workspaces
   - AC: Trả danh sách workspace khả dụng theo khung giờ.
   - AC: Loại trừ workspace có booking overlap hoặc maintenance overlap.

5. [P1][3SP] Frontend màn hình sơ đồ tầng
   - AC: Render SVG floorplan và highlight trạng thái workspace.

---

### Sprint 3 — Booking Engine + Pricing + Add-on

**Mục tiêu**: Tạo booking đầy đủ kiểm tra điều kiện và tính tiền cơ bản.

1. [P0][8SP] API tạo booking + rule engine
   - AC: Chặn overlap booking khi status thuộc pending_payment, confirmed, checked_in.
   - AC: Chặn overlap maintenance scheduled/active.
   - AC: Tạo payment_deadline_at = now + 15 phút cho luồng online.

2. [P0][5SP] Pricing service MVP
   - AC: Lấy giá theo workspace_type + duration_unit, ưu tiên branch-specific, fallback global.
   - AC: Tính subtotal, discount, addon, total rõ ràng.

3. [P1][5SP] Add-on service
   - AC: API lấy danh sách extra_services.
   - AC: API thêm service vào booking và cập nhật tổng tiền.

4. [P1][3SP] Booking history
   - AC: Customer xem lịch sử booking của mình (đặt chỗ + hợp đồng thuê).
   - AC: Branch Admin xem lịch sử booking chi nhánh.
   - AC: Staff/Admin lọc được theo branch, trạng thái, is_contract.

> **Ghi chú**: Khi `duration_unit` = week/month, hệ thống tự động set `is_contract = true`. Cùng API, cùng flow với booking ngắn hạn.

---

### Sprint 4 — Payment + Check-in/Check-out

**Mục tiêu**: Hoàn tất thanh toán MoMo/Cash và vận hành check-in bằng booking code.

1. [P0][8SP] Tích hợp MoMo Sandbox
   - AC: Tạo payment order và nhận pay_url.
   - AC: Verify chữ ký webhook.
   - AC: Xử lý idempotent khi webhook lặp.
   - AC: Cập nhật payment=paid thì booking=confirmed.

2. [P0][5SP] Payment timeout worker
   - AC: Job chạy định kỳ expire booking pending_payment quá 15 phút.
   - AC: Đồng bộ payment status expired.

3. [P0][5SP] Luồng Cash confirm
   - AC: Staff xác nhận thu tiền bằng endpoint riêng.
   - AC: Chỉ staff cùng branch mới được confirm.

4. [P0][8SP] Check-in/check-out bằng booking code
   - AC: Check-in chỉ hợp lệ khi booking confirmed, đúng thời gian, chưa check-in mở.
   - AC: Mỗi booking chỉ có 1 checkin log đang mở (checkout_at null).
   - AC: Checkout cập nhật booking completed.

5. [P1][3SP] Frontend payment và check-in
   - AC: Màn hình thanh toán, callback result, nhập booking code cho staff.

---

### Sprint 5 — Cancellation/Refund + Matching + Dashboard

**Mục tiêu**: Bổ sung nghiệp vụ hủy/refund tự động, matching partner, dashboard cơ bản.

1. [P0][5SP] Cancellation policies + booking cancellations (✅ SCHEMA DONE, cần API)
   - AC: Lưu được policy kiểu GRACE_HOURS và BEFORE_START_DAYS.
   - AC: Tính refund_percent đúng theo rule.
   - AC: Snapshot applied policy vào applied_rule_json.
   - AC: System Admin/Branch Admin tạo/sửa cancellation policies.

2. [P0][8SP] Quy trình hủy tự động và hoàn tiền nội bộ
   - AC: Customer gửi yêu cầu hủy.
   - AC: Hệ thống tự động tìm policy phù hợp (ưu tiên branch → global).
   - AC: Tự động tính refund% và refund_amount, ghi nhận confirmed ngay.
   - AC: Thông báo cho khách: chính sách đã áp dụng + số tiền hoàn.
   - AC: Không gọi payout thực tế ra MoMo trong MVP.

3. [P1][8SP] Matching data model + APIs
   - Phạm vi: tags, profile_skills, profile_interests, profile_match_scores.
   - AC: GET/PUT profile và GET suggested-partners hoạt động.
   - AC: Chỉ trả contact khi contact_public=true.

4. [P1][5SP] Batch job tính match score
   - AC: Job tính score theo kỹ năng và quan tâm.
   - AC: reasons_json giải thích được vì sao match.

5. [P0][8SP] Dashboard & Reports cơ bản
   - AC: Branch Admin xem dashboard chi nhánh: occupancy rate, doanh thu, top services.
   - AC: System Admin xem dashboard tổng hợp: tổng booking, doanh thu, so sánh chi nhánh.
   - AC: Báo cáo dạng bảng + biểu đồ (chart.js hoặc recharts).
   - AC: Filter theo thời gian (tuần/tháng/quý) và chi nhánh.
   - AC: Thống kê booking ngắn hạn vs hợp đồng thuê dài hạn.
   - AC: Staff xem dashboard vận hành trong ngày (booking hôm nay, occupancy).

6. [P1][3SP] CSV Export
   - AC: Branch Admin/System Admin export dữ liệu báo cáo ra file CSV.
   - AC: Export được danh sách booking, doanh thu, dịch vụ.

---

### Sprint 6 — Hardening + E2E + UAT

**Mục tiêu**: Ổn định hệ thống, test đầy đủ luồng chính và sẵn sàng demo/đánh giá.

1. [P0][8SP] Test SQL cho 5 luồng chính
   - AC: Có script seed và script test booking/payment/checkin/cancel/matching.
   - AC: Chạy lặp lại được, không phụ thuộc thao tác tay.

2. [P0][8SP] Integration test backend
   - AC: Test được rule chống trùng lịch, timeout, idempotency, staff scope.

3. [P0][5SP] E2E test frontend-backend
   - AC: Cover end-to-end booking với MoMo sandbox mock callback và cash.

4. [P1][5SP] Bảo mật và vận hành
   - AC: Rate limit endpoint nhạy cảm (login, webhook).
   - AC: Chuẩn hóa log lỗi và cảnh báo.

5. [P1][3SP] UAT checklist + bugfix buffer
   - AC: Có checklist UAT theo vai trò customer/staff/branch_admin/system_admin.
   - AC: Sửa xong bug blocker trước nghiệm thu.

---

## 3. Epic Dependencies

```
Epic A: Identity + Phân quyền (Sprint 1)
  ↓
Epic B: Space + Availability (Sprint 2)
  ↓
Epic C: Booking + Pricing (Sprint 3)
  ↓
Epic D: Payment + Check-in (Sprint 4)
  ↓
Epic E: Cancellation + Matching (Sprint 5)
  ↓
Epic F: Quality + Release (Sprint 6)
```

Thứ tự phụ thuộc: A → B → C → D → E → F  
Epic E phụ thuộc C, D (một phần).

---

## 4. Schema Review Checklist

### C1. Critical (✅ ALL DONE)

| # | Vấn đề | Status |
|---|--------|--------|
| C1-01 | Role model 4 cấp | ✅ `user_role = (super_admin, branch_admin, staff, customer)` |
| C1-02 | Branch rule by role | ✅ `CHECK check_branch_by_role` |
| C1-03 | Ràng buộc khoảng thời gian | ✅ `CHECK (end_at > start_at)` |
| C1-04 | No-overlap booking | ✅ App-layer (SELECT FOR UPDATE) + INDEX |
| C1-05 | No-overlap maintenance | ✅ App-layer + INDEX |
| C1-06 | 1 check-in mở per booking | ✅ Partial unique index |
| C1-07 | order_id unique | ✅ `order_id varchar(100) UNIQUE` (nullable cho cash) |
| C1-08 | Amount calculation | ✅ `CHECK total = subtotal - discount + addon` |

### C2. Important (✅ ALL DONE)

| # | Vấn đề | Status |
|---|--------|--------|
| C2-01 | Scope dịch vụ per branch | ✅ `extra_services.branch_id` nullable |
| C2-02 | Unique booking_services | ✅ `UNIQUE (booking_id, extra_service_id)` |
| C2-03 | Snapshot cancel policy | ✅ `applied_rule_json` |
| C2-04 | Matching constraints | ✅ `CHECK level [1,5], priority [1,5]` |
| C2-05 | No self-match | ✅ `CHECK profile_user_id <> matched_user_id` |
| C2-06 | Match score index | ✅ `idx_match_scores_ranking` |
| C2-07 | Audit log metadata | ✅ `branch_id, request_id, action_result` |
| C2-08 | Email case-insensitive | ✅ `citext` |
| C2-09 | Password hash | ✅ `password_hash varchar(255)` nullable |

### C3. Nice-to-have (Sau MVP)

- [ ] C3-01 Quản lý đa chi nhánh cho 1 user (bảng user_branches)
- [ ] C3-02 Soft delete cho danh mục (deleted_at)
- [ ] C3-03 Retention policy cho audit/payment_events (6-12 tháng)

### C4. AI-Ready (Không phá MVP)

- [ ] C4-01 Monolith module hóa (ai_chat + matching_engine cùng backend)
- [ ] C4-02 Bảng hội thoại AI (ai_conversations, ai_messages, ai_prompt_logs)
- [ ] C4-03 Chatbot RAG (kb_documents, kb_chunks + pgvector) — sau khi core ổn
- [ ] C4-04 Matching AI re-rank trên nền rule-based

---

## 5. Test Plan

### SQL Test Workflows (tham khảo file riêng)

| Luồng | File test |
|-------|-----------|
| Login + Role verification | test_core_workflows.sql |
| Booking + Overlap check | test_core_workflows.sql |
| Check-in / Check-out | test_core_workflows.sql |
| Cancellation + Refund | Workflows_va_SQL_Test.md (Luồng 4) |
| Matching | Workflows_va_SQL_Test.md (Luồng 5) |

### Pre-Demo Checklist

- [ ] T1: Booking overlap fail đúng
- [ ] T2: Maintenance overlap fail đúng
- [ ] T3: Payment timeout 15 phút hoạt động
- [ ] T4: MoMo webhook idempotency khi lặp
- [ ] T5: Cash confirm bị chặn nếu staff khác branch
- [ ] T6: Check-in unique (không tạo được check-in mở thứ 2)
- [ ] T7: Cancellation tính refund đúng với case biên
- [ ] T8: Matching query top N không chậm
- [ ] T9: Email+Password đăng ký/đăng nhập thành công
- [ ] T10: Google SSO đăng nhập thành công
- [ ] T11: Dashboard hiển thị đúng số liệu (doanh thu, occupancy)
- [ ] T12: CSV export xuất dữ liệu đúng

---

## 6. Ưu Tiên Nếu Thiếu Nguồn Lực

1. **Giữ nguyên** toàn bộ P0 Sprint 1-4
2. Sprint 5: ưu tiên **cancellation** trước matching
3. Sprint 6: cắt giảm **dashboard mở rộng**, không cắt test luồng chính
4. Matching có thể đẩy sang V2 nếu quá tải

---

## 7. V2+ Roadmap

| Feature | Mô tả |
|---------|-------|
| Báo cáo chi tiết | Doanh thu, utilization, partner stats (query từ bookings/payments) |
| Chat/Messaging | Cho matching partners |
| Lịch sử giá | effective_from/to dates cho price_policies |
| Team/Company | Advanced access control (team scopes) |
| Notification | Email/push thông báo booking, payment, checkout trễ |
| Multi-branch admin | 1 admin quản lý nhiều chi nhánh |

---
