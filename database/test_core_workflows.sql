-- ============================================
-- Test SQL: Co-Working Space MVP - Core Workflows
-- ============================================
-- Ngày: 2026-04-16
-- Mục tiêu: Chạy 3 luồng đơn giản để verify schema hoạt động
-- Database: PostgreSQL 13+ (sau khi chạy migration_v1_core_schema.sql)

BEGIN;

-- ============================================
-- Prepare Test Data
-- ============================================

-- Tạo admin tổng
INSERT INTO users (id, email, full_name, phone, role, branch_id, created_at, updated_at) 
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'admin@example.com',
  'Super Admin',
  '0900000001',
  'super_admin',
  NULL,
  now(),
  now()
);

-- Tạo branch
INSERT INTO branches (id, code, name, address, city, timezone, status, created_at, updated_at)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  'HN-001',
  'Hanoi Downtown',
  '123 Cau Giay',
  'Hanoi',
  'Asia/Ho_Chi_Minh',
  'active',
  now(),
  now()
);

-- Tạo admin chi nhánh
INSERT INTO users (id, email, full_name, phone, role, branch_id, created_at, updated_at)
VALUES (
  'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
  'admin-branch@example.com',
  'Branch Admin',
  '0900000002',
  'branch_admin',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  now(),
  now()
);

-- Tạo staff
INSERT INTO users (id, email, full_name, phone, role, branch_id, created_at, updated_at)
VALUES (
  'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
  'staff@example.com',
  'Staff Member',
  '0900000003',
  'staff',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  now(),
  now()
);

-- Tạo customer
INSERT INTO users (id, email, full_name, phone, role, branch_id, created_at, updated_at)
VALUES (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid,
  'customer@example.com',
  'Nguyen Van A',
  '0900000004',
  'customer',
  NULL,
  now(),
  now()
);

-- Tạo floor + workspace
INSERT INTO floors (id, branch_id, floor_no, name, svg_url, created_at, updated_at)
VALUES (
  'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid,
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  1,
  'Ground Floor',
  'https://example.com/svg/floor-1.svg',
  now(),
  now()
);

INSERT INTO workspaces (id, floor_id, workspace_type_id, code, name, capacity, svg_element_id, status, created_at, updated_at)
VALUES (
  '11111111-1111-1111-1111-111111111111'::uuid,
  'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid,
  (SELECT id FROM workspace_types WHERE code = 'desk' LIMIT 1),
  'DESK-001',
  'Desk 1',
  1,
  'desk-element-001',
  'active',
  now(),
  now()
);

-- Tạo price policy
INSERT INTO price_policies (id, branch_id, workspace_type_id, duration_unit, price, is_active, created_at, updated_at)
VALUES (
  '22222222-2222-2222-2222-222222222222'::uuid,
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  (SELECT id FROM workspace_types WHERE code = 'desk' LIMIT 1),
  'hour',
  150000,
  true,
  now(),
  now()
);

-- ============================================
-- TEST 1: Login (Query user theo email case-insensitive)
-- ============================================

RAISE NOTICE '=============== TEST 1: Login with Email Case-Insensitive ===============';

-- Test 1a: Tìm user bằng email lowercase
SELECT 'Test 1a' as test_name, id, email, role, branch_id
FROM users
WHERE LOWER(email) = LOWER('CUSTOMER@EXAMPLE.COM')
  AND status = 'active';

-- Test 1b: Verify role + branch scope
SELECT 'Test 1b' as test_name, id, email, role, branch_id
FROM users
WHERE email = 'admin@example.com'
  AND role = 'super_admin'::user_role
  AND branch_id IS NULL;

SELECT 'Test 1b' as test_name, id, email, role, branch_id
FROM users
WHERE email = 'staff@example.com'
  AND role = 'staff'::user_role
  AND branch_id IS NOT NULL;

-- ============================================
-- TEST 2: Booking (Tìm chỗ trống + Tạo booking)
-- ============================================

RAISE NOTICE '=============== TEST 2: Booking + Find Available Workspace ===============';

-- Test 2a: Tìm workspace trống (không overlap)
SELECT 'Test 2a' as test_name, w.id, w.code, w.name, w.capacity
FROM workspaces w
JOIN floors f ON w.floor_id = f.id
WHERE f.branch_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid
  AND w.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.workspace_id = w.id
      AND b.status IN ('pending_payment', 'confirmed', 'checked_in')
      AND (b.start_at, b.end_at) OVERLAPS ('2026-04-16 09:00:00+07'::timestamptz, '2026-04-16 17:00:00+07'::timestamptz)
  )
  AND NOT EXISTS (
    SELECT 1 FROM workspace_maintenance wm
    WHERE wm.workspace_id = w.id
      AND wm.status IN ('scheduled', 'active')
      AND (wm.start_at, wm.end_at) OVERLAPS ('2026-04-16 09:00:00+07'::timestamptz, '2026-04-16 17:00:00+07'::timestamptz)
  );

-- Test 2b: Tạo booking
INSERT INTO bookings (
  id, booking_code, user_id, workspace_id, branch_id,
  start_at, end_at, unit, unit_count, status,
  subtotal_amount, discount_amount, addon_amount, total_amount,
  payment_deadline_at, source, created_at, updated_at
) VALUES (
  '33333333-3333-3333-3333-333333333333'::uuid,
  'BK20260416-001',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid,
  '11111111-1111-1111-1111-111111111111'::uuid,
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  '2026-04-16 09:00:00+07'::timestamptz,
  '2026-04-16 17:00:00+07'::timestamptz,
  'day'::duration_unit,
  1,
  'pending_payment'::booking_status,
  1200000,  -- 8 giờ * 150k = 1,200,000
  0,
  0,
  1200000,
  now() + interval '15 minutes',
  'web',
  now(),
  now()
);

RAISE NOTICE 'Booking created: BK20260416-001 (total: 1,200,000)';

-- Test 2c: Verify booking_code unique + amount calculation
SELECT 'Test 2c' as test_name, booking_code, total_amount, 
       (total_amount = (subtotal_amount - discount_amount + addon_amount))::text as amount_correct
FROM bookings
WHERE booking_code = 'BK20260416-001';

-- ============================================
-- TEST 3: Check-in / Check-out
-- ============================================

RAISE NOTICE '=============== TEST 3: Check-in & Check-out ===============';

-- Test 3a: Cập nhật booking thành confirmed (simulate payment success)
UPDATE bookings
SET status = 'confirmed'::booking_status, updated_at = now()
WHERE booking_code = 'BK20260416-001';

RAISE NOTICE 'Booking confirmed for check-in';

-- Test 3b: Tạo payment record
INSERT INTO payments (
  id, booking_id, provider, method, order_id,
  amount, status, created_by_staff_id, created_at, updated_at
) VALUES (
  '44444444-4444-4444-4444-444444444444'::uuid,
  '33333333-3333-3333-3333-333333333333'::uuid,
  'cash'::payment_provider,
  'cash'::payment_method,
  'CASH-20260416-001',
  1200000,
  'paid'::payment_status,
  'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
  now(),
  now()
);

RAISE NOTICE 'Payment created by staff (cash confirmed)';

-- Test 3c: Staff check-in bằng booking_code
SELECT 'Test 3c' as test_name, b.id, b.booking_code, b.status, 
       w.code as workspace_code, u.full_name as customer_name
FROM bookings b
JOIN workspaces w ON b.workspace_id = w.id
JOIN users u ON b.user_id = u.id
WHERE b.booking_code = 'BK20260416-001'
  AND b.status = 'confirmed';

-- Test 3d: Tạo checkin log
INSERT INTO checkin_logs (
  id, booking_id, staff_user_id, checkin_at, created_at
) VALUES (
  '55555555-5555-5555-5555-555555555555'::uuid,
  '33333333-3333-3333-3333-333333333333'::uuid,
  'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
  now(),
  now()
);

RAISE NOTICE 'Customer checked in';

-- Test 3e: Cập nhật booking thành checked_in
UPDATE bookings
SET status = 'checked_in'::booking_status, updated_at = now()
WHERE booking_code = 'BK20260416-001';

-- Test 3f: Verify checkin unique (chỉ 1 checkin mở per booking)
SELECT 'Test 3f' as test_name, COUNT(*) as open_checkin_count
FROM checkin_logs
WHERE booking_id = '33333333-3333-3333-3333-333333333333'::uuid
  AND checkout_at IS NULL;

-- Test 3g: Staff check-out
UPDATE checkin_logs
SET checkout_at = now()
WHERE booking_id = '33333333-3333-3333-3333-333333333333'::uuid
  AND checkout_at IS NULL;

-- Cập nhật booking thành completed
UPDATE bookings
SET status = 'completed'::booking_status, updated_at = now()
WHERE booking_code = 'BK20260416-001';

RAISE NOTICE 'Customer checked out, booking completed';

-- ============================================
-- FINAL VERIFICATION
-- ============================================

RAISE NOTICE '=============== FINAL VERIFICATION ===============';

-- Verify 1: User role + branch constraint
SELECT 'Verify 1a: super_admin branch_id is null' as check_name, 
       COUNT(*) as correct_count
FROM users
WHERE role = 'super_admin'::user_role
  AND branch_id IS NULL;

SELECT 'Verify 1b: staff branch_id is not null' as check_name,
       COUNT(*) as correct_count
FROM users
WHERE role = 'staff'::user_role
  AND branch_id IS NOT NULL;

-- Verify 2: Booking amount calculation
SELECT 'Verify 2: Booking amount = subtotal - discount + addon' as check_name,
       COUNT(*) as correct_count
FROM bookings
WHERE total_amount = (subtotal_amount - discount_amount + addon_amount);

-- Verify 3: Payment idempotency (order_id unique)
SELECT 'Verify 3: Payment order_id unique' as check_name,
       COUNT(DISTINCT order_id) as unique_order_count
FROM payments
WHERE order_id IS NOT NULL;

-- Verify 4: Booking code unique
SELECT 'Verify 4: Booking code unique' as check_name,
       COUNT(DISTINCT booking_code) as unique_code_count
FROM bookings;

-- Verify 5: Email case-insensitive lookup
SELECT 'Verify 5: Email case-insensitive' as check_name,
       COUNT(*) as matching_emails
FROM users
WHERE LOWER(email) = LOWER('CUSTOMER@EXAMPLE.COM');

-- Verify 6: Booking overlap (verify không có 2 booking overlap cùng workspace)
SELECT 'Verify 6: No overlap booking' as check_name,
       COUNT(*) as overlapping_count
FROM bookings b1
JOIN bookings b2 ON b1.workspace_id = b2.workspace_id
  AND b1.id != b2.id
  AND b1.status IN ('pending_payment', 'confirmed', 'checked_in')
  AND b2.status IN ('pending_payment', 'confirmed', 'checked_in')
  AND (b1.start_at, b1.end_at) OVERLAPS (b2.start_at, b2.end_at);

RAISE NOTICE '=============== TESTS COMPLETE ===============';

-- Rollback hoặc Commit tùy bạn
ROLLBACK;
-- COMMIT;
