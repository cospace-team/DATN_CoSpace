# Các Luồng Chính (Main Workflows) - Kiểm Tra Database MVP

Ngày cập nhật: 2026-05-18  
Mục tiêu: Mô tả các luồng nghiệp vụ chính + SQL để kiểm tra xem schema hiện tại đáp ứng được không.  
**Roles**: 4 vai trò — System Admin (`super_admin`), Branch Admin (`branch_admin`), Staff (`staff`), Customer (`customer`)

---

## Luồng 0a: Signup Customer (Self-Register)

**Sơ đồ:**
Customer vào website → form đăng ký
→ tạo user (role=customer, branch_id=null)
→ tạo profile mặc định
→ gửi verify email / OAuth Google
→ redirect home / list booking

**Các bước chi tiết:**

### Bước 1: Tạo user mới (không dùng OAuth)
```sql
INSERT INTO users (
  id, email, full_name, phone, status, role, branch_id, 
  membership_tier, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'customer-new@example.com',
  'Nguyễn Văn A',
  '0901234567',
  'active'::user_status,
  'customer'::user_role,
  NULL,                           -- customer không có branch_id
  'standard'::membership_tier,
  now(),
  now()
) ON CONFLICT (email) DO UPDATE SET updated_at = now()
RETURNING id, email;

-- Hoặc tạo profile cho user mới
INSERT INTO profiles (user_id, updated_at)
VALUES ('user-id', now())
ON CONFLICT (user_id) DO NOTHING;
```

**Vấn đề cần kiểm tra:**
- ✓ Email UNIQUE (case-insensitive)?
- ✓ customer không bị gán branch_id?
- ✓ Profile được tạo mặc định hay phải tạo thủ công?

### Bước 2: Nếu dùng Google OAuth
```sql
-- Tạo user qua OAuth (hoặc tìm nếu đã tồn tại)
INSERT INTO users (
  id, email, full_name, phone, status, role, branch_id, 
  membership_tier, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'customer-google@example.com',
  'Full Name From Google',
  NULL,
  'active'::user_status,
  'customer'::user_role,
  NULL,
  'standard'::membership_tier,
  now(),
  now()
) ON CONFLICT (email) DO UPDATE SET updated_at = now()
RETURNING id;

-- Tạo auth_account (provider = google)
INSERT INTO auth_accounts (id, user_id, provider, provider_user_id, created_at)
VALUES (
  gen_random_uuid(),
  'user-id-from-above',
  'google',
  'google-user-id-12345',
  now()
) ON CONFLICT (provider, provider_user_id) DO NOTHING;
```

**Vấn đề cần kiểm tra:**
- ✓ (provider, provider_user_id) UNIQUE constraint?
- ✓ Nếu email tồn tại, có gắn được auth_account không?

---

## Luồng 0b: Login (Customer/Staff/Admin)

**Sơ đồ:**
User input email/password (hoặc dùng Google)
→ tìm user + validate
→ check role + branch_id
→ redirect vào dashboard tương ứng

**Các bước chi tiết:**

### Bước 1: Tìm user bằng email + Google OAuth
```sql
-- Nếu dùng Google OAuth
SELECT u.id, u.email, u.role, u.branch_id, u.status
FROM users u
LEFT JOIN auth_accounts aa ON u.id = aa.user_id
WHERE aa.provider = 'google' 
  AND aa.provider_user_id = 'google-user-id-12345'
  AND u.status = 'active';

-- Hoặc tìm user bằng email (case-insensitive)
SELECT u.id, u.email, u.role, u.branch_id, u.status
FROM users u
WHERE LOWER(u.email) = LOWER('customer@example.com')
  AND u.status = 'active';
```

**Vấn đề cần kiểm tra:**
- ✓ Email lookup case-insensitive?
- ✓ Chỉ lấy user có status='active'?

### Bước 2: Xác định dashboard dựa vào role + branch_id
```sql
-- Service layer logic (pseudo-code):
-- if role = 'customer' && branch_id = null
--   → redirect /customer/bookings
-- if role = 'staff' && branch_id != null
--   → redirect /staff/branch/{branch_id}/checkin
-- if role = 'admin' && branch_id != null
--   → redirect /admin/branch/{branch_id}/dashboard
-- if role = 'admin' && branch_id = null
--   → redirect /admin/global/dashboard

-- Kiểm tra chi nhánh của staff
SELECT b.id, b.code, b.name
FROM branches b
WHERE b.id = (SELECT branch_id FROM users WHERE id = 'staff-user-id')
  AND b.status = 'active';
```

**Vấn đề cần kiểm tra:**
- ✓ Phân biệt role và branch_id đúng không?
- ✓ Redirect đúng dashboard?

---

## Luồng 0c: Quản Lý Tài Khoản (System Admin → Branch Admin → Staff)

**Sơ đồ:**
System Admin vào admin portal
→ tạo Branch Admin (gán branch_id)
Branch Admin vào admin portal chi nhánh
→ tạo Staff (gán branch_id cùng chi nhánh)
→ gửi invite link
→ user login lần đầu + đổi password

**Các bước chi tiết:**

### Bước 1: Admin tổng (super_admin) tạo staff cho chi nhánh
```sql
-- Cần update role enum trước: super_admin, branch_admin, staff, customer

-- Tạo staff user
INSERT INTO users (
  id, email, full_name, phone, status, role, branch_id,
  membership_tier, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'staff-branch-001@example.com',
  'Trần Thị B',
  '0912345678',
  'active'::user_status,
  'staff'::user_role,                -- staff bắt buộc có branch_id
  'branch-001',                      -- gán chi nhánh
  'standard'::membership_tier,
  now(),
  now()
);

-- Hoặc tạo admin chi nhánh
INSERT INTO users (
  id, email, full_name, phone, status, role, branch_id,
  membership_tier, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'admin-branch-001@example.com',
  'Lê Văn C',
  '0923456789',
  'active'::user_status,
  'branch_admin'::user_role,         -- admin chi nhánh
  'branch-001',
  'standard'::membership_tier,
  now(),
  now()
);
```

**Vấn đề cần kiểm tra:**
- ✓ Role enum có 4 giá trị: super_admin, branch_admin, staff, customer?
- ✓ staff/branch_admin bắt buộc có branch_id?
- ✓ super_admin/customer có branch_id = NULL?

### Bước 2: Check constraint branch_id theo role (optional, hoặc để app layer)
```sql
-- Nên thêm CHECK constraint:
-- ALTER TABLE users ADD CONSTRAINT check_branch_by_role
-- CHECK (
--   (role = 'customer' AND branch_id IS NULL) OR
--   (role = 'super_admin' AND branch_id IS NULL) OR
--   (role IN ('staff', 'branch_admin') AND branch_id IS NOT NULL)
-- );
```

### Bước 3: Query để xác minh staff/admin thuộc chi nhánh nào
```sql
SELECT u.id, u.email, u.role, b.name as branch_name
FROM users u
LEFT JOIN branches b ON u.branch_id = b.id
WHERE u.id = 'staff-id' OR u.id = 'admin-branch-id';
```

---

## Luồng 0d: Admin Cấu Hình Không Gian (Branch/Floor/Workspace)

**Sơ đồ:**
Admin (super hoặc branch) vào cấu hình
→ CRUD branch/floor/workspace
→ upload SVG floorplan
→ save + validate

**Các bước chi tiết:**

### Bước 1: Admin tổng tạo branch
```sql
INSERT INTO branches (
  id, code, name, address, city, timezone, status, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'HN-001',
  'Hanoi Downtown',
  '123 Cau Giay, Hanoi',
  'Hanoi',
  'Asia/Ho_Chi_Minh',
  'active'::branch_status,
  now(),
  now()
) RETURNING id, code, name;
```

**Vấn đề cần kiểm tra:**
- ✓ code UNIQUE?
- ✓ Chỉ super_admin được tạo branch?

### Bước 2: Admin chi nhánh tạo floor + upload SVG
```sql
INSERT INTO floors (
  id, branch_id, floor_no, name, svg_url, map_version, is_published,
  created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'branch-001',
  1,
  'Ground Floor',
  'https://cdn.example.com/svg/branch-001-floor-1-v1.svg',
  1,
  true,
  now(),
  now()
) RETURNING id, branch_id, floor_no, svg_url;

-- Kiểm tra unique (branch_id, floor_no)
SELECT COUNT(*) FROM floors WHERE branch_id = 'branch-001' AND floor_no = 1;
```

**Vấn đề cần kiểm tra:**
- ✓ svg_url bắt buộc (not null)?
- ✓ (branch_id, floor_no) UNIQUE?
- ✓ Chỉ admin chi nhánh được tạo floor?

### Bước 3: Admin chi nhánh tạo workspace
```sql
INSERT INTO workspaces (
  id, floor_id, workspace_type_id, code, name, capacity,
  svg_element_id, status, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'floor-id',
  'type-desk',                -- desk, meeting_room, private_office
  'DESK-001',
  'Desk 1',
  1,
  'desk-element-001',         -- ID từ SVG
  'active'::workspace_status,
  now(),
  now()
) RETURNING id, code, svg_element_id;

-- Kiểm tra unique (floor_id, code) và (floor_id, svg_element_id)
SELECT COUNT(*) FROM workspaces 
WHERE floor_id = 'floor-id' AND (code = 'DESK-001' OR svg_element_id = 'desk-element-001');
```

**Vấn đề cần kiểm tra:**
- ✓ (floor_id, code) UNIQUE?
- ✓ (floor_id, svg_element_id) UNIQUE?
- ✓ workspace_type_id tham chiếu đúng?

---

## Luồng 0e: Admin Cấu Hình Giá (Price Policies)

**Sơ đồ:**
Admin cấu hình giá theo workspace type + duration
→ có thể set global hoặc per-branch
→ save + apply ngay (không history)

**Các bước chi tiết:**

### Bước 1: Admin tổng tạo giá global (branch_id = null)
```sql
INSERT INTO price_policies (
  id, branch_id, workspace_type_id, duration_unit, price, currency,
  is_active, created_by, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  NULL,                          -- global
  'type-desk',
  'hour'::duration_unit,
  150000,                        -- giá 1h cho desk
  'VND',
  true,
  'admin-id',
  now(),
  now()
) RETURNING id, workspace_type_id, duration_unit, price;
```

### Bước 2: Admin chi nhánh override giá cho chi nhánh của mình
```sql
INSERT INTO price_policies (
  id, branch_id, workspace_type_id, duration_unit, price, currency,
  is_active, created_by, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'branch-001',                  -- branch-specific
  'type-desk',
  'hour'::duration_unit,
  200000,                        -- override giá cao hơn
  'VND',
  true,
  'branch-admin-id',
  now(),
  now()
) RETURNING id, branch_id, workspace_type_id, duration_unit, price;
```

### Bước 3: Query tìm giá (ưu tiên branch-specific, fallback global)
```sql
SELECT pp.id, pp.price, pp.duration_unit
FROM price_policies pp
WHERE pp.workspace_type_id = 'type-desk'
  AND pp.duration_unit = 'hour'::duration_unit
  AND pp.is_active = true
  AND (pp.branch_id = 'branch-001' OR pp.branch_id IS NULL)
ORDER BY pp.branch_id DESC NULLS LAST  -- branch-specific first
LIMIT 1;
```

**Vấn đề cần kiểm tra:**
- ✓ Có thể set global (branch_id=null)?
- ✓ Có thể override per-branch?
- ✓ Query priority đúng (branch-specific trước)?

---

## Luồng 0f: Admin Cấu Hình Add-on Service (Per-Branch)

**Sơ đồ:**
Admin cấu hình danh sách dịch vụ thêm
→ có thể set global hoặc per-branch
→ áp dụng vào booking khi customer chọn

**Các bước chi tiết:**

### Bước 1: Admin tạo service global (branch_id = null)
```sql
INSERT INTO extra_services (
  id, branch_id, code, name, service_type, unit, price,
  is_active, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  NULL,                          -- global
  'COFFEE',
  'Cà Phê Espresso',
  'drink'::service_type,
  'cup',
  15000,
  true,
  now(),
  now()
) RETURNING id, code, price;
```

### Bước 2: Admin chi nhánh override giá service cho chi nhánh
```sql
INSERT INTO extra_services (
  id, branch_id, code, name, service_type, unit, price,
  is_active, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'branch-001',                  -- branch-specific
  'COFFEE',
  'Cà Phê Espresso',
  'drink'::service_type,
  'cup',
  20000,                         -- override giá
  true,
  now(),
  now()
);

-- Hoặc update price (nếu không muốn duplicate)
UPDATE extra_services
SET price = 20000
WHERE code = 'COFFEE' AND branch_id = 'branch-001';
```

### Bước 3: Query lấy service cho chi nhánh (ưu tiên branch-specific)
```sql
SELECT es.id, es.code, es.name, es.price, es.branch_id
FROM extra_services es
WHERE es.service_type = 'drink'::service_type
  AND es.is_active = true
  AND (es.branch_id = 'branch-001' OR es.branch_id IS NULL)
ORDER BY es.branch_id DESC NULLS LAST;  -- branch-specific first
```

**Vấn đề cần kiểm tra:**
- ✓ branch_id được thêm vào extra_services?
- ✓ Có thể set global (branch_id=null)?
- ✓ Có thể override per-branch?
- ✓ Query priority đúng?

---

## Luồng 0g: Admin Cấu Hình Chính Sách Hủy (Cancellation Policy)

**Sơ đồ:**
Admin cấu hình rule hủy (grace hours, before start days, etc)
→ có thể global hoặc per-branch + workspace type
→ khi tính refund, tìm policy phù hợp theo priority

**Các bước chi tiết:**

### Bước 1: Admin tạo policy grace hour (hủy trong 2h được hoàn 100%)
```sql
INSERT INTO cancellation_policies (
  id, name, rule_type, min_value, max_value, refund_percent, priority,
  branch_id, workspace_type_id, is_active, effective_from, effective_to,
  created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'Grace Period: 2 hours',
  'GRACE_HOURS'::cancel_rule_type,
  0,
  2,                             -- từ 0-2 giờ sau khi đặt
  100,                           -- hoàn 100%
  10,                            -- ưu tiên cao
  NULL,                          -- global
  NULL,                          -- áp dụng tất cả workspace type
  true,
  now(),
  NULL,
  now(),
  now()
) RETURNING id, name, refund_percent;
```

### Bước 2: Admin tạo policy before start (hủy 20+ ngày trước = 100%)
```sql
INSERT INTO cancellation_policies (
  id, name, rule_type, min_value, max_value, refund_percent, priority,
  branch_id, workspace_type_id, is_active, effective_from, effective_to,
  created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'Safe Zone: 20+ days before',
  'BEFORE_START_DAYS'::cancel_rule_type,
  20,                            -- >= 20 ngày
  365,
  100,                           -- hoàn 100%
  20,
  NULL,
  NULL,
  true,
  now(),
  NULL,
  now(),
  now()
) RETURNING id, name, refund_percent;
```

### Bước 3: Admin tạo policy partial refund (5-19 ngày = 50%)
```sql
INSERT INTO cancellation_policies (
  id, name, rule_type, min_value, max_value, refund_percent, priority,
  branch_id, workspace_type_id, is_active, effective_from, effective_to,
  created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'Partial Refund: 5-19 days before',
  'BEFORE_START_DAYS'::cancel_rule_type,
  5,
  19,
  50,                            -- hoàn 50%
  15,
  NULL,
  NULL,
  true,
  now(),
  NULL,
  now(),
  now()
) RETURNING id, name, refund_percent;
```

### Bước 4: Admin tạo policy no refund (<4 ngày = 0%)
```sql
INSERT INTO cancellation_policies (
  id, name, rule_type, min_value, max_value, refund_percent, priority,
  branch_id, workspace_type_id, is_active, effective_from, effective_to,
  created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'No Refund: Less than 4 days',
  'BEFORE_START_DAYS'::cancel_rule_type,
  0,
  3,
  0,                             -- hoàn 0%
  5,                             -- ưu tiên thấp
  NULL,
  NULL,
  true,
  now(),
  NULL,
  now(),
  now()
) RETURNING id, name, refund_percent;
```

**Vấn đề cần kiểm tra:**
- ✓ min_value, max_value CHECK hợp lệ?
- ✓ refund_percent trong [0, 100]?
- ✓ Priority được dùng để sort nào?
- ✓ effective_from/effective_to xác định policy còn hiệu lực?

---

## Luồng 1: Booking + Thanh Toán MoMo (Online)

**Sơ đồ:**
Customer select chỗ → booking (pending_payment) + payment (initiated)
→ MoMo pay_url (15 phút timeout)
→ MoMo webhook callback
→ payment (paid), booking (confirmed)
→ gửi booking_code cho customer

**Các bước chi tiết:**

### Bước 1: Customer chọn chỗ và tạo booking
```sql
-- Kiểm tra chỗ trống (không overlap, không maintenance)
SELECT w.id, w.code, w.capacity 
FROM workspaces w
JOIN floors f ON w.floor_id = f.id
WHERE f.branch_id = 'branch-001'
  AND w.status = 'active'
  AND w.workspace_type_id = 'type-desk'
  AND NOT EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.workspace_id = w.id
      AND b.branch_id = 'branch-001'
      AND b.status IN ('pending_payment', 'confirmed', 'checked_in')
      AND (b.start_at, b.end_at) OVERLAPS ('2026-04-16 09:00:00+07'::timestamptz, '2026-04-16 17:00:00+07'::timestamptz)
  )
  AND NOT EXISTS (
    SELECT 1 FROM workspace_maintenance wm
    WHERE wm.workspace_id = w.id
      AND wm.status IN ('scheduled', 'active')
      AND (wm.start_at, wm.end_at) OVERLAPS ('2026-04-16 09:00:00+07'::timestamptz, '2026-04-16 17:00:00+07'::timestamptz)
  );

-- Tạo booking (status = pending_payment, payment_deadline_at = now + 15 phút)
INSERT INTO bookings (
  id, booking_code, user_id, workspace_id, branch_id,
  start_at, end_at, unit, unit_count, status,
  subtotal_amount, discount_amount, addon_amount, total_amount,
  payment_deadline_at, source, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'BK20260416001',           -- unique booking code
  'customer-001',
  'workspace-desk-001',
  'branch-001',
  '2026-04-16 09:00:00+07'::timestamptz,
  '2026-04-16 17:00:00+07'::timestamptz,
  'day'::duration_unit,
  1,
  'pending_payment'::booking_status,
  800000,    -- subtotal desk 1 ngày
  0,         -- discount
  0,         -- addon
  800000,    -- total
  now() + interval '15 minutes',
  'web'::booking_source,
  now(),
  now()
) RETURNING id, booking_code, total_amount, payment_deadline_at;
```

**Vấn đề cần kiểm tra:**
- ✓ Có thể tìm được chỗ trống hay không (overlap booking + maintenance)?
- ✓ Booking code có unique không?
- ✓ Tính toán total_amount = subtotal - discount + addon đúng không?

### Bước 2: Tạo payment record (MoMo)
```sql
INSERT INTO payments (
  id, booking_id, provider, method, order_id, request_id,
  amount, status, pay_url, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'booking-id-from-step-1',
  'momo'::payment_provider,
  'qr'::payment_method,
  'MOMO-20260416-001',         -- order_id generated by service
  'req-20260416-001',
  800000,
  'initiated'::payment_status,
  'https://pay.momo.vn/...',
  now(),
  now()
) RETURNING id, order_id, pay_url, status;
```

**Vấn đề cần kiểm tra:**
- ✓ order_id unique hay không?
- ✓ Một booking có nhiều payment attempts được không?

### Bước 3: MoMo webhook callback (idempotent)
```sql
-- Kiểm tra webhook đã xử lý chưa (idempotency_key unique)
SELECT * FROM payment_events 
WHERE idempotency_key = 'momo-webhook-20260416-001'
  AND processed = true;

-- Nếu chưa, tạo payment_event
INSERT INTO payment_events (
  id, payment_id, event_type, idempotency_key, 
  provider_event_id, signature_valid, payload_json,
  processed, created_at
) VALUES (
  gen_random_uuid(),
  'payment-id-from-step-2',
  'payment_success',
  'momo-webhook-20260416-001',
  'momo-evt-12345',
  true,
  jsonb_build_object(
    'status', 'Success',
    'amount', 800000,
    'transId', 'momo-trans-12345'
  ),
  false,    -- chưa xử lý
  now()
);

-- Cập nhật payment (status = paid)
UPDATE payments 
SET status = 'paid'::payment_status,
    provider_trans_id = 'momo-trans-12345',
    paid_at = now(),
    updated_at = now()
WHERE id = 'payment-id-from-step-2';

-- Cập nhật booking (status = confirmed)
UPDATE bookings
SET status = 'confirmed'::booking_status,
    updated_at = now()
WHERE id = 'booking-id-from-step-1';

-- Mark event as processed
UPDATE payment_events
SET processed = true, processed_at = now()
WHERE idempotency_key = 'momo-webhook-20260416-001';
```

**Vấn đề cần kiểm tra:**
- ✓ idempotency_key unique hay không?
- ✓ Webhook được gọi 2 lần vẫn chỉ xử lý 1 lần hay không (idempotent)?
- ✓ Payment và booking được cập nhật consistency không?

---

## Luồng 2: Booking + Thanh Toán Cash (Offline, Staff Xác Nhận)

**Sơ đồ:**
Customer đến quầy → staff tạo booking (pending)
→ staff xác nhận thu tiền (payment confirmed)
→ booking confirmed
→ staff check-in customer

**Các bước chi tiết:**

### Bước 1: Staff tạo booking cho customer (hoặc tìm customer cũ)
```sql
-- Tìm customer theo email/phone, nếu chưa có thì tạo mới
INSERT INTO users (
  id, email, full_name, phone, status, role, membership_tier, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'customer-new@example.com',
  'Nguyễn Văn A',
  '0901234567',
  'active'::user_status,
  'customer'::user_role,
  'standard'::membership_tier,
  now(),
  now()
) ON CONFLICT (email) DO UPDATE SET updated_at = now()
RETURNING id;

-- Staff tạo booking (source = counter)
INSERT INTO bookings (
  id, booking_code, user_id, workspace_id, branch_id,
  start_at, end_at, unit, unit_count, status,
  subtotal_amount, discount_amount, addon_amount, total_amount,
  source, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'BK20260416-COUNTER-001',
  'customer-id',
  'workspace-room-001',
  'branch-001',
  '2026-04-16 10:00:00+07'::timestamptz,
  '2026-04-16 11:00:00+07'::timestamptz,
  'hour'::duration_unit,
  1,
  'pending'::booking_status,      -- pending, chưa thanh toán
  500000,    -- giá meeting room 1h
  0,
  0,
  500000,
  'counter'::booking_source,
  now(),
  now()
) RETURNING id, booking_code, total_amount;
```

**Vấn đề cần kiểm tra:**
- ✓ Staff tạo được customer mới không?
- ✓ Booking source = counter có record được không?

### Bước 2: Staff xác nhận thu tiền (cash)
```sql
-- Tạo payment với provider = cash
INSERT INTO payments (
  id, booking_id, provider, method, order_id,
  amount, status, created_by_staff_id, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'booking-id-from-step-1',
  'cash'::payment_provider,
  'cash'::payment_method,
  'CASH-20260416-001',       -- order_id nội bộ
  500000,
  'pending'::payment_status,  -- pending, chờ staff xác nhận
  'staff-id',                 -- staff tạo payment
  now(),
  now()
) RETURNING id;

-- Staff xác nhận đã thu tiền (update payment = paid)
UPDATE payments
SET status = 'paid'::payment_status,
    updated_at = now()
WHERE id = 'payment-id-from-step-2';

-- Cập nhật booking (status = confirmed)
UPDATE bookings
SET status = 'confirmed'::booking_status,
    updated_at = now()
WHERE id = 'booking-id-from-step-1';
```

**Vấn đề cần kiểm tra:**
- ✓ Tạo payment với provider = cash được không?
- ✓ created_by_staff_id có ghi được ai tạo không?
- ✓ Staff scope: chỉ staff cùng branch mới confirm được không?

---

## Luồng 3: Check-in/Check-out

**Sơ đồ:**
Staff input booking_code
→ validate (confirmed, time ok, chưa check-in)
→ check-in (booking = checked_in)
→ customer sử dụng
→ staff check-out (booking = completed)

**Các bước chi tiết:**

### Bước 1: Staff check-in bằng booking_code
```sql
-- Tìm booking theo code
SELECT b.id, b.booking_code, b.status, b.start_at, b.end_at, 
       w.code as workspace_code, u.full_name
FROM bookings b
JOIN workspaces w ON b.workspace_id = w.id
JOIN users u ON b.user_id = u.id
WHERE b.booking_code = 'BK20260416001'
  AND b.status = 'confirmed'
  AND now()::timestamptz >= b.start_at    -- time ok
  AND now()::timestamptz <= b.end_at;

-- Check xem có checkin mở (checkout_at is null)?
SELECT * FROM checkin_logs 
WHERE booking_id = 'booking-id'
  AND checkout_at IS NULL;

-- Tạo checkin log
INSERT INTO checkin_logs (
  id, booking_id, staff_user_id, checkin_at, created_at
) VALUES (
  gen_random_uuid(),
  'booking-id',
  'staff-id',
  now(),
  now()
) RETURNING id, checkin_at;

-- Cập nhật booking (status = checked_in)
UPDATE bookings
SET status = 'checked_in'::booking_status,
    updated_at = now()
WHERE id = 'booking-id';
```

**Vấn đề cần kiểm tra:**
- ✓ Tìm booking bằng code được không?
- ✓ Kiểm tra chỉ có 1 checkin mở (checkout_at is null) được không?
- ✓ Không thể check-in nếu chưa đến time start_at hay vượt end_at không?

### Bước 2: Staff check-out
```sql
-- Tìm checkin mở
SELECT cl.id, cl.booking_id, cl.checkin_at
FROM checkin_logs cl
JOIN bookings b ON cl.booking_id = b.id
WHERE b.booking_code = 'BK20260416001'
  AND cl.checkout_at IS NULL;

-- Check-out
UPDATE checkin_logs
SET checkout_at = now()
WHERE booking_id = 'booking-id'
  AND checkout_at IS NULL;

-- Cập nhật booking (status = completed)
UPDATE bookings
SET status = 'completed'::booking_status,
    updated_at = now()
WHERE id = 'booking-id';
```

**Vấn đề cần kiểm tra:**
- ✓ Tìm được checkin mở không?
- ✓ Cập nhật checkout_at không?

---

## Luồng 4: Hủy Booking + Hoàn Tiền (Tự Động Theo Policy)

**Sơ đồ:**
Customer gửi yêu cầu hủy
→ hệ thống tìm cancellation_policy phù hợp (ưu tiên branch → global)
→ tự động tính refund % theo policy
→ tạo booking_cancellations (refund_status = confirmed ngay)
→ thông báo khách: chính sách đã áp dụng + số tiền hoàn
→ ghi nhận nội bộ (không payout thật)

**Các bước chi tiết:**

### Bước 1: Xác định policy hủy áp dụng
```sql
-- Tính khoảng cách từ hiện tại đến start_at
-- start_at = '2026-04-18 09:00:00+07'
-- now() = '2026-04-16 14:00:00+07'
-- Difference = 1 ngày 19 giờ (khoảng 43 giờ, tức ~2 ngày)

-- Tìm policy phù hợp (ưu tiên branch-specific)
SELECT cp.id, cp.name, cp.rule_type, cp.min_value, cp.max_value, cp.refund_percent
FROM cancellation_policies cp
WHERE (cp.branch_id = 'branch-001' OR cp.branch_id IS NULL)
  AND (cp.workspace_type_id = 'type-desk' OR cp.workspace_type_id IS NULL)
  AND cp.is_active = true
  AND cp.effective_from <= now()
  AND (cp.effective_to IS NULL OR cp.effective_to > now())
  -- Áp dụng policy theo rule_type
  -- Nếu BEFORE_START_DAYS: so sánh ngày
  AND CASE 
    WHEN cp.rule_type = 'BEFORE_START_DAYS' THEN 
      -- Hủy 2 ngày trước start_at → match policy "BEFORE_START_DAYS 20 days = 100%"
      EXTRACT(DAY FROM ('2026-04-18 09:00:00+07'::timestamptz - now()::timestamptz)) >= cp.min_value
      AND EXTRACT(DAY FROM ('2026-04-18 09:00:00+07'::timestamptz - now()::timestamptz)) <= cp.max_value
    ELSE true
  END
ORDER BY cp.priority DESC
LIMIT 1;

-- Hoặc nếu là GRACE_HOURS (hủy trong 2 giờ sau đặt)
SELECT cp.id, cp.name, cp.rule_type, cp.min_value, cp.max_value, cp.refund_percent
FROM cancellation_policies cp
WHERE (cp.branch_id = 'branch-001' OR cp.branch_id IS NULL)
  AND cp.is_active = true
  AND cp.rule_type = 'GRACE_HOURS'
  AND EXTRACT(HOUR FROM (now()::timestamptz - b.created_at)) <= cp.max_value
FROM bookings b
WHERE b.id = 'booking-id';
```

**Vấn đề cần kiểm tra:**
- ✓ Policy matching hoạt động đúng không?
- ✓ Ưu tiên branch-specific trước global không?
- ✓ Tính toán ngày/giờ chính xác không?

### Bước 2: Tạo cancellation request
```sql
-- Tính refund_amount và penalty_amount
-- booking.total_amount = 500000
-- policy.refund_percent = 50  (Partial refund)
-- refund_amount = 500000 * 50 / 100 = 250000
-- penalty_amount = 500000 - 250000 = 250000

INSERT INTO booking_cancellations (
  id, booking_id, policy_id, refund_percent, refund_amount, penalty_amount,
  reason, cancelled_by, cancelled_at, refund_status, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'booking-id',
  'policy-id-from-step-1',
  50,                 -- refund_percent
  250000,             -- refund_amount
  250000,             -- penalty_amount
  'Customer requested',
  'customer-id',      -- ai yêu cầu hủy
  now(),
  'confirmed'::refund_status,  -- TỰ ĐỘNG confirmed (không cần admin xét duyệt)
  now(),
  now()
) RETURNING id, refund_amount, penalty_amount, refund_status;

-- Cập nhật booking (status = canceled)
UPDATE bookings
SET status = 'canceled'::booking_status,
    updated_at = now()
WHERE id = 'booking-id';
```

**Vấn đề cần kiểm tra:**
- ✓ Tính toán refund_amount + penalty_amount chính xác không?
- ✓ refund_amount + penalty_amount = total_amount không?

```

**Vấn đề cần kiểm tra:**
- ✓ Tính toán refund_amount + penalty_amount chính xác không?
- ✓ refund_amount + penalty_amount = total_amount không?
- ✓ refund_status = confirmed ngay (tự động, không cần admin xét duyệt)?
- ✓ Booking status chuyển thành canceled?
- ✓ Thông báo cho khách về chính sách đã áp dụng + số tiền hoàn?

---

## Luồng 5: Matching Partner (Tìm Kiếm Đối Tác)

**Sơ đồ:**
Customer update profile (skills, interests)
→ batch job tính match scores
→ API /suggested-partners
→ trả danh sách partner + score + contact (nếu public)

**Các bước chi tiết:**

### Bước 1: Customer cập nhật profile
```sql
-- Tạo/cập nhật profile
INSERT INTO profiles (user_id, bio, profession, company, contact_public, updated_at)
VALUES ('customer-001', 'Software dev', 'Backend', 'Tech Startup', true, now())
ON CONFLICT (user_id) DO UPDATE SET 
  bio = EXCLUDED.bio,
  profession = EXCLUDED.profession,
  contact_public = EXCLUDED.contact_public,
  updated_at = now();

-- Thêm skills (với level 1-5)
INSERT INTO profile_skills (profile_user_id, tag_id, level) 
VALUES ('customer-001', 'tag-python', 4)
ON CONFLICT (profile_user_id, tag_id) DO UPDATE SET level = EXCLUDED.level;

INSERT INTO profile_skills (profile_user_id, tag_id, level) 
VALUES ('customer-001', 'tag-react', 3);

-- Thêm interests (với priority 1-5)
INSERT INTO profile_interests (profile_user_id, tag_id, priority)
VALUES ('customer-001', 'tag-startup', 5)
ON CONFLICT (profile_user_id, tag_id) DO UPDATE SET priority = EXCLUDED.priority;

INSERT INTO profile_interests (profile_user_id, tag_id, priority)
VALUES ('customer-001', 'tag-web3', 3);
```

**Vấn đề cần kiểm tra:**
- ✓ level/priority bị CHECK trong [1,5] không?
- ✓ Có thể cập nhật conflict được không?

### Bước 2: Batch job tính match scores
```sql
-- Tính score giữa customer-001 và các user khác
-- Logic: so sánh skills overlap + interests overlap
-- Score = (skill_overlap * 0.7) + (interest_overlap * 0.3)

WITH customer_skills AS (
  SELECT tag_id, level FROM profile_skills WHERE profile_user_id = 'customer-001'
),
customer_interests AS (
  SELECT tag_id, priority FROM profile_interests WHERE profile_user_id = 'customer-001'
),
all_users AS (
  SELECT u.id FROM users u WHERE u.id != 'customer-001' AND u.role = 'customer'
),
scores AS (
  SELECT 
    au.id as matched_user_id,
    -- Tính skill overlap
    COALESCE(SUM(CASE WHEN ps.profile_user_id = au.id THEN 1 ELSE 0 END) * 0.7 / NULLIF(COUNT(DISTINCT cs.tag_id), 0), 0) as skill_score,
    -- Tính interest overlap
    COALESCE(SUM(CASE WHEN pi.profile_user_id = au.id THEN 1 ELSE 0 END) * 0.3 / NULLIF(COUNT(DISTINCT ci.tag_id), 0), 0) as interest_score
  FROM all_users au
  LEFT JOIN profile_skills ps ON ps.tag_id IN (SELECT tag_id FROM customer_skills)
  LEFT JOIN profile_interests pi ON pi.tag_id IN (SELECT tag_id FROM customer_interests)
  LEFT JOIN customer_skills cs ON 1=1
  LEFT JOIN customer_interests ci ON 1=1
  GROUP BY au.id
)
INSERT INTO profile_match_scores (profile_user_id, matched_user_id, score, reasons_json, computed_at)
SELECT 
  'customer-001',
  matched_user_id,
  (skill_score + interest_score)::numeric(6,4),
  jsonb_build_object(
    'skill_match', skill_score,
    'interest_match', interest_score,
    'reason', 'Cùng quan tâm Python và Startup'
  ),
  now()
FROM scores
WHERE skill_score + interest_score > 0
ON CONFLICT (profile_user_id, matched_user_id) DO UPDATE SET
  score = EXCLUDED.score,
  reasons_json = EXCLUDED.reasons_json,
  computed_at = now();
```

**Vấn đề cần kiểm tra:**
- ✓ Score được tính từ 0 đến 1 hay khoảng khác?
- ✓ Query performance có tốt không với dữ liệu lớn?

### Bước 3: Query gợi ý partner
```sql
-- API GET /suggested-partners?user_id=customer-001
SELECT 
  pms.matched_user_id,
  u.full_name,
  p.profession,
  p.company,
  pms.score,
  pms.reasons_json,
  CASE WHEN p.contact_public THEN p.contact_email ELSE NULL END as contact_email,
  CASE WHEN p.contact_public THEN p.contact_phone ELSE NULL END as contact_phone
FROM profile_match_scores pms
JOIN users u ON pms.matched_user_id = u.id
JOIN profiles p ON u.id = p.user_id
WHERE pms.profile_user_id = 'customer-001'
  AND u.status = 'active'
ORDER BY pms.score DESC
LIMIT 10;
```

**Vấn đề cần kiểm tra:**
- ✓ Chỉ trả contact_email/phone nếu contact_public = true không?
- ✓ Sorting theo score DESC có nhanh không (có index không)?

---

## Checklist Kiểm Tra Database

Sau khi chạy các luồng trên, cần kiểm tra:

### Auth & Account Management
- [ ] **Luồng 0a (Signup)**
  - [ ] Email UNIQUE case-insensitive
  - [ ] customer role không bị gán branch_id
  - [ ] Profile được tạo mặc định

- [ ] **Luồng 0b (Login)**
  - [ ] Tìm user bằng email case-insensitive
  - [ ] (provider, provider_user_id) UNIQUE cho OAuth
  - [ ] Chỉ lấy user status=active
  - [ ] Redirect dashboard đúng theo role + branch_id

- [ ] **Luồng 0c (Tạo Staff/Admin)**
  - [ ] Role enum gồm 4 giá trị: super_admin, branch_admin, staff, customer
  - [ ] staff/branch_admin bắt buộc có branch_id (check constraint)
  - [ ] super_admin/customer không có branch_id

### Configuration
- [ ] **Luồng 0d (Cấu Hình Không Gian)**
  - [ ] branch code UNIQUE
  - [ ] (branch_id, floor_no) UNIQUE
  - [ ] svg_url bắt buộc có giá trị
  - [ ] (floor_id, workspace_code) UNIQUE
  - [ ] (floor_id, svg_element_id) UNIQUE
  - [ ] Chỉ admin chi nhánh được tạo floor/workspace

- [ ] **Luồng 0e (Cấu Hình Giá)**
  - [ ] Có thể set global (branch_id=null)
  - [ ] Có thể override per-branch
  - [ ] Query priority: branch-specific trước, global sau
  - [ ] Chỉ admin được tạo price policy

- [ ] **Luồng 0f (Cấu Hình Add-on Service)**
  - [ ] branch_id được thêm vào extra_services
  - [ ] Có thể set global (branch_id=null)
  - [ ] Có thể override per-branch
  - [ ] Query priority: branch-specific trước, global sau

- [ ] **Luồng 0g (Cấu Hình Policy Hủy)**
  - [ ] min_value, max_value hợp lệ (CHECK constraint)
  - [ ] refund_percent trong [0, 100]
  - [ ] Priority được dùng để xác định policy áp dụng
  - [ ] effective_from/effective_to xác định policy còn hiệu lực

### Booking & Payment
- [ ] **Luồng 1 (MoMo)**
  - [ ] Tìm chỗ trống (overlap booking + maintenance)
  - [ ] booking_code unique
  - [ ] payment idempotency (webhook lặp lại 2 lần, chỉ xử lý 1 lần)
  - [ ] Consistency khi payment success: payment.status=paid, booking.status=confirmed

- [ ] **Luồng 2 (Cash)**
  - [ ] Staff tạo customer được không
  - [ ] Booking source = counter được ghi không
  - [ ] created_by_staff_id được ghi không
  - [ ] Staff scope: chỉ staff cùng branch mới confirm được

- [ ] **Luồng 3 (Check-in)**
  - [ ] Tìm booking bằng code được không
  - [ ] Chỉ có 1 checkin mở (checkout_at is null)
  - [ ] Không thể check-in nếu vượt time window
  - [ ] Booking=confirmed trước khi check-in

- [ ] **Luồng 4 (Cancellation — Tự Động)**
  - [ ] Policy matching (ưu tiên branch-specific → global)
  - [ ] Tính refund % đúng theo rule
  - [ ] refund_amount + penalty_amount = total_amount
  - [ ] refund_status = confirmed ngay (tự động, không cần xét duyệt)
  - [ ] Thông báo khách về chính sách áp dụng + số tiền hoàn

- [ ] **Luồng 5 (Matching)**
  - [ ] level/priority CHECK [1,5]
  - [ ] Score được tính đúng
  - [ ] Contact_email/phone chỉ trả khi contact_public=true
  - [ ] Query gợi ý nhanh (có index)

### Ràng Buộc Cốt Lõi
- [ ] **Data Integrity**
  - [ ] Booking không overlap (bằng constraint hay app-layer)
  - [ ] Maintenance không overlap
  - [ ] Payment timeout 15 phút (có job batch không)
  - [ ] profile_user_id <> matched_user_id (self-match không được)
  - [ ] Email unique case-insensitive
  - [ ] start_at < end_at (CHECK constraint cho booking + maintenance)
  - [ ] Amount >= 0 (CHECK constraint cho payment/booking)
  - [ ] total_amount = subtotal - discount + addon

---

## Kết Luận Tạm Thời

Nếu cả **12 luồng** (0a-0g + 1-5) chạy được và pass checklist trên, database MVP sẽ sẵn sàng cho sprint 1-2.

**Thứ tự kiểm tra được khuyến nghị:**
1. **Luồng 0** (Auth/Config): Kiểm tra nền tảng trước.
2. **Luồng 1-2** (Booking): Kiểm tra booking logic chính.
3. **Luồng 3-4** (Vận hành): Kiểm tra check-in + cancel.
4. **Luồng 5** (Matching): Kiểm tra tính năng phụ.

Nếu phát hiện vấn đề ở đâu, hãy report lại và sửa schema trước khi bắt đầu code service layer.

---

## Tóm Tắt Các Vấn Đề Schema Cần Fix Ngay

Dựa trên các luồng trên, mình phát hiện những điểm cần sửa:

1. **Role enum** (Critical)
   - Hiện tại: admin, staff, customer
   - Cần thêm: super_admin, branch_admin
   - Dòng: 11-15 trong Database_dbdiagram_script

2. **branch_id check constraint** (Critical)
   - Chưa có constraint buộc role + branch_id
   - Nên thêm CHECK ở bảng users

3. **extra_services branch_id** (Important)
   - Đã có trong script nhưng comment chưa clean
   - Nên enable index (branch_id, code) nếu cần unique per branch

4. **Email case-insensitive** (Important)
   - Nên dùng CITEXT hoặc unique index trên lower(email)

5. **Các CHECK constraint cho amount** (Important)
   - start_at < end_at (bookings, workspace_maintenance)
   - amount >= 0 (payments, bookings)
   - refund_percent trong [0, 100]
   - level/priority trong [1, 5]

6. **Booking overlap** (To decide)
   - Nên enforce ở DB bằng exclusion constraint, hay để app layer?

7. **Payment idempotency** (OK)
   - payment_events.idempotency_key đã unique ✓

8. **Matching index** (Nice-to-have)
   - Nên thêm index (profile_user_id, score DESC)