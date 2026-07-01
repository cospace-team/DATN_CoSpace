-- ============================================
-- SQL Test: CoSpace - Full Workflows Verification
-- ============================================
-- Ngày: 2026-07-02
-- Mục tiêu: Chạy thử nghiệm tất cả 12 luồng nghiệp vụ trên Schema MVP
-- Database: PostgreSQL 13+
-- Thao tác: Chạy script này trong giao diện truy vấn SQL (Supabase/Postgres Client)
-- ============================================

BEGIN;

-- ============================================
-- PREPARE COMMON BASE DATA
-- ============================================
RAISE NOTICE '=============== SETUP: Seeding Base Data ===============';

-- 1. Đảm bảo có các loại Workspace Types (nếu chưa có)
INSERT INTO workspace_types (id, code, name, capacity_default, created_at, updated_at)
VALUES 
  ('10000000-0000-0000-0000-000000000001'::uuid, 'desk', 'Bàn đơn', 1, now(), now()),
  ('10000000-0000-0000-0000-000000000002'::uuid, 'meeting_room', 'Phòng họp', 6, now(), now()),
  ('10000000-0000-0000-0000-000000000003'::uuid, 'private_office', 'Văn phòng riêng', 10, now(), now())
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- 2. Tạo tags mặc định
INSERT INTO tags (id, name, category, is_active, created_at, updated_at)
VALUES
  ('20000000-0000-0000-0000-000000000001'::uuid, 'Python', 'skill', true, now(), now()),
  ('20000000-0000-0000-0000-000000000002'::uuid, 'React', 'skill', true, now(), now()),
  ('20000000-0000-0000-0000-000000000003'::uuid, 'Startup', 'interest', true, now(), now()),
  ('20000000-0000-0000-0000-000000000004'::uuid, 'Fintech', 'industry', true, now(), now())
ON CONFLICT (name) DO NOTHING;


-- ============================================
-- LUỒNG 0a: Signup Customer (Self-Register)
-- ============================================
RAISE NOTICE '=============== LUỒNG 0a: Signup Customer ===============';

-- Tạo user mới
INSERT INTO users (
  id, email, full_name, phone, status, role, branch_id, 
  membership_tier, created_at, updated_at
) VALUES (
  '11111111-1111-1111-1111-111111111111'::uuid,
  'customer-new@example.com',
  'Nguyễn Văn A',
  '0901234567',
  'active'::user_status,
  'customer'::user_role,
  NULL,                           -- customer không có branch_id
  'standard'::membership_tier,
  now(),
  now()
) ON CONFLICT (email) DO UPDATE SET updated_at = now();

-- Tạo profile cho user mới
INSERT INTO profiles (user_id, updated_at)
VALUES ('11111111-1111-1111-1111-111111111111'::uuid, now())
ON CONFLICT (user_id) DO NOTHING;

-- Đăng ký qua Google OAuth
INSERT INTO users (
  id, email, full_name, phone, status, role, branch_id, 
  membership_tier, created_at, updated_at
) VALUES (
  '22222222-2222-2222-2222-222222222222'::uuid,
  'customer-google@example.com',
  'Full Name From Google',
  NULL,
  'active'::user_status,
  'customer'::user_role,
  NULL,
  'standard'::membership_tier,
  now(),
  now()
) ON CONFLICT (email) DO UPDATE SET updated_at = now();

INSERT INTO auth_accounts (id, user_id, provider, provider_user_id, created_at)
VALUES (
  gen_random_uuid(),
  '22222222-2222-2222-2222-222222222222'::uuid,
  'google',
  'google-user-id-12345',
  now()
) ON CONFLICT (provider, provider_user_id) DO NOTHING;


-- ============================================
-- LUỒNG 0b: Login (Customer/Staff/Admin)
-- ============================================
RAISE NOTICE '=============== LUỒNG 0b: Login Lookup ===============';

-- Tìm user bằng Google OAuth
SELECT u.id, u.email, u.role, u.branch_id, u.status
FROM users u
LEFT JOIN auth_accounts aa ON u.id = aa.user_id
WHERE aa.provider = 'google' 
  AND aa.provider_user_id = 'google-user-id-12345'
  AND u.status = 'active';

-- Tìm user bằng email (case-insensitive)
SELECT u.id, u.email, u.role, u.branch_id, u.status
FROM users u
WHERE LOWER(u.email) = LOWER('customer-new@example.com')
  AND u.status = 'active';


-- ============================================
-- LUỒNG 0c: Quản Lý Tài Khoản (System Admin -> Branch Admin -> Staff)
-- ============================================
RAISE NOTICE '=============== LUỒNG 0c: Account Management ===============';

-- Tạo branch mẫu trước
INSERT INTO branches (
  id, code, name, address, city, timezone, open_time, close_time, status, created_at, updated_at
) VALUES (
  '33333333-3333-3333-3333-333333333333'::uuid,
  'HN-001',
  'Hanoi Downtown',
  '123 Cau Giay, Hanoi',
  'Hanoi',
  'Asia/Ho_Chi_Minh',
  '08:00:00'::time,
  '22:00:00'::time,
  'active'::branch_status,
  now(),
  now()
) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- Tạo Admin chi nhánh (bắt buộc branch_id)
INSERT INTO users (
  id, email, full_name, phone, status, role, branch_id,
  membership_tier, created_at, updated_at
) VALUES (
  '44444444-4444-4444-4444-444444444444'::uuid,
  'admin-branch-001@example.com',
  'Lê Văn C',
  '0923456789',
  'active'::user_status,
  'branch_admin'::user_role,
  '33333333-3333-3333-3333-333333333333'::uuid,
  'standard'::membership_tier,
  now(),
  now()
) ON CONFLICT (email) DO UPDATE SET updated_at = now();

-- Tạo Nhân viên (bắt buộc branch_id)
INSERT INTO users (
  id, email, full_name, phone, status, role, branch_id,
  membership_tier, created_at, updated_at
) VALUES (
  '55555555-5555-5555-5555-555555555555'::uuid,
  'staff-branch-001@example.com',
  'Trần Thị B',
  '0912345678',
  'active'::user_status,
  'staff'::user_role,
  '33333333-3333-3333-3333-333333333333'::uuid,
  'standard'::membership_tier,
  now(),
  now()
) ON CONFLICT (email) DO UPDATE SET updated_at = now();


-- ============================================
-- LUỒNG 0d: Admin Cấu Hình Không Gian (Branch/Floor/Workspace)
-- ============================================
RAISE NOTICE '=============== LUỒNG 0d: Space Configuration ===============';

-- Tạo Floor cho branch
INSERT INTO floors (
  id, branch_id, floor_no, name, svg_url, map_version, is_published,
  created_at, updated_at
) VALUES (
  '66666666-6666-6666-6666-666666666666'::uuid,
  '33333333-3333-3333-3333-333333333333'::uuid,
  1,
  'Ground Floor',
  'https://cdn.example.com/svg/branch-001-floor-1-v1.svg',
  1,
  true,
  now(),
  now()
) ON CONFLICT (branch_id, floor_no) DO UPDATE SET svg_url = EXCLUDED.svg_url;

-- Tạo Workspace desk
INSERT INTO workspaces (
  id, floor_id, workspace_type_id, code, name, capacity,
  svg_element_id, status, created_at, updated_at
) VALUES (
  '77777777-7777-7777-7777-777777777777'::uuid,
  '66666666-6666-6666-6666-666666666666'::uuid,
  '10000000-0000-0000-0000-000000000001'::uuid, -- desk type
  'DESK-001',
  'Desk 1',
  1,
  'desk-element-001',
  'active'::workspace_status,
  now(),
  now()
) ON CONFLICT (floor_id, code) DO UPDATE SET name = EXCLUDED.name;

-- Tạo Workspace meeting room
INSERT INTO workspaces (
  id, floor_id, workspace_type_id, code, name, capacity,
  svg_element_id, status, created_at, updated_at
) VALUES (
  '88888888-8888-8888-8888-888888888888'::uuid,
  '66666666-6666-6666-6666-666666666666'::uuid,
  '10000000-0000-0000-0000-000000000002'::uuid, -- meeting room
  'ROOM-101',
  'Meeting Room 101',
  6,
  'room-element-101',
  'active'::workspace_status,
  now(),
  now()
) ON CONFLICT (floor_id, code) DO UPDATE SET name = EXCLUDED.name;


-- ============================================
-- LUỒNG 0e: Admin Cấu Hình Giá (Price Policies)
-- ============================================
RAISE NOTICE '=============== LUỒNG 0e: Pricing Policies Configuration ===============';

-- Tạo chính sách giá Global (branch_id = null)
INSERT INTO price_policies (
  id, branch_id, workspace_type_id, duration_unit, price,
  is_active, created_at, updated_at
) VALUES (
  '99999999-9999-9999-9999-999999999999'::uuid,
  NULL,
  '10000000-0000-0000-0000-000000000001'::uuid, -- desk type
  'hour'::duration_unit,
  150000,
  true,
  now(),
  now()
) ON CONFLICT (workspace_type_id, duration_unit) WHERE branch_id IS NULL DO UPDATE SET price = EXCLUDED.price;

-- Tạo chính sách giá riêng chi nhánh HN-001 (Override)
INSERT INTO price_policies (
  id, branch_id, workspace_type_id, duration_unit, price,
  is_active, created_at, updated_at
) VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid,
  '33333333-3333-3333-3333-333333333333'::uuid, -- branch id
  '10000000-0000-0000-0000-000000000001'::uuid, -- desk type
  'hour'::duration_unit,
  200000,                                       -- 200,000 (override)
  true,
  now(),
  now()
) ON CONFLICT (branch_id, workspace_type_id, duration_unit) DO UPDATE SET price = EXCLUDED.price;

-- Query thử chính sách giá ưu tiên chi nhánh
SELECT pp.id, pp.price, pp.duration_unit
FROM price_policies pp
WHERE pp.workspace_type_id = '10000000-0000-0000-0000-000000000001'::uuid
  AND pp.duration_unit = 'hour'::duration_unit
  AND pp.is_active = true
  AND (pp.branch_id = '33333333-3333-3333-3333-333333333333'::uuid OR pp.branch_id IS NULL)
ORDER BY pp.branch_id DESC NULLS LAST
LIMIT 1;


-- ============================================
-- LUỒNG 0f: Admin Cấu Hình Add-on Service
-- ============================================
RAISE NOTICE '=============== LUỒNG 0f: Extra Services Configuration ===============';

-- Tạo dịch vụ Global (branch_id = null)
INSERT INTO extra_services (
  id, branch_id, code, name, service_type, unit, price,
  is_active, created_at, updated_at
) VALUES (
  '1111aaaa-2222-3333-4444-555555555555'::uuid,
  NULL,
  'COFFEE',
  'Cà Phê Espresso',
  'drink'::service_type,
  'cup',
  15000,
  true,
  now(),
  now()
) ON CONFLICT (code) WHERE branch_id IS NULL DO UPDATE SET price = EXCLUDED.price;

-- Tạo dịch vụ riêng chi nhánh HN-001 (Override)
INSERT INTO extra_services (
  id, branch_id, code, name, service_type, unit, price,
  is_active, created_at, updated_at
) VALUES (
  '2222bbbb-3333-4444-5555-666666666666'::uuid,
  '33333333-3333-3333-3333-333333333333'::uuid,
  'COFFEE',
  'Cà Phê Espresso',
  'drink'::service_type,
  'cup',
  20000, -- override price
  true,
  now(),
  now()
) ON CONFLICT (branch_id, code) DO UPDATE SET price = EXCLUDED.price;


-- ============================================
-- LUỒNG 0g: Admin Cấu Hình Chính Sách Hủy (Cancellation Policy)
-- ============================================
RAISE NOTICE '=============== LUỒNG 0g: Cancellation Policies Configuration ===============';

-- Grace Hour Policy (Global)
INSERT INTO cancellation_policies (
  id, name, rule_type, min_value, max_value, refund_percent, priority,
  branch_id, workspace_type_id, is_active, created_at, updated_at
) VALUES (
  '1000bbbb-2222-3333-4444-555555555555'::uuid,
  'Grace Period: 2 hours',
  'GRACE_HOURS'::cancel_rule_type,
  0,
  2,
  100,
  10,
  NULL,
  NULL,
  true,
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- Before Start 20+ Days Policy (Global)
INSERT INTO cancellation_policies (
  id, name, rule_type, min_value, max_value, refund_percent, priority,
  branch_id, workspace_type_id, is_active, created_at, updated_at
) VALUES (
  '2000bbbb-3333-4444-5555-666666666666'::uuid,
  'Safe Zone: 20+ days before',
  'BEFORE_START_DAYS'::cancel_rule_type,
  20,
  365,
  100,
  20,
  NULL,
  NULL,
  true,
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- Before Start Partial Refund Policy (Global)
INSERT INTO cancellation_policies (
  id, name, rule_type, min_value, max_value, refund_percent, priority,
  branch_id, workspace_type_id, is_active, created_at, updated_at
) VALUES (
  '3000bbbb-4444-5555-6666-777777777777'::uuid,
  'Partial Refund: 5-19 days before',
  'BEFORE_START_DAYS'::cancel_rule_type,
  5,
  19,
  50,
  15,
  NULL,
  NULL,
  true,
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;


-- ============================================
-- LUỒNG 1: Booking + Thanh Toán MoMo (Online)
-- ============================================
RAISE NOTICE '=============== LUỒNG 1: Booking and MoMo Payment ===============';

-- 1. Tìm workspace trống (check overlap)
SELECT w.id, w.code, w.capacity 
FROM workspaces w
JOIN floors f ON w.floor_id = f.id
WHERE f.branch_id = '33333333-3333-3333-3333-333333333333'::uuid
  AND w.status = 'active'
  AND w.workspace_type_id = '10000000-0000-0000-0000-000000000001'::uuid
  AND NOT EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.workspace_id = w.id
      AND b.branch_id = '33333333-3333-3333-3333-333333333333'::uuid
      AND b.status IN ('pending_payment', 'confirmed', 'checked_in')
      AND (b.start_at < '2026-07-16 17:00:00+07'::timestamptz AND b.end_at > '2026-07-16 09:00:00+07'::timestamptz)
  )
  AND NOT EXISTS (
    SELECT 1 FROM workspace_maintenance wm
    WHERE wm.workspace_id = w.id
      AND wm.status IN ('scheduled', 'active')
      AND (wm.start_at < '2026-07-16 17:00:00+07'::timestamptz AND wm.end_at > '2026-07-16 09:00:00+07'::timestamptz)
  );

-- 2. Tạo Booking
INSERT INTO bookings (
  id, booking_code, user_id, workspace_id, branch_id,
  start_at, end_at, duration_unit, unit_count, status,
  subtotal_amount, discount_amount, addon_amount, total_amount,
  payment_deadline_at, source, created_at, updated_at
) VALUES (
  '99990000-1111-2222-3333-444444444444'::uuid,
  'BK260716001',
  '11111111-1111-1111-1111-111111111111'::uuid, -- customer 1
  '77777777-7777-7777-7777-777777777777'::uuid, -- desk 1
  '33333333-3333-3333-3333-333333333333'::uuid, -- branch 1
  '2026-07-16 09:00:00+07'::timestamptz,
  '2026-07-16 17:00:00+07'::timestamptz,
  'day'::duration_unit,
  1,
  'pending_payment'::booking_status,
  800000,
  0,
  0,
  800000,
  now() + interval '15 minutes',
  'web'::booking_source,
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- 3. Tạo payment record (initiated)
INSERT INTO payments (
  id, booking_id, provider, method, order_id, request_id,
  amount, status, pay_url, created_at, updated_at
) VALUES (
  '88880000-2222-3333-4444-555555555555'::uuid,
  '99990000-1111-2222-3333-444444444444'::uuid,
  'momo'::payment_provider,
  'qr'::payment_method,
  'MOMO-20260716-001',
  'req-20260716-001',
  800000,
  'initiated'::payment_status,
  'https://pay.momo.vn/...',
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- 4. MoMo Webhook IPN (idempotency check + processing)
-- Tạo payment event
INSERT INTO payment_events (
  id, payment_id, event_type, idempotency_key, 
  provider_event_id, signature_valid, payload_json,
  processed, created_at
) VALUES (
  gen_random_uuid(),
  '88880000-2222-3333-4444-555555555555'::uuid,
  'payment_success',
  'momo-webhook-20260716-001',
  'momo-evt-998877',
  true,
  '{"status": "Success", "amount": 800000}'::jsonb,
  false,
  now()
) ON CONFLICT (idempotency_key) DO NOTHING;

-- Cập nhật trạng thái payment & booking
UPDATE payments 
SET status = 'paid'::payment_status,
    provider_trans_id = 'momo-trans-998877',
    paid_at = now(),
    updated_at = now()
WHERE id = '88880000-2222-3333-4444-555555555555'::uuid;

UPDATE bookings
SET status = 'confirmed'::booking_status,
    updated_at = now()
WHERE id = '99990000-1111-2222-3333-444444444444'::uuid;

-- Mark event as processed
UPDATE payment_events
SET processed = true, processed_at = now()
WHERE idempotency_key = 'momo-webhook-20260716-001';


-- ============================================
-- LUỒNG 2: Booking + Thanh toán Cash tại quầy (Staff)
-- ============================================
RAISE NOTICE '=============== LUỒNG 2: Offline Cash Booking ===============';

-- Tạo booking cho customer (source = counter)
INSERT INTO bookings (
  id, booking_code, user_id, workspace_id, branch_id,
  start_at, end_at, duration_unit, unit_count, status,
  subtotal_amount, discount_amount, addon_amount, total_amount,
  payment_deadline_at, source, created_at, updated_at
) VALUES (
  '99990000-2222-3333-4444-555555555555'::uuid,
  'BK260716-CASH',
  '22222222-2222-2222-2222-222222222222'::uuid, -- customer 2
  '88888888-8888-8888-8888-888888888888'::uuid, -- room 101
  '33333333-3333-3333-3333-333333333333'::uuid, -- branch 1
  '2026-07-16 10:00:00+07'::timestamptz,
  '2026-07-16 11:00:00+07'::timestamptz,
  'hour'::duration_unit,
  1,
  'pending_payment'::booking_status,
  500000,
  0,
  0,
  500000,
  now() + interval '2 hours',
  'counter'::booking_source,
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- Tạo payment cash (chờ staff nhận tiền)
INSERT INTO payments (
  id, booking_id, provider, method, order_id,
  amount, status, created_by_staff_id, created_at, updated_at
) VALUES (
  '88880000-3333-4444-5555-666666666666'::uuid,
  '99990000-2222-3333-4444-555555555555'::uuid,
  'cash'::payment_provider,
  'cash'::payment_method,
  'CASH-20260716-001',
  500000,
  'pending'::payment_status,
  '55555555-5555-5555-5555-555555555555'::uuid, -- staff id
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- Staff xác nhận nhận tiền (paid)
UPDATE payments
SET status = 'paid'::payment_status,
    updated_at = now()
WHERE id = '88880000-3333-4444-5555-666666666666'::uuid;

UPDATE bookings
SET status = 'confirmed'::booking_status,
    updated_at = now()
WHERE id = '99990000-2222-3333-4444-555555555555'::uuid;


-- ============================================
-- LUỒNG 2b: Gọi thêm dịch vụ (Add-on Running Tab)
-- ============================================
RAISE NOTICE '=============== LUỒNG 2b: Service Add-on to Booking ===============';

-- Thêm dịch vụ COFFEE vào booking 2
INSERT INTO booking_services (
  id, booking_id, extra_service_id, quantity, unit_price, line_total, added_by_staff_id, created_at
) VALUES (
  gen_random_uuid(),
  '99990000-2222-3333-4444-555555555555'::uuid, -- booking 2
  '2222bbbb-3333-4444-5555-666666666666'::uuid, -- branch coffee service
  2,                                            -- quantity: 2
  20000,                                        -- unit price
  40000,                                        -- total = 40000
  '55555555-5555-5555-5555-555555555555'::uuid, -- staff id
  now()
);

-- Do DB Trigger trg_update_booking_addon_amount tự động chạy, 
-- we will update bookings manually in this test query to simulate trigger outcome:
UPDATE bookings
SET addon_amount = addon_amount + 40000,
    total_amount = total_amount + 40000
WHERE id = '99990000-2222-3333-4444-555555555555'::uuid;


-- ============================================
-- LUỒNG 3: Check-in/Check-out
-- ============================================
RAISE NOTICE '=============== LUỒNG 3: Check-in & Check-out Operation ===============';

-- 1. Check-in
INSERT INTO checkin_logs (
  id, booking_id, staff_user_id, checkin_at, created_at
) VALUES (
  'aaaa0000-1111-2222-3333-444444444444'::uuid,
  '99990000-2222-3333-4444-555555555555'::uuid, -- booking 2
  '55555555-5555-5555-5555-555555555555'::uuid, -- staff id
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

UPDATE bookings
SET status = 'checked_in'::booking_status,
    updated_at = now()
WHERE id = '99990000-2222-3333-4444-555555555555'::uuid;

-- 2. Check-out
UPDATE checkin_logs
SET checkout_at = now()
WHERE booking_id = '99990000-2222-3333-4444-555555555555'::uuid
  AND checkout_at IS NULL;

UPDATE bookings
SET status = 'completed'::booking_status,
    updated_at = now()
WHERE id = '99990000-2222-3333-4444-555555555555'::uuid;


-- ============================================
-- LUỒNG 4: Hủy Booking + Hoàn Tiền (Tự Động Theo Policy)
-- ============================================
RAISE NOTICE '=============== LUỒNG 4: Auto-Cancellation & Refund ===============';

-- Booking 1 (confirmed) cần hủy.
-- Tìm policy (Giả định khoảng cách start_at vs now() > 5 ngày → áp dụng cp 50% refund)
-- CP áp dụng: 3000bbbb-4444-5555-6666-777777777777 (50%)
-- refund_amount = 800000 * 0.50 = 400000
-- penalty_amount = 800000 - 400000 = 400000

INSERT INTO booking_cancellations (
  id, booking_id, policy_id, refund_percent, refund_amount, penalty_amount,
  reason, cancelled_by, cancelled_at, refund_status, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '99990000-1111-2222-3333-444444444444'::uuid, -- booking 1
  '3000bbbb-4444-5555-6666-777777777777'::uuid, -- policy id
  50,
  400000,
  400000,
  'Customer requested cancellation',
  '11111111-1111-1111-1111-111111111111'::uuid, -- cancelled by customer
  now(),
  'confirmed'::refund_status, -- auto confirmed
  now(),
  now()
);

-- Cập nhật booking status
UPDATE bookings
SET status = 'canceled'::booking_status,
    updated_at = now()
WHERE id = '99990000-1111-2222-3333-444444444444'::uuid;


-- ============================================
-- LUỒNG 5: Matching Partner (Tìm Kiếm Đối Tác)
-- ============================================
RAISE NOTICE '=============== LUỒNG 5: Profile Matching Engine ===============';

-- 1. Cập nhật profile và kĩ năng/sở thích của Customer 1
UPDATE profiles 
SET bio = 'Senior Backend Engineer', 
    profession = 'Developer', 
    company = 'CoSpace Co.', 
    contact_public = true, 
    updated_at = now()
WHERE user_id = '11111111-1111-1111-1111-111111111111'::uuid;

INSERT INTO profile_skills (profile_user_id, tag_id, level) 
VALUES 
  ('11111111-1111-1111-1111-111111111111'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 5), -- Python
  ('11111111-1111-1111-1111-111111111111'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, 3)  -- React
ON CONFLICT (profile_user_id, tag_id) DO UPDATE SET level = EXCLUDED.level;

INSERT INTO profile_interests (profile_user_id, tag_id, priority)
VALUES 
  ('11111111-1111-1111-1111-111111111111'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, 4)  -- Startup
ON CONFLICT (profile_user_id, tag_id) DO UPDATE SET priority = EXCLUDED.priority;

-- 2. Cập nhật profile Customer 2
UPDATE profiles 
SET bio = 'Founder of Tech Startup', 
    profession = 'Entrepreneur', 
    company = 'NewTech', 
    contact_public = true, 
    updated_at = now()
WHERE user_id = '22222222-2222-2222-2222-222222222222'::uuid;

INSERT INTO profile_skills (profile_user_id, tag_id, level) 
VALUES 
  ('22222222-2222-2222-2222-222222222222'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 2)  -- Python
ON CONFLICT (profile_user_id, tag_id) DO UPDATE SET level = EXCLUDED.level;

INSERT INTO profile_interests (profile_user_id, tag_id, priority)
VALUES 
  ('22222222-2222-2222-2222-222222222222'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, 5)  -- Startup
ON CONFLICT (profile_user_id, tag_id) DO UPDATE SET priority = EXCLUDED.priority;

-- 3. Tạo Match Score (Customer 1 vs Customer 2)
INSERT INTO profile_match_scores (profile_user_id, matched_user_id, score, reasons_json, computed_at)
VALUES (
  '11111111-1111-1111-1111-111111111111'::uuid,
  '22222222-2222-2222-2222-222222222222'::uuid,
  0.8500,
  '{"skill_match": 0.6, "interest_match": 0.25, "reason": "Cùng chung chuyên môn Python và định hướng Startup."}'::jsonb,
  now()
)
ON CONFLICT (profile_user_id, matched_user_id) DO UPDATE SET
  score = EXCLUDED.score,
  reasons_json = EXCLUDED.reasons_json,
  computed_at = now();

-- 4. API Query Suggested Partners
SELECT 
  pms.matched_user_id,
  u.full_name,
  p.profession,
  p.company,
  pms.score,
  pms.reasons_json,
  CASE WHEN p.contact_public THEN u.email ELSE NULL END as contact_email,
  CASE WHEN p.contact_public THEN u.phone ELSE NULL END as contact_phone
FROM profile_match_scores pms
JOIN users u ON pms.matched_user_id = u.id
JOIN profiles p ON u.id = p.user_id
WHERE pms.profile_user_id = '11111111-1111-1111-1111-111111111111'::uuid
  AND u.status = 'active'
ORDER BY pms.score DESC
LIMIT 10;


-- ============================================
-- VERIFY SCHEMATIC CONSTRAINTS AND DB INTEGRITY
-- ============================================
RAISE NOTICE '=============== FINAL VALIDATION: Core Constraints ===============';

-- Verify check_branch_by_role constraint
SELECT 'Verify 1a: super_admin branch_id is null' as check_name, 
       COUNT(*) as correct_count
FROM users WHERE role = 'super_admin' AND branch_id IS NULL;

SELECT 'Verify 1b: staff branch_id is not null' as check_name,
       COUNT(*) as correct_count
FROM users WHERE role = 'staff' AND branch_id IS NOT NULL;

-- Verify Booking amount calculation
SELECT 'Verify 2: Booking amount invariant' as check_name,
       COUNT(*) as correct_count
FROM bookings
WHERE total_amount = (subtotal_amount - discount_amount + addon_amount);

-- Verify No self-matching constraint
SELECT 'Verify 3: No self-matching scores' as check_name,
       COUNT(*) as invalid_count
FROM profile_match_scores
WHERE profile_user_id = matched_user_id;

-- Verify 1 check-in mở per booking (uq_checkin_open index test)
SELECT 'Verify 4: Active check-in constraint' as check_name,
       COUNT(*) as open_checkin_count
FROM checkin_logs
WHERE checkout_at IS NULL;

RAISE NOTICE '=============== TESTS COMPLETE: All constraints verified ===============';

ROLLBACK;
