-- =============================================================================
-- CoSpace Seed Script: Realtime & Comprehensive Demo Data
-- PURPOSE: Fresh operational data for today (2026-09-30) + 12-month analytics (2026-2027)
--          Sprint 6 Features: VietQR Running Tab, Extensions, Late Checkout Surcharge,
--                             Personal Vouchers, Partner Connections, Refunds Queue, Images
-- Target: PostgreSQL 13+ / Supabase PostgreSQL
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. CLEANUP JUNK DATA & TEST DUMMIES
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM workspace_maintenance WHERE reason IN ('sss', 'ád', 'sadd', 'ádas', 'dê thấy');

-- Mark test dummy workspaces inactive cleanly
UPDATE workspaces 
SET status = 'inactive' 
WHERE code IN ('BNLMVIC', 'BNLMVIC-1', 'GHLMVIC', 'BNLMVIC-2', 'GHLMVIC-1', 'GHLMVIC-2', 'PHNGHP', 'VPRING');

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. REALTIME OPERATIONAL BOOKINGS FOR TODAY (CURRENT_DATE)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── CS-Q1: Booking 1 — CONFIRMED (Waiting for check-in)
-- User: Nguyễn Văn An (d1000001-0000-0000-0000-000000000001)
-- Workspace: HD-101 (c1010001-0000-0000-0000-000000000001)
INSERT INTO bookings (
  id, booking_code, user_id, workspace_id, branch_id, workspace_type_id,
  start_at, end_at, unit, unit_count, is_contract, status,
  price_per_unit, subtotal_amount, discount_amount, addon_amount, total_amount, source
) VALUES (
  'b1111111-0000-0000-0000-000000000001'::uuid, 'CS-BK-TODAY-01',
  'd1000001-0000-0000-0000-000000000001'::uuid, 'c1010001-0000-0000-0000-000000000001'::uuid,
  'b1000000-0000-0000-0000-000000000001'::uuid, 'desk',
  (CURRENT_DATE + TIME '08:30:00') AT TIME ZONE 'Asia/Ho_Chi_Minh',
  (CURRENT_DATE + TIME '17:30:00') AT TIME ZONE 'Asia/Ho_Chi_Minh',
  'day', 1, false, 'CONFIRMED',
  170000, 170000, 0, 0, 170000, 'web'
) ON CONFLICT (id) DO UPDATE SET status = 'CONFIRMED', start_at = EXCLUDED.start_at, end_at = EXCLUDED.end_at;

INSERT INTO payments (id, booking_id, user_id, provider, method, order_id, amount, status, paid_at, created_at, purpose)
VALUES (
  'ea111111-0000-0000-0000-000000000001'::uuid, 'b1111111-0000-0000-0000-000000000001'::uuid,
  'd1000001-0000-0000-0000-000000000001'::uuid, 'payos', 'vietqr', 'PAY-TODAY-01',
  170000, 'PAID', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours 5 minutes', 'booking'
) ON CONFLICT (id) DO NOTHING;


-- ── CS-Q1: Booking 2 — CHECKED_IN WITH UNPAID RUNNING TAB ITEMS
-- User: Trần Thị Bình (d1000001-0000-0000-0000-000000000002)
-- Workspace: MR-101 (c1010006-0000-0000-0000-000000000006), 8 seats meeting room
INSERT INTO bookings (
  id, booking_code, user_id, workspace_id, branch_id, workspace_type_id,
  start_at, end_at, unit, unit_count, is_contract, status,
  price_per_unit, subtotal_amount, discount_amount, addon_amount, total_amount, source
) VALUES (
  'b1111111-0000-0000-0000-000000000002'::uuid, 'CS-BK-TODAY-02',
  'd1000001-0000-0000-0000-000000000002'::uuid, 'c1010006-0000-0000-0000-000000000006'::uuid,
  'b1000000-0000-0000-0000-000000000001'::uuid, 'meeting_room',
  (CURRENT_DATE + TIME '08:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh',
  (CURRENT_DATE + TIME '13:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh',
  'hour', 5, false, 'CHECKED_IN',
  100000, 500000, 0, 100000, 600000, 'web'
) ON CONFLICT (id) DO UPDATE SET status = 'CHECKED_IN', start_at = EXCLUDED.start_at, end_at = EXCLUDED.end_at, addon_amount = 100000, total_amount = 600000;

INSERT INTO payments (id, booking_id, user_id, provider, method, order_id, amount, status, paid_at, created_at, purpose)
VALUES (
  'ea111111-0000-0000-0000-000000000002'::uuid, 'b1111111-0000-0000-0000-000000000002'::uuid,
  'd1000001-0000-0000-0000-000000000002'::uuid, 'payos', 'vietqr', 'PAY-TODAY-02',
  500000, 'PAID', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours 10 minutes', 'booking'
) ON CONFLICT (id) DO NOTHING;

-- Checkin log for Booking 2
INSERT INTO checkin_logs (id, booking_id, staff_user_id, checkin_at, checkout_at, note)
VALUES (
  'ca111111-0000-0000-0000-000000000002'::uuid, 'b1111111-0000-0000-0000-000000000002'::uuid,
  'd3000001-0000-0000-0000-000000000001'::uuid, (CURRENT_DATE + TIME '08:05:00') AT TIME ZONE 'Asia/Ho_Chi_Minh',
  NULL, 'Khách đến đúng giờ, chuẩn bị họp nhóm thiết kế'
) ON CONFLICT (id) DO NOTHING;

-- Running tab add-ons: 2 unpaid items (Latte + Bánh mì = 100k)
DELETE FROM booking_services WHERE booking_id = 'b1111111-0000-0000-0000-000000000002'::uuid;

INSERT INTO booking_services (id, booking_id, service_id, quantity, unit_price, subtotal, status, line_type, description, created_at)
VALUES 
  ('ba111111-0000-0000-0000-000000000001'::uuid, 'b1111111-0000-0000-0000-000000000002'::uuid,
   'e0000001-0000-0000-0000-000000000001'::uuid, 2, 35000, 70000, 'unpaid', 'service', 'Cà Phê Latte Sữa Tươi (2 ly)', NOW() - INTERVAL '45 minutes'),
  ('ba111111-0000-0000-0000-000000000002'::uuid, 'b1111111-0000-0000-0000-000000000002'::uuid,
   'e0000001-0000-0000-0000-000000000006'::uuid, 1, 30000, 30000, 'unpaid', 'service', 'Bánh Mì Thịt Nguội & Pate', NOW() - INTERVAL '30 minutes');


-- ── CS-Q1: Booking 3 — CHECKED_IN SẮP HẾT GIỜ (Gia hạn thời gian / Booking Extension)
-- User: Lê Quốc Cường (d1000001-0000-0000-0000-000000000003)
-- Workspace: HD-103 (c1010003-0000-0000-0000-000000000003)
INSERT INTO bookings (
  id, booking_code, user_id, workspace_id, branch_id, workspace_type_id,
  start_at, end_at, unit, unit_count, is_contract, status,
  price_per_unit, subtotal_amount, discount_amount, addon_amount, total_amount, source
) VALUES (
  'b1111111-0000-0000-0000-000000000003'::uuid, 'CS-BK-TODAY-03',
  'd1000001-0000-0000-0000-000000000003'::uuid, 'c1010003-0000-0000-0000-000000000003'::uuid,
  'b1000000-0000-0000-0000-000000000001'::uuid, 'desk',
  NOW() - INTERVAL '2 hours',
  NOW() + INTERVAL '25 minutes',
  'hour', 2, false, 'CHECKED_IN',
  25000, 50000, 0, 0, 50000, 'web'
) ON CONFLICT (id) DO UPDATE SET status = 'CHECKED_IN', start_at = EXCLUDED.start_at, end_at = EXCLUDED.end_at;

INSERT INTO payments (id, booking_id, user_id, provider, method, order_id, amount, status, paid_at, created_at, purpose)
VALUES (
  'ea111111-0000-0000-0000-000000000003'::uuid, 'b1111111-0000-0000-0000-000000000003'::uuid,
  'd1000001-0000-0000-0000-000000000003'::uuid, 'payos', 'vietqr', 'PAY-TODAY-03',
  50000, 'PAID', NOW() - INTERVAL '2 hours 10 minutes', NOW() - INTERVAL '2 hours 15 minutes', 'booking'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO checkin_logs (id, booking_id, staff_user_id, checkin_at, checkout_at, note)
VALUES (
  'ca111111-0000-0000-0000-000000000003'::uuid, 'b1111111-0000-0000-0000-000000000003'::uuid,
  'd3000001-0000-0000-0000-000000000001'::uuid, NOW() - INTERVAL '1 hour 55 minutes',
  NULL, 'Checkin bàn làm việc cá nhân'
) ON CONFLICT (id) DO NOTHING;


-- ── CS-Q1: Booking 4 — CHECKED_IN QUÁ HẠN 40 PHÚT (Phụ phí check-out muộn / Late Fee)
-- User: Đặng Văn Giang (d1000001-0000-0000-0000-000000000007)
-- Workspace: HD-102 (c1010002-0000-0000-0000-000000000002)
INSERT INTO bookings (
  id, booking_code, user_id, workspace_id, branch_id, workspace_type_id,
  start_at, end_at, unit, unit_count, is_contract, status,
  price_per_unit, subtotal_amount, discount_amount, addon_amount, total_amount, source
) VALUES (
  'b1111111-0000-0000-0000-000000000004'::uuid, 'CS-BK-TODAY-04',
  'd1000001-0000-0000-0000-000000000007'::uuid, 'c1010002-0000-0000-0000-000000000002'::uuid,
  'b1000000-0000-0000-0000-000000000001'::uuid, 'desk',
  NOW() - INTERVAL '3 hours 40 minutes',
  NOW() - INTERVAL '40 minutes',
  'hour', 3, false, 'CHECKED_IN',
  25000, 75000, 0, 0, 75000, 'counter'
) ON CONFLICT (id) DO UPDATE SET status = 'CHECKED_IN', start_at = EXCLUDED.start_at, end_at = EXCLUDED.end_at;

INSERT INTO payments (id, booking_id, user_id, provider, method, order_id, amount, status, paid_at, created_at, purpose)
VALUES (
  'ea111111-0000-0000-0000-000000000004'::uuid, 'b1111111-0000-0000-0000-000000000004'::uuid,
  'd1000001-0000-0000-0000-000000000007'::uuid, 'cash', 'cash', 'PAY-TODAY-04',
  75000, 'PAID', NOW() - INTERVAL '3 hours 40 minutes', NOW() - INTERVAL '3 hours 40 minutes', 'booking'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO checkin_logs (id, booking_id, staff_user_id, checkin_at, checkout_at, note)
VALUES (
  'ca111111-0000-0000-0000-000000000004'::uuid, 'b1111111-0000-0000-0000-000000000004'::uuid,
  'd3000001-0000-0000-0000-000000000001'::uuid, NOW() - INTERVAL '3 hours 35 minutes',
  NULL, 'Khách đặt trực tiếp tại quầy'
) ON CONFLICT (id) DO NOTHING;


-- ── CS-Q1: Booking 5 — COMPLETED sáng nay
INSERT INTO bookings (
  id, booking_code, user_id, workspace_id, branch_id, workspace_type_id,
  start_at, end_at, unit, unit_count, is_contract, status,
  price_per_unit, subtotal_amount, discount_amount, addon_amount, total_amount, source
) VALUES (
  'b1111111-0000-0000-0000-000000000005'::uuid, 'CS-BK-TODAY-05',
  'd1000001-0000-0000-0000-000000000004'::uuid, 'c1010004-0000-0000-0000-000000000004'::uuid,
  'b1000000-0000-0000-0000-000000000001'::uuid, 'desk',
  (CURRENT_DATE + TIME '06:30:00') AT TIME ZONE 'Asia/Ho_Chi_Minh',
  (CURRENT_DATE + TIME '08:30:00') AT TIME ZONE 'Asia/Ho_Chi_Minh',
  'hour', 2, false, 'COMPLETED',
  25000, 50000, 0, 0, 50000, 'web'
) ON CONFLICT (id) DO UPDATE SET status = 'COMPLETED', start_at = EXCLUDED.start_at, end_at = EXCLUDED.end_at;

INSERT INTO payments (id, booking_id, user_id, provider, method, order_id, amount, status, paid_at, created_at, purpose)
VALUES (
  'ea111111-0000-0000-0000-000000000005'::uuid, 'b1111111-0000-0000-0000-000000000005'::uuid,
  'd1000001-0000-0000-0000-000000000004'::uuid, 'payos', 'vietqr', 'PAY-TODAY-05',
  50000, 'PAID', (CURRENT_DATE + TIME '06:25:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE + TIME '06:20:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'booking'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO checkin_logs (id, booking_id, staff_user_id, checkin_at, checkout_at, note)
VALUES (
  'ca111111-0000-0000-0000-000000000005'::uuid, 'b1111111-0000-0000-0000-000000000005'::uuid,
  'd3000001-0000-0000-0000-000000000001'::uuid, (CURRENT_DATE + TIME '06:32:00') AT TIME ZONE 'Asia/Ho_Chi_Minh',
  (CURRENT_DATE + TIME '08:30:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'Check out hoàn tất'
) ON CONFLICT (id) DO NOTHING;


-- ── CS-Q3: Booking 6 — CHECKED_IN
INSERT INTO bookings (
  id, booking_code, user_id, workspace_id, branch_id, workspace_type_id,
  start_at, end_at, unit, unit_count, is_contract, status,
  price_per_unit, subtotal_amount, discount_amount, addon_amount, total_amount, source
) VALUES (
  'b1111111-0000-0000-0000-000000000006'::uuid, 'CS-BK-TODAY-06',
  'd1000001-0000-0000-0000-000000000005'::uuid, 'c2010001-0000-0000-0000-000000000001'::uuid,
  'b2000000-0000-0000-0000-000000000002'::uuid, 'desk',
  (CURRENT_DATE + TIME '08:30:00') AT TIME ZONE 'Asia/Ho_Chi_Minh',
  (CURRENT_DATE + TIME '17:30:00') AT TIME ZONE 'Asia/Ho_Chi_Minh',
  'day', 1, false, 'CHECKED_IN',
  180000, 180000, 0, 0, 180000, 'web'
) ON CONFLICT (id) DO UPDATE SET status = 'CHECKED_IN', start_at = EXCLUDED.start_at, end_at = EXCLUDED.end_at;

INSERT INTO payments (id, booking_id, user_id, provider, method, order_id, amount, status, paid_at, created_at, purpose)
VALUES (
  'ea111111-0000-0000-0000-000000000006'::uuid, 'b1111111-0000-0000-0000-000000000006'::uuid,
  'd1000001-0000-0000-0000-000000000005'::uuid, 'payos', 'vietqr', 'PAY-TODAY-06',
  180000, 'PAID', (CURRENT_DATE + TIME '08:15:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE + TIME '08:10:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'booking'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO checkin_logs (id, booking_id, staff_user_id, checkin_at, checkout_at, note)
VALUES (
  'ca111111-0000-0000-0000-000000000006'::uuid, 'b1111111-0000-0000-0000-000000000006'::uuid,
  'd3000001-0000-0000-0000-000000000002'::uuid, (CURRENT_DATE + TIME '08:32:00') AT TIME ZONE 'Asia/Ho_Chi_Minh',
  NULL, 'Checkin Pod làm việc sáng tạo Q3'
) ON CONFLICT (id) DO NOTHING;


-- ── CS-Q3: Booking 7 — CONFIRMED chiều nay
INSERT INTO bookings (
  id, booking_code, user_id, workspace_id, branch_id, workspace_type_id,
  start_at, end_at, unit, unit_count, is_contract, status,
  price_per_unit, subtotal_amount, discount_amount, addon_amount, total_amount, source
) VALUES (
  'b1111111-0000-0000-0000-000000000007'::uuid, 'CS-BK-TODAY-07',
  'd1000001-0000-0000-0000-000000000008'::uuid, 'c2010003-0000-0000-0000-000000000003'::uuid,
  'b2000000-0000-0000-0000-000000000002'::uuid, 'meeting_room',
  (CURRENT_DATE + TIME '14:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh',
  (CURRENT_DATE + TIME '17:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh',
  'hour', 3, false, 'CONFIRMED',
  120000, 360000, 0, 0, 360000, 'web'
) ON CONFLICT (id) DO UPDATE SET status = 'CONFIRMED', start_at = EXCLUDED.start_at, end_at = EXCLUDED.end_at;

INSERT INTO payments (id, booking_id, user_id, provider, method, order_id, amount, status, paid_at, created_at, purpose)
VALUES (
  'ea111111-0000-0000-0000-000000000007'::uuid, 'b1111111-0000-0000-0000-000000000007'::uuid,
  'd1000001-0000-0000-0000-000000000008'::uuid, 'payos', 'vietqr', 'PAY-TODAY-07',
  360000, 'PAID', (CURRENT_DATE + TIME '09:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE + TIME '08:50:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'booking'
) ON CONFLICT (id) DO NOTHING;


-- ── CS-CG: Booking 8 — CHECKED_IN
INSERT INTO bookings (
  id, booking_code, user_id, workspace_id, branch_id, workspace_type_id,
  start_at, end_at, unit, unit_count, is_contract, status,
  price_per_unit, subtotal_amount, discount_amount, addon_amount, total_amount, source
) VALUES (
  'b1111111-0000-0000-0000-000000000008'::uuid, 'CS-BK-TODAY-08',
  'd1000001-0000-0000-0000-000000000006'::uuid, 'c3010001-0000-0000-0000-000000000001'::uuid,
  'b3000000-0000-0000-0000-000000000003'::uuid, 'desk',
  (CURRENT_DATE + TIME '08:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh',
  (CURRENT_DATE + TIME '17:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh',
  'day', 1, false, 'CHECKED_IN',
  220000, 220000, 0, 0, 220000, 'web'
) ON CONFLICT (id) DO UPDATE SET status = 'CHECKED_IN', start_at = EXCLUDED.start_at, end_at = EXCLUDED.end_at;

INSERT INTO payments (id, booking_id, user_id, provider, method, order_id, amount, status, paid_at, created_at, purpose)
VALUES (
  'ea111111-0000-0000-0000-000000000008'::uuid, 'b1111111-0000-0000-0000-000000000008'::uuid,
  'd1000001-0000-0000-0000-000000000006'::uuid, 'payos', 'vietqr', 'PAY-TODAY-08',
  220000, 'PAID', (CURRENT_DATE + TIME '07:45:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE + TIME '07:40:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'booking'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO checkin_logs (id, booking_id, staff_user_id, checkin_at, checkout_at, note)
VALUES (
  'ca111111-0000-0000-0000-000000000008'::uuid, 'b1111111-0000-0000-0000-000000000008'::uuid,
  'd3000001-0000-0000-0000-000000000003'::uuid, (CURRENT_DATE + TIME '08:02:00') AT TIME ZONE 'Asia/Ho_Chi_Minh',
  NULL, 'Checkin Tech Hub Cầu Giấy'
) ON CONFLICT (id) DO NOTHING;


-- ── CS-CG: Booking 9 — CONFIRMED
INSERT INTO bookings (
  id, booking_code, user_id, workspace_id, branch_id, workspace_type_id,
  start_at, end_at, unit, unit_count, is_contract, status,
  price_per_unit, subtotal_amount, discount_amount, addon_amount, total_amount, source
) VALUES (
  'b1111111-0000-0000-0000-000000000009'::uuid, 'CS-BK-TODAY-09',
  'd1000001-0000-0000-0000-000000000009'::uuid, 'c3010003-0000-0000-0000-000000000003'::uuid,
  'b3000000-0000-0000-0000-000000000003'::uuid, 'meeting_room',
  (CURRENT_DATE + TIME '15:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh',
  (CURRENT_DATE + TIME '19:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh',
  'hour', 4, false, 'CONFIRMED',
  180000, 720000, 0, 0, 720000, 'web'
) ON CONFLICT (id) DO UPDATE SET status = 'CONFIRMED', start_at = EXCLUDED.start_at, end_at = EXCLUDED.end_at;

INSERT INTO payments (id, booking_id, user_id, provider, method, order_id, amount, status, paid_at, created_at, purpose)
VALUES (
  'ea111111-0000-0000-0000-000000000009'::uuid, 'b1111111-0000-0000-0000-000000000009'::uuid,
  'd1000001-0000-0000-0000-000000000009'::uuid, 'payos', 'vietqr', 'PAY-TODAY-09',
  720000, 'PAID', (CURRENT_DATE + TIME '10:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE + TIME '09:50:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'booking'
) ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ACTIVE MAINTENANCE DEMO (CS-Q1 Floor 2, MR-201)
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE workspaces 
SET status = 'maintenance' 
WHERE id = 'c1020001-0000-0000-0000-000000000001'::uuid;

INSERT INTO workspace_maintenance (
  id, workspace_id, start_at, end_at, reason, status, created_by, created_at
) VALUES (
  'ba111111-0000-0000-0000-000000000001'::uuid,
  'c1020001-0000-0000-0000-000000000001'::uuid,
  NOW() - INTERVAL '2 hours',
  NOW() + INTERVAL '2 days',
  'Bảo dưỡng định kỳ hệ thống điều hòa không khí VRV',
  'active',
  'd2000001-0000-0000-0000-000000000001'::uuid,
  NOW() - INTERVAL '2 hours'
) ON CONFLICT (id) DO UPDATE SET status = 'active', start_at = EXCLUDED.start_at, end_at = EXCLUDED.end_at;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. SPRINT 6: PARTNER CONNECTIONS (Mạng lưới kết nối thành viên)
-- ─────────────────────────────────────────────────────────────────────────────
-- An <-> Bình: Accepted
INSERT INTO partner_connections (id, requester_id, addressee_id, status, message, responded_at, created_at)
VALUES (
  'cc111111-0000-0000-0000-000000000001'::uuid,
  'd1000001-0000-0000-0000-000000000001'::uuid, 'd1000001-0000-0000-0000-000000000002'::uuid,
  'accepted', 'Chào Bình, mình rất vui được kết nối cùng bạn tại CoSpace Q1!',
  NOW() - INTERVAL '1 day', NOW() - INTERVAL '2 days'
) ON CONFLICT (id) DO UPDATE SET status = 'accepted';

-- Cường -> An: Pending incoming invitation for An!
INSERT INTO partner_connections (id, requester_id, addressee_id, status, message, created_at)
VALUES (
  'cc111111-0000-0000-0000-000000000002'::uuid,
  'd1000001-0000-0000-0000-000000000003'::uuid, 'd1000001-0000-0000-0000-000000000001'::uuid,
  'pending', 'Chào An, mình là Digital Marketer đang tìm dev full-stack hợp tác dự án EdTech. Rất mong được kết nối!',
  NOW() - INTERVAL '3 hours'
) ON CONFLICT (id) DO UPDATE SET status = 'pending';

-- An -> Dung: Pending sent invitation from An
INSERT INTO partner_connections (id, requester_id, addressee_id, status, message, created_at)
VALUES (
  'cc111111-0000-0000-0000-000000000003'::uuid,
  'd1000001-0000-0000-0000-000000000001'::uuid, 'd1000001-0000-0000-0000-000000000004'::uuid,
  'pending', 'Chào Dung, mình quan tâm đến các giải pháp khởi nghiệp của EduSpark.',
  NOW() - INTERVAL '5 hours'
) ON CONFLICT (id) DO UPDATE SET status = 'pending';

-- An <-> Giang: Accepted
INSERT INTO partner_connections (id, requester_id, addressee_id, status, message, responded_at, created_at)
VALUES (
  'cc111111-0000-0000-0000-000000000004'::uuid,
  'd1000001-0000-0000-0000-000000000001'::uuid, 'd1000001-0000-0000-0000-000000000007'::uuid,
  'accepted', 'Chào Giang, anh em backend giao lưu trao đổi về Go, Rust và kiến trúc Microservices nhé!',
  NOW() - INTERVAL '3 days', NOW() - INTERVAL '4 days'
) ON CONFLICT (id) DO UPDATE SET status = 'accepted';


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. SPRINT 6: VOUCHERS & PROMOTIONS (Voucher cá nhân & Giảm giá công khai)
-- ─────────────────────────────────────────────────────────────────────────────
-- Personal refund voucher owned by An (HT849201)
INSERT INTO promotions (
  id, code, name, description, discount_type, discount_value, min_order_amount,
  start_at, end_at, usage_limit, per_user_limit, is_public, is_active, owner_user_id
) VALUES (
  'da111111-0000-0000-0000-000000000001'::uuid,
  'HT849201', 'Voucher hoàn tiền đơn hủy CS-BK-2609-0015',
  'Mã voucher hoàn tiền bồi hoàn 120,000₫ cho khách hàng Nguyễn Văn An',
  'fixed', 120000, 100000,
  NOW() - INTERVAL '1 day', NOW() + INTERVAL '90 days',
  1, 1, false, true,
  'd1000001-0000-0000-0000-000000000001'::uuid
) ON CONFLICT (code) DO UPDATE SET is_active = true, end_at = EXCLUDED.end_at, owner_user_id = EXCLUDED.owner_user_id;

-- Personal voucher owned by Bình (HT392104)
INSERT INTO promotions (
  id, code, name, description, discount_type, discount_value, min_order_amount,
  start_at, end_at, usage_limit, per_user_limit, is_public, is_active, owner_user_id
) VALUES (
  'da111111-0000-0000-0000-000000000002'::uuid,
  'HT392104', 'Voucher tri ân thành viên thân thiết',
  'Voucher giảm 200,000₫ cho các đơn phòng họp hoặc văn phòng riêng',
  'fixed', 200000, 150000,
  NOW() - INTERVAL '2 days', NOW() + INTERVAL '90 days',
  1, 1, false, true,
  'd1000001-0000-0000-0000-000000000002'::uuid
) ON CONFLICT (code) DO UPDATE SET is_active = true, end_at = EXCLUDED.end_at, owner_user_id = EXCLUDED.owner_user_id;

-- Public vouchers
INSERT INTO promotions (
  id, code, name, description, discount_type, discount_value, max_discount_amount, min_order_amount,
  start_at, end_at, usage_limit, is_public, is_active
) VALUES 
  ('da111111-0000-0000-0000-000000000003'::uuid, 'COSPACEVIP', 'Ưu đãi Thành viên VIP (Giảm 15%)', 'Giảm 15% tối đa 500,000₫ cho thành viên VIP', 'percent', 15, 500000, 200000, '2026-01-01'::timestamptz, '2026-12-31'::timestamptz, 100, true, true),
  ('da111111-0000-0000-0000-000000000004'::uuid, 'DATN126', 'Ưu đãi Khởi nghiệp CoSpace (Giảm 10%)', 'Giảm 10% tối đa 300,000₫ cho sinh viên và startup', 'percent', 10, 300000, 100000, '2026-01-01'::timestamptz, '2026-12-31'::timestamptz, 200, true, true)
ON CONFLICT (code) DO UPDATE SET is_active = true;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. SPRINT 6: REFUNDS QUEUE (Đơn yêu cầu hoàn tiền chờ duyệt cho Admin/BA)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO bookings (
  id, booking_code, user_id, workspace_id, branch_id, workspace_type_id,
  start_at, end_at, unit, unit_count, is_contract, status,
  price_per_unit, subtotal_amount, discount_amount, addon_amount, total_amount, source
) VALUES (
  'b1111111-0000-0000-0000-000000000010'::uuid, 'CS-BK-CANCEL-01',
  'd1000001-0000-0000-0000-000000000004'::uuid, 'c1010005-0000-0000-0000-000000000005'::uuid,
  'b1000000-0000-0000-0000-000000000001'::uuid, 'desk',
  NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days 4 hours',
  'hour', 4, false, 'CANCELLED',
  25000, 100000, 0, 0, 100000, 'web'
) ON CONFLICT (id) DO UPDATE SET status = 'CANCELLED';

INSERT INTO payments (id, booking_id, user_id, provider, method, order_id, amount, status, paid_at, created_at, purpose)
VALUES (
  'ea111111-0000-0000-0000-000000000010'::uuid, 'b1111111-0000-0000-0000-000000000010'::uuid,
  'd1000001-0000-0000-0000-000000000004'::uuid, 'payos', 'vietqr', 'PAY-CANCEL-01',
  100000, 'PAID', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day 10 minutes', 'booking'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO booking_cancellations (
  id, booking_id, user_id, reason, refund_percent, refund_amount, penalty_amount, refund_status, applied_rule_json, created_at
) VALUES (
  'bc111111-0000-0000-0000-000000000001'::uuid,
  'b1111111-0000-0000-0000-000000000010'::uuid,
  'd1000001-0000-0000-0000-000000000004'::uuid,
  'Thay đổi lịch công tác đột xuất',
  70, 70000, 30000, 'pending',
  '{"rule_type":"BEFORE_START_DAYS","refund_percent":70,"policy_name":"Hủy trước 3 - 7 ngày (Hoàn 70%)"}'::jsonb,
  NOW() - INTERVAL '6 hours'
) ON CONFLICT (booking_id) DO UPDATE SET refund_status = 'pending', refund_amount = 70000;

INSERT INTO refunds (
  id, booking_id, payment_id, user_id, branch_id, amount, reason_type, reason, status, created_at
) VALUES (
  'fa111111-0000-0000-0000-000000000001'::uuid,
  'b1111111-0000-0000-0000-000000000010'::uuid,
  'ea111111-0000-0000-0000-000000000010'::uuid,
  'd1000001-0000-0000-0000-000000000004'::uuid,
  'b1000000-0000-0000-0000-000000000001'::uuid,
  70000, 'CANCELLATION', 'Khách hàng hủy chỗ trước 3 ngày, hoàn 70% theo chính sách',
  'pending', NOW() - INTERVAL '6 hours'
) ON CONFLICT (id) DO UPDATE SET status = 'pending', amount = 70000;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. WORKSPACE IMAGES (Hình ảnh không gian chân thực)
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM workspace_images WHERE url LIKE '%unsplash.com%';

INSERT INTO workspace_images (workspace_id, url, sort_order)
VALUES
  -- MR-101 (Phòng họp Lounge Q1)
  ('c1010006-0000-0000-0000-000000000006'::uuid, 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&q=80&w=1000', 1),
  ('c1010006-0000-0000-0000-000000000006'::uuid, 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1000', 2),
  -- MR-201 (Phòng họp Meeting-A)
  ('c1020001-0000-0000-0000-000000000001'::uuid, 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&q=80&w=1000', 1),
  -- MR-202 (Phòng họp Boardroom-B)
  ('c1020002-0000-0000-0000-000000000002'::uuid, 'https://images.unsplash.com/photo-1497215842964-222b430dc094?auto=format&fit=crop&q=80&w=1000', 1),
  -- PO-301 (Văn phòng riêng PO-301)
  ('c1030001-0000-0000-0000-000000000001'::uuid, 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&q=80&w=1000', 1),
  -- PO-302 (Văn phòng riêng PO-302)
  ('c1030002-0000-0000-0000-000000000002'::uuid, 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&q=80&w=1000', 1),
  -- PO-303 (Director Suite PO-303)
  ('c1030003-0000-0000-0000-000000000003'::uuid, 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80&w=1000', 1),
  -- EV-101 (Hội trường Event Room Cầu Giấy)
  ('c3010003-0000-0000-0000-000000000003'::uuid, 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&q=80&w=1000', 1);

COMMIT;
