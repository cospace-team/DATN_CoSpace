-- =============================================================================
-- CoSpace Seed Script: Enrich All Branches for Demo Days (02/10 & 05/10)
-- PURPOSE:
--   1. Ensure EVERY branch (Q1, Q3, Thủ Đức) has 6+ bookings on BOTH 02/10 and 05/10
--   2. Clean up dummy/junk records in workspace_maintenance
--   3. Add realistic maintenance tasks (active, scheduled, completed) for all branches
--   4. Add realistic refund requests (pending, approved, rejected) for Admin demo
--   5. Add user notifications for real-time bell icon
-- Target: PostgreSQL 13+ / Supabase PostgreSQL
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. CLEANUP JUNK MAINTENANCE & TEST DUMMIES
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM workspace_maintenance WHERE reason IN ('abc', 'a', 'abvc', 'dsad', 'sss', 'ád', 'sadd', 'ádas', 'dê thấy');

-- Add realistic maintenance tasks
INSERT INTO workspace_maintenance (id, workspace_id, start_at, end_at, reason, status, created_by) VALUES
  ('aa000001-0000-0000-0000-000000000001'::uuid, 'c1010005-0000-0000-0000-000000000005'::uuid, -- HD-105 (Q1)
   '2026-10-02 08:00:00+07'::timestamptz, '2026-10-02 12:00:00+07'::timestamptz,
   'Bảo dưỡng và vệ sinh ổ cắm điện âm bàn làm việc', 'in_progress', 'd2000001-0000-0000-0000-000000000001'::uuid),
  ('aa000001-0000-0000-0000-000000000002'::uuid, 'c2020002-0000-0000-0000-000000000002'::uuid, -- BS-202 (Q3)
   '2026-10-05 13:00:00+07'::timestamptz, '2026-10-05 17:00:00+07'::timestamptz,
   'Nâng cấp hệ thống bảng viết kính và đèn rọi hội nghị', 'scheduled', 'd2000001-0000-0000-0000-000000000002'::uuid),
  ('aa000001-0000-0000-0000-000000000003'::uuid, 'c3020002-0000-0000-0000-000000000002'::uuid, -- MR-202 (Thủ Đức)
   '2026-09-30 08:00:00+07'::timestamptz, '2026-09-30 11:30:00+07'::timestamptz,
   'Kiểm tra và thay bóng đèn máy chiếu 4K laser', 'completed', 'd2000001-0000-0000-0000-000000000003'::uuid)
ON CONFLICT (id) DO UPDATE SET reason = EXCLUDED.reason, status = EXCLUDED.status;


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. BỔ SUNG ĐƠN HÀNG NGÀY 02/10/2026 (MỖI CHI NHÁNH ĐỀU CÓ 6+ ĐƠN)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1.1 CHI NHÁNH 2: HỒ CON RÙA Q3 (Bổ sung 5 đơn -> Tổng 6 đơn) ──
INSERT INTO bookings (id, booking_code, user_id, workspace_id, branch_id, workspace_type_id, start_at, end_at, unit, unit_count, is_contract, status, price_per_unit, subtotal_amount, discount_amount, addon_amount, total_amount, source) VALUES
  -- Đơn chờ check-in tại Q3
  ('b0261002-0002-0000-0000-000000000001'::uuid, 'CS-BK-2610-0221', 'd1000001-0000-0000-0000-000000000006'::uuid, 'c2010002-0000-0000-0000-000000000002'::uuid, -- FL-102
   'b2000000-0000-0000-0000-000000000002'::uuid, 'desk', '2026-10-02 08:00:00+07'::timestamptz, '2026-10-02 17:00:00+07'::timestamptz,
   'day', 1, false, 'CONFIRMED', 180000, 180000, 0, 0, 180000, 'web'),
  
  -- Đơn đang họp CHECKED_IN tại Q3 kèm Running Tab (Cold Brew + Trà đào)
  ('b0261002-0002-0000-0000-000000000002'::uuid, 'CS-BK-2610-0222', 'd1000001-0000-0000-0000-000000000007'::uuid, 'c2010003-0000-0000-0000-000000000003'::uuid, -- MR-102 (12 chỗ)
   'b2000000-0000-0000-0000-000000000002'::uuid, 'meeting_room', '2026-10-02 09:00:00+07'::timestamptz, '2026-10-02 13:00:00+07'::timestamptz,
   'hour', 4, false, 'CHECKED_IN', 120000, 480000, 0, 85000, 565000, 'web'),

  -- Đơn Brainstorm Room 1 CONFIRMED chiều
  ('b0261002-0002-0000-0000-000000000003'::uuid, 'CS-BK-2610-0223', 'd1000001-0000-0000-0000-000000000008'::uuid, 'c2020001-0000-0000-0000-000000000001'::uuid, -- BS-201
   'b2000000-0000-0000-0000-000000000002'::uuid, 'meeting_room', '2026-10-02 14:00:00+07'::timestamptz, '2026-10-02 17:00:00+07'::timestamptz,
   'hour', 3, false, 'CONFIRMED', 120000, 360000, 0, 0, 360000, 'web'),

  -- Đơn Brainstorm Room 2 COMPLETED sáng sớm
  ('b0261002-0002-0000-0000-000000000004'::uuid, 'CS-BK-2610-0224', 'd1000001-0000-0000-0000-000000000009'::uuid, 'c2020002-0000-0000-0000-000000000002'::uuid, -- BS-202
   'b2000000-0000-0000-0000-000000000002'::uuid, 'meeting_room', '2026-10-02 07:00:00+07'::timestamptz, '2026-10-02 09:00:00+07'::timestamptz,
   'hour', 2, false, 'COMPLETED', 120000, 240000, 0, 0, 240000, 'web'),

  -- Đơn Enterprise Suite ES-301 hợp đồng tháng CHECKED_IN
  ('b0261002-0002-0000-0000-000000000005'::uuid, 'CS-BK-2610-0225', 'd1000001-0000-0000-0000-000000000010'::uuid, 'c2030001-0000-0000-0000-000000000001'::uuid, -- ES-301
   'b2000000-0000-0000-0000-000000000002'::uuid, 'private_office', '2026-10-01 08:00:00+07'::timestamptz, '2026-11-01 18:00:00+07'::timestamptz,
   'month', 1, true, 'CHECKED_IN', 19500000, 19500000, 0, 0, 19500000, 'web')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

-- Payments cho Q3 02/10
INSERT INTO payments (id, booking_id, user_id, provider, method, order_id, amount, status, paid_at, created_at, purpose) VALUES
  ('ea026102-0002-0000-0000-000000000001'::uuid, 'b0261002-0002-0000-0000-000000000001'::uuid, 'd1000001-0000-0000-0000-000000000006'::uuid, 'payos', 'vietqr', 'PAY-Q3-261002-1', 180000, 'PAID', '2026-10-02 07:30:00+07'::timestamptz, '2026-10-02 07:20:00+07'::timestamptz, 'booking'),
  ('ea026102-0002-0000-0000-000000000002'::uuid, 'b0261002-0002-0000-0000-000000000002'::uuid, 'd1000001-0000-0000-0000-000000000007'::uuid, 'payos', 'vietqr', 'PAY-Q3-261002-2', 480000, 'PAID', '2026-10-02 08:30:00+07'::timestamptz, '2026-10-02 08:25:00+07'::timestamptz, 'booking'),
  ('ea026102-0002-0000-0000-000000000003'::uuid, 'b0261002-0002-0000-0000-000000000003'::uuid, 'd1000001-0000-0000-0000-000000000008'::uuid, 'payos', 'vietqr', 'PAY-Q3-261002-3', 360000, 'PAID', '2026-10-02 10:00:00+07'::timestamptz, '2026-10-02 09:50:00+07'::timestamptz, 'booking'),
  ('ea026102-0002-0000-0000-000000000004'::uuid, 'b0261002-0002-0000-0000-000000000004'::uuid, 'd1000001-0000-0000-0000-000000000009'::uuid, 'payos', 'vietqr', 'PAY-Q3-261002-4', 240000, 'PAID', '2026-10-01 21:00:00+07'::timestamptz, '2026-10-01 20:50:00+07'::timestamptz, 'booking'),
  ('ea026102-0002-0000-0000-000000000005'::uuid, 'b0261002-0002-0000-0000-000000000005'::uuid, 'd1000001-0000-0000-0000-000000000010'::uuid, 'payos', 'vietqr', 'PAY-Q3-261002-5', 19500000, 'PAID', '2026-09-29 10:00:00+07'::timestamptz, '2026-09-29 09:45:00+07'::timestamptz, 'booking')
ON CONFLICT (id) DO NOTHING;

-- Checkin logs cho đơn Q3
INSERT INTO checkin_logs (id, booking_id, staff_user_id, checkin_at, checkout_at, note) VALUES
  ('ca026102-0002-0000-0000-000000000002'::uuid, 'b0261002-0002-0000-0000-000000000002'::uuid, 'd3000001-0000-0000-0000-000000000002'::uuid, '2026-10-02 09:05:00+07'::timestamptz, NULL, 'Khách họp nhóm Media tại Q3'),
  ('ca026102-0002-0000-0000-000000000004'::uuid, 'b0261002-0002-0000-0000-000000000004'::uuid, 'd3000001-0000-0000-0000-000000000002'::uuid, '2026-10-02 07:05:00+07'::timestamptz, '2026-10-02 09:00:00+07'::timestamptz, 'Check out hoàn tất'),
  ('ca026102-0002-0000-0000-000000000005'::uuid, 'b0261002-0002-0000-0000-000000000005'::uuid, 'd3000001-0000-0000-0000-000000000002'::uuid, '2026-10-01 08:30:00+07'::timestamptz, NULL, 'Doanh nghiệp IT vào văn phòng')
ON CONFLICT (id) DO NOTHING;

-- Running tab cho Q3 đơn 2
DELETE FROM booking_services WHERE booking_id = 'b0261002-0002-0000-0000-000000000002'::uuid;
INSERT INTO booking_services (id, booking_id, service_id, quantity, unit_price, subtotal, status, line_type, description, created_at) VALUES
  ('ba026102-0002-0000-0000-000000000001'::uuid, 'b0261002-0002-0000-0000-000000000002'::uuid, 'e0000001-0000-0000-0000-000000000002'::uuid, 1, 40000, 40000, 'unpaid', 'service', 'Trà Đào Cam Sả Tươi', '2026-10-02 09:40:00+07'::timestamptz),
  ('ba026102-0002-0000-0000-000000000002'::uuid, 'b0261002-0002-0000-0000-000000000002'::uuid, 'e0000001-0000-0000-0000-000000000003'::uuid, 1, 45000, 45000, 'unpaid', 'service', 'Nước Ép Trái Cây Tươi (Dưa hấu)', '2026-10-02 10:10:00+07'::timestamptz);


-- ── 1.2 CHI NHÁNH 3: ĐHQG THỦ ĐỨC (Thêm 6 đơn -> Tổng 6 đơn ngày 02/10) ──
INSERT INTO bookings (id, booking_code, user_id, workspace_id, branch_id, workspace_type_id, start_at, end_at, unit, unit_count, is_contract, status, price_per_unit, subtotal_amount, discount_amount, addon_amount, total_amount, source) VALUES
  -- Đơn 1: Bàn TA-101 CONFIRMED chờ check-in cho Staff Thủ Đức
  ('b0261002-0003-0000-0000-000000000001'::uuid, 'CS-BK-2610-0231', 'd1000001-0000-0000-0000-000000000001'::uuid, 'c3010001-0000-0000-0000-000000000001'::uuid,
   'b3000000-0000-0000-0000-000000000003'::uuid, 'desk', '2026-10-02 08:00:00+07'::timestamptz, '2026-10-02 17:00:00+07'::timestamptz,
   'day', 1, false, 'CONFIRMED', 140000, 140000, 0, 0, 140000, 'web'),

  -- Đơn 2: Bàn TB-102 CHECKED_IN có Running Tab (Mì trộn + Bò Húc)
  ('b0261002-0003-0000-0000-000000000002'::uuid, 'CS-BK-2610-0232', 'd1000001-0000-0000-0000-000000000002'::uuid, 'c3010002-0000-0000-0000-000000000002'::uuid,
   'b3000000-0000-0000-0000-000000000003'::uuid, 'desk', '2026-10-02 08:30:00+07'::timestamptz, '2026-10-02 18:30:00+07'::timestamptz,
   'day', 1, false, 'CHECKED_IN', 140000, 140000, 0, 35000, 175000, 'web'),

  -- Đơn 3: Boardroom VIP BR-201 CHECKED_IN
  ('b0261002-0003-0000-0000-000000000003'::uuid, 'CS-BK-2610-0233', 'd1000001-0000-0000-0000-000000000003'::uuid, 'c3020001-0000-0000-0000-000000000001'::uuid,
   'b3000000-0000-0000-0000-000000000003'::uuid, 'meeting_room', '2026-10-02 09:00:00+07'::timestamptz, '2026-10-02 12:00:00+07'::timestamptz,
   'hour', 3, false, 'CHECKED_IN', 100000, 300000, 0, 0, 300000, 'web'),

  -- Đơn 4: Phòng họp Team MR-202 CONFIRMED buổi chiều
  ('b0261002-0003-0000-0000-000000000004'::uuid, 'CS-BK-2610-0234', 'd1000001-0000-0000-0000-000000000004'::uuid, 'c3020002-0000-0000-0000-000000000002'::uuid,
   'b3000000-0000-0000-0000-000000000003'::uuid, 'meeting_room', '2026-10-02 13:30:00+07'::timestamptz, '2026-10-02 16:30:00+07'::timestamptz,
   'hour', 3, false, 'CONFIRMED', 100000, 300000, 0, 0, 300000, 'web'),

  -- Đơn 5: Hội trường Event Room EV-101 CONFIRMED tối
  ('b0261002-0003-0000-0000-000000000005'::uuid, 'CS-BK-2610-0235', 'd1000001-0000-0000-0000-000000000005'::uuid, 'c3010003-0000-0000-0000-000000000003'::uuid,
   'b3000000-0000-0000-0000-000000000003'::uuid, 'meeting_room', '2026-10-02 18:00:00+07'::timestamptz, '2026-10-02 21:00:00+07'::timestamptz,
   'hour', 3, false, 'CONFIRMED', 250000, 750000, 0, 0, 750000, 'web'),

  -- Đơn 6: Penthouse Suite West PW-302 CHECKED_IN hợp đồng tháng
  ('b0261002-0003-0000-0000-000000000006'::uuid, 'CS-BK-2610-0236', 'd1000001-0000-0000-0000-000000000006'::uuid, 'c3030002-0000-0000-0000-000000000003'::uuid,
   'b3000000-0000-0000-0000-000000000003'::uuid, 'private_office', '2026-10-01 08:00:00+07'::timestamptz, '2026-11-01 18:00:00+07'::timestamptz,
   'month', 1, true, 'CHECKED_IN', 16000000, 16000000, 0, 0, 16000000, 'web')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

-- Payments cho Thủ Đức 02/10
INSERT INTO payments (id, booking_id, user_id, provider, method, order_id, amount, status, paid_at, created_at, purpose) VALUES
  ('ea026102-0003-0000-0000-000000000001'::uuid, 'b0261002-0003-0000-0000-000000000001'::uuid, 'd1000001-0000-0000-0000-000000000001'::uuid, 'payos', 'vietqr', 'PAY-TD-261002-1', 140000, 'PAID', '2026-10-02 07:15:00+07'::timestamptz, '2026-10-02 07:10:00+07'::timestamptz, 'booking'),
  ('ea026102-0003-0000-0000-000000000002'::uuid, 'b0261002-0003-0000-0000-000000000002'::uuid, 'd1000001-0000-0000-0000-000000000002'::uuid, 'payos', 'vietqr', 'PAY-TD-261002-2', 140000, 'PAID', '2026-10-02 08:15:00+07'::timestamptz, '2026-10-02 08:10:00+07'::timestamptz, 'booking'),
  ('ea026102-0003-0000-0000-000000000003'::uuid, 'b0261002-0003-0000-0000-000000000003'::uuid, 'd1000001-0000-0000-0000-000000000003'::uuid, 'payos', 'vietqr', 'PAY-TD-261002-3', 300000, 'PAID', '2026-10-02 08:45:00+07'::timestamptz, '2026-10-02 08:40:00+07'::timestamptz, 'booking'),
  ('ea026102-0003-0000-0000-000000000004'::uuid, 'b0261002-0003-0000-0000-000000000004'::uuid, 'd1000001-0000-0000-0000-000000000004'::uuid, 'payos', 'vietqr', 'PAY-TD-261002-4', 300000, 'PAID', '2026-10-02 11:00:00+07'::timestamptz, '2026-10-02 10:50:00+07'::timestamptz, 'booking'),
  ('ea026102-0003-0000-0000-000000000005'::uuid, 'b0261002-0003-0000-0000-000000000005'::uuid, 'd1000001-0000-0000-0000-000000000005'::uuid, 'payos', 'vietqr', 'PAY-TD-261002-5', 750000, 'PAID', '2026-10-01 16:00:00+07'::timestamptz, '2026-10-01 15:45:00+07'::timestamptz, 'booking'),
  ('ea026102-0003-0000-0000-000000000006'::uuid, 'b0261002-0003-0000-0000-000000000006'::uuid, 'd1000001-0000-0000-0000-000000000006'::uuid, 'payos', 'vietqr', 'PAY-TD-261002-6', 16000000, 'PAID', '2026-09-28 14:00:00+07'::timestamptz, '2026-09-28 13:40:00+07'::timestamptz, 'booking')
ON CONFLICT (id) DO NOTHING;

-- Checkin logs cho Thủ Đức 02/10
INSERT INTO checkin_logs (id, booking_id, staff_user_id, checkin_at, checkout_at, note) VALUES
  ('ca026102-0003-0000-0000-000000000002'::uuid, 'b0261002-0003-0000-0000-000000000002'::uuid, 'd3000001-0000-0000-0000-000000000003'::uuid, '2026-10-02 08:35:00+07'::timestamptz, NULL, 'Sinh viên IT check-in học nhóm'),
  ('ca026102-0003-0000-0000-000000000003'::uuid, 'b0261002-0003-0000-0000-000000000003'::uuid, 'd3000001-0000-0000-0000-000000000003'::uuid, '2026-10-02 09:05:00+07'::timestamptz, NULL, 'Nhóm R&D họp phòng VIP'),
  ('ca026102-0003-0000-0000-000000000006'::uuid, 'b0261002-0003-0000-0000-000000000006'::uuid, 'd3000001-0000-0000-0000-000000000003'::uuid, '2026-10-01 08:00:00+07'::timestamptz, NULL, 'Startup AI vào văn phòng')
ON CONFLICT (id) DO NOTHING;

-- Running tab cho Thủ Đức đơn 2
DELETE FROM booking_services WHERE booking_id = 'b0261002-0003-0000-0000-000000000002'::uuid;
INSERT INTO booking_services (id, booking_id, service_id, quantity, unit_price, subtotal, status, line_type, description, created_at) VALUES
  ('ba026102-0003-0000-0000-000000000001'::uuid, 'b0261002-0003-0000-0000-000000000002'::uuid, 'e0000001-0000-0000-0000-000000000042'::uuid, 1, 35000, 35000, 'unpaid', 'service', 'Combo Thức Khuya Cày Deadline (Mì + Bò Húc)', '2026-10-02 10:00:00+07'::timestamptz);


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. BỔ SUNG ĐƠN HÀNG NGÀY 05/10/2026 (MỖI CHI NHÁNH ĐỀU CÓ 6+ ĐƠN)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 2.1 CHI NHÁNH 1: NGUYỄN HUỆ Q1 (Thêm 3 đơn -> Tổng 6 đơn ngày 05/10) ──
INSERT INTO bookings (id, booking_code, user_id, workspace_id, branch_id, workspace_type_id, start_at, end_at, unit, unit_count, is_contract, status, price_per_unit, subtotal_amount, discount_amount, addon_amount, total_amount, source) VALUES
  ('b0261005-0001-0000-0000-000000000001'::uuid, 'CS-BK-2610-0511', 'd1000001-0000-0000-0000-000000000007'::uuid, 'c1010001-0000-0000-0000-000000000001'::uuid, -- HD-101
   'b1000000-0000-0000-0000-000000000001'::uuid, 'desk', '2026-10-05 08:00:00+07'::timestamptz, '2026-10-05 17:00:00+07'::timestamptz,
   'day', 1, false, 'CONFIRMED', 200000, 200000, 0, 0, 200000, 'web'),

  ('b0261005-0001-0000-0000-000000000002'::uuid, 'CS-BK-2610-0512', 'd1000001-0000-0000-0000-000000000008'::uuid, 'c1010002-0000-0000-0000-000000000002'::uuid, -- HD-102
   'b1000000-0000-0000-0000-000000000001'::uuid, 'desk', '2026-10-05 08:30:00+07'::timestamptz, '2026-10-05 17:30:00+07'::timestamptz,
   'day', 1, false, 'CHECKED_IN', 200000, 200000, 0, 0, 200000, 'web'),

  ('b0261005-0001-0000-0000-000000000003'::uuid, 'CS-BK-2610-0513', 'd1000001-0000-0000-0000-000000000009'::uuid, 'c1010006-0000-0000-0000-000000000006'::uuid, -- MR-101
   'b1000000-0000-0000-0000-000000000001'::uuid, 'meeting_room', '2026-10-05 13:30:00+07'::timestamptz, '2026-10-05 16:30:00+07'::timestamptz,
   'hour', 3, false, 'CONFIRMED', 150000, 450000, 0, 0, 450000, 'web')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

INSERT INTO payments (id, booking_id, user_id, provider, method, order_id, amount, status, paid_at, created_at, purpose) VALUES
  ('ea026105-0001-0000-0000-000000000001'::uuid, 'b0261005-0001-0000-0000-000000000001'::uuid, 'd1000001-0000-0000-0000-000000000007'::uuid, 'payos', 'vietqr', 'PAY-Q1-261005-1', 200000, 'PAID', '2026-10-05 07:15:00+07'::timestamptz, '2026-10-05 07:10:00+07'::timestamptz, 'booking'),
  ('ea026105-0001-0000-0000-000000000002'::uuid, 'b0261005-0001-0000-0000-000000000002'::uuid, 'd1000001-0000-0000-0000-000000000008'::uuid, 'payos', 'vietqr', 'PAY-Q1-261005-2', 200000, 'PAID', '2026-10-05 08:15:00+07'::timestamptz, '2026-10-05 08:10:00+07'::timestamptz, 'booking'),
  ('ea026105-0001-0000-0000-000000000003'::uuid, 'b0261005-0001-0000-0000-000000000003'::uuid, 'd1000001-0000-0000-0000-000000000009'::uuid, 'payos', 'vietqr', 'PAY-Q1-261005-3', 450000, 'PAID', '2026-10-05 10:00:00+07'::timestamptz, '2026-10-05 09:50:00+07'::timestamptz, 'booking')
ON CONFLICT (id) DO NOTHING;

INSERT INTO checkin_logs (id, booking_id, staff_user_id, checkin_at, checkout_at, note) VALUES
  ('ca026105-0001-0000-0000-000000000002'::uuid, 'b0261005-0001-0000-0000-000000000002'::uuid, 'd3000001-0000-0000-0000-000000000001'::uuid, '2026-10-05 08:35:00+07'::timestamptz, NULL, 'Check-in bàn cá nhân HD-102')
ON CONFLICT (id) DO NOTHING;


-- ── 2.2 CHI NHÁNH 2: HỒ CON RÙA Q3 (Thêm 5 đơn -> Tổng 6 đơn ngày 05/10) ──
INSERT INTO bookings (id, booking_code, user_id, workspace_id, branch_id, workspace_type_id, start_at, end_at, unit, unit_count, is_contract, status, price_per_unit, subtotal_amount, discount_amount, addon_amount, total_amount, source) VALUES
  ('b0261005-0002-0000-0000-000000000001'::uuid, 'CS-BK-2610-0521', 'd1000001-0000-0000-0000-000000000001'::uuid, 'c2010001-0000-0000-0000-000000000001'::uuid, -- FL-101
   'b2000000-0000-0000-0000-000000000002'::uuid, 'desk', '2026-10-05 08:00:00+07'::timestamptz, '2026-10-05 17:00:00+07'::timestamptz,
   'day', 1, false, 'CONFIRMED', 180000, 180000, 0, 0, 180000, 'web'),

  ('b0261005-0002-0000-0000-000000000002'::uuid, 'CS-BK-2610-0522', 'd1000001-0000-0000-0000-000000000002'::uuid, 'c2010003-0000-0000-0000-000000000003'::uuid, -- MR-102
   'b2000000-0000-0000-0000-000000000002'::uuid, 'meeting_room', '2026-10-05 09:00:00+07'::timestamptz, '2026-10-05 12:00:00+07'::timestamptz,
   'hour', 3, false, 'CHECKED_IN', 120000, 360000, 0, 0, 360000, 'web'),

  ('b0261005-0002-0000-0000-000000000003'::uuid, 'CS-BK-2610-0523', 'd1000001-0000-0000-0000-000000000003'::uuid, 'c2020001-0000-0000-0000-000000000001'::uuid, -- BS-201
   'b2000000-0000-0000-0000-000000000002'::uuid, 'meeting_room', '2026-10-05 13:00:00+07'::timestamptz, '2026-10-05 17:00:00+07'::timestamptz,
   'hour', 4, false, 'CONFIRMED', 120000, 480000, 0, 0, 480000, 'web'),

  ('b0261005-0002-0000-0000-000000000004'::uuid, 'CS-BK-2610-0524', 'd1000001-0000-0000-0000-000000000004'::uuid, 'c2020002-0000-0000-0000-000000000002'::uuid, -- BS-202
   'b2000000-0000-0000-0000-000000000002'::uuid, 'meeting_room', '2026-10-05 07:30:00+07'::timestamptz, '2026-10-05 09:30:00+07'::timestamptz,
   'hour', 2, false, 'COMPLETED', 120000, 240000, 0, 0, 240000, 'web'),

  ('b0261005-0002-0000-0000-000000000005'::uuid, 'CS-BK-2610-0525', 'd1000001-0000-0000-0000-000000000005'::uuid, 'c2030002-0000-0000-0000-000000000002'::uuid, -- ES-302
   'b2000000-0000-0000-0000-000000000002'::uuid, 'private_office', '2026-10-01 08:00:00+07'::timestamptz, '2026-11-01 18:00:00+07'::timestamptz,
   'month', 1, true, 'CHECKED_IN', 19500000, 19500000, 0, 0, 19500000, 'web')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

INSERT INTO payments (id, booking_id, user_id, provider, method, order_id, amount, status, paid_at, created_at, purpose) VALUES
  ('ea026105-0002-0000-0000-000000000001'::uuid, 'b0261005-0002-0000-0000-000000000001'::uuid, 'd1000001-0000-0000-0000-000000000001'::uuid, 'payos', 'vietqr', 'PAY-Q3-261005-1', 180000, 'PAID', '2026-10-05 07:30:00+07'::timestamptz, '2026-10-05 07:20:00+07'::timestamptz, 'booking'),
  ('ea026105-0002-0000-0000-000000000002'::uuid, 'b0261005-0002-0000-0000-000000000002'::uuid, 'd1000001-0000-0000-0000-000000000002'::uuid, 'payos', 'vietqr', 'PAY-Q3-261005-2', 360000, 'PAID', '2026-10-05 08:30:00+07'::timestamptz, '2026-10-05 08:20:00+07'::timestamptz, 'booking'),
  ('ea026105-0002-0000-0000-000000000003'::uuid, 'b0261005-0002-0000-0000-000000000003'::uuid, 'd1000001-0000-0000-0000-000000000003'::uuid, 'payos', 'vietqr', 'PAY-Q3-261005-3', 480000, 'PAID', '2026-10-05 11:00:00+07'::timestamptz, '2026-10-05 10:50:00+07'::timestamptz, 'booking'),
  ('ea026105-0002-0000-0000-000000000004'::uuid, 'b0261005-0002-0000-0000-000000000004'::uuid, 'd1000001-0000-0000-0000-000000000004'::uuid, 'payos', 'vietqr', 'PAY-Q3-261005-4', 240000, 'PAID', '2026-10-04 20:00:00+07'::timestamptz, '2026-10-04 19:50:00+07'::timestamptz, 'booking'),
  ('ea026105-0002-0000-0000-000000000005'::uuid, 'b0261005-0002-0000-0000-000000000005'::uuid, 'd1000001-0000-0000-0000-000000000005'::uuid, 'payos', 'vietqr', 'PAY-Q3-261005-5', 19500000, 'PAID', '2026-09-28 15:00:00+07'::timestamptz, '2026-09-28 14:40:00+07'::timestamptz, 'booking')
ON CONFLICT (id) DO NOTHING;

INSERT INTO checkin_logs (id, booking_id, staff_user_id, checkin_at, checkout_at, note) VALUES
  ('ca026105-0002-0000-0000-000000000002'::uuid, 'b0261005-0002-0000-0000-000000000002'::uuid, 'd3000001-0000-0000-0000-000000000002'::uuid, '2026-10-05 09:02:00+07'::timestamptz, NULL, 'Check-in phòng họp sáng tạo Q3'),
  ('ca026105-0002-0000-0000-000000000004'::uuid, 'b0261005-0002-0000-0000-000000000004'::uuid, 'd3000001-0000-0000-0000-000000000002'::uuid, '2026-10-05 07:35:00+07'::timestamptz, '2026-10-05 09:30:00+07'::timestamptz, 'Họp sáng giao ban hoàn tất')
ON CONFLICT (id) DO NOTHING;


-- ── 2.3 CHI NHÁNH 3: ĐHQG THỦ ĐỨC (Thêm 5 đơn -> Tổng 6 đơn ngày 05/10) ──
INSERT INTO bookings (id, booking_code, user_id, workspace_id, branch_id, workspace_type_id, start_at, end_at, unit, unit_count, is_contract, status, price_per_unit, subtotal_amount, discount_amount, addon_amount, total_amount, source) VALUES
  ('b0261005-0003-0000-0000-000000000001'::uuid, 'CS-BK-2610-0531', 'd1000001-0000-0000-0000-000000000007'::uuid, 'c3010002-0000-0000-0000-000000000002'::uuid, -- TB-102
   'b3000000-0000-0000-0000-000000000003'::uuid, 'desk', '2026-10-05 08:00:00+07'::timestamptz, '2026-10-05 17:00:00+07'::timestamptz,
   'day', 1, false, 'CONFIRMED', 140000, 140000, 0, 0, 140000, 'web'),

  ('b0261005-0003-0000-0000-000000000002'::uuid, 'CS-BK-2610-0532', 'd1000001-0000-0000-0000-000000000008'::uuid, 'c3020001-0000-0000-0000-000000000001'::uuid, -- BR-201
   'b3000000-0000-0000-0000-000000000003'::uuid, 'meeting_room', '2026-10-05 10:00:00+07'::timestamptz, '2026-10-05 13:00:00+07'::timestamptz,
   'hour', 3, false, 'CHECKED_IN', 100000, 300000, 0, 0, 300000, 'web'),

  ('b0261005-0003-0000-0000-000000000003'::uuid, 'CS-BK-2610-0533', 'd1000001-0000-0000-0000-000000000009'::uuid, 'c3020002-0000-0000-0000-000000000002'::uuid, -- MR-202
   'b3000000-0000-0000-0000-000000000003'::uuid, 'meeting_room', '2026-10-05 14:00:00+07'::timestamptz, '2026-10-05 17:00:00+07'::timestamptz,
   'hour', 3, false, 'CONFIRMED', 100000, 300000, 0, 0, 300000, 'web'),

  ('b0261005-0003-0000-0000-000000000004'::uuid, 'CS-BK-2610-0534', 'd1000001-0000-0000-0000-000000000010'::uuid, 'c3020003-0000-0000-0000-000000000002'::uuid, -- SU-201 Scale-up Office
   'b3000000-0000-0000-0000-000000000003'::uuid, 'private_office', '2026-10-01 08:00:00+07'::timestamptz, '2026-11-01 18:00:00+07'::timestamptz,
   'month', 1, true, 'CHECKED_IN', 16000000, 16000000, 0, 0, 16000000, 'web'),

  ('b0261005-0003-0000-0000-000000000005'::uuid, 'CS-BK-2610-0535', 'd1000001-0000-0000-0000-000000000001'::uuid, 'c3010003-0000-0000-0000-000000000003'::uuid, -- EV-101 Hội trường
   'b3000000-0000-0000-0000-000000000003'::uuid, 'meeting_room', '2026-10-05 18:00:00+07'::timestamptz, '2026-10-05 21:00:00+07'::timestamptz,
   'hour', 3, false, 'CHECKED_IN', 250000, 750000, 0, 0, 750000, 'web')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

INSERT INTO payments (id, booking_id, user_id, provider, method, order_id, amount, status, paid_at, created_at, purpose) VALUES
  ('ea026105-0003-0000-0000-000000000001'::uuid, 'b0261005-0003-0000-0000-000000000001'::uuid, 'd1000001-0000-0000-0000-000000000007'::uuid, 'payos', 'vietqr', 'PAY-TD-261005-1', 140000, 'PAID', '2026-10-05 07:15:00+07'::timestamptz, '2026-10-05 07:10:00+07'::timestamptz, 'booking'),
  ('ea026105-0003-0000-0000-000000000002'::uuid, 'b0261005-0003-0000-0000-000000000002'::uuid, 'd1000001-0000-0000-0000-000000000008'::uuid, 'payos', 'vietqr', 'PAY-TD-261005-2', 300000, 'PAID', '2026-10-05 09:30:00+07'::timestamptz, '2026-10-05 09:20:00+07'::timestamptz, 'booking'),
  ('ea026105-0003-0000-0000-000000000003'::uuid, 'b0261005-0003-0000-0000-000000000003'::uuid, 'd1000001-0000-0000-0000-000000000009'::uuid, 'payos', 'vietqr', 'PAY-TD-261005-3', 300000, 'PAID', '2026-10-05 11:30:00+07'::timestamptz, '2026-10-05 11:20:00+07'::timestamptz, 'booking'),
  ('ea026105-0003-0000-0000-000000000004'::uuid, 'b0261005-0003-0000-0000-000000000004'::uuid, 'd1000001-0000-0000-0000-000000000010'::uuid, 'payos', 'vietqr', 'PAY-TD-261005-4', 16000000, 'PAID', '2026-09-28 11:00:00+07'::timestamptz, '2026-09-28 10:45:00+07'::timestamptz, 'booking'),
  ('ea026105-0003-0000-0000-000000000005'::uuid, 'b0261005-0003-0000-0000-000000000005'::uuid, 'd1000001-0000-0000-0000-000000000001'::uuid, 'payos', 'vietqr', 'PAY-TD-261005-5', 750000, 'PAID', '2026-10-05 17:30:00+07'::timestamptz, '2026-10-05 17:15:00+07'::timestamptz, 'booking')
ON CONFLICT (id) DO NOTHING;

INSERT INTO checkin_logs (id, booking_id, staff_user_id, checkin_at, checkout_at, note) VALUES
  ('ca026105-0003-0000-0000-000000000002'::uuid, 'b0261005-0003-0000-0000-000000000002'::uuid, 'd3000001-0000-0000-0000-000000000003'::uuid, '2026-10-05 10:05:00+07'::timestamptz, NULL, 'Check-in phòng Boardroom VIP Thủ Đức'),
  ('ca026105-0003-0000-0000-000000000005'::uuid, 'b0261005-0003-0000-0000-000000000005'::uuid, 'd3000001-0000-0000-0000-000000000003'::uuid, '2026-10-05 18:05:00+07'::timestamptz, NULL, 'Check-in hội trường Event Room EV-101')
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. BỔ SUNG YÊU CẦU HOÀN TIỀN (REFUNDS TABLE) CHO ADMIN DEMO
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO payments (id, booking_id, user_id, provider, method, order_id, amount, status, paid_at, created_at, purpose) VALUES
  ('ea111111-0000-0000-0000-000000000001'::uuid, 'b0010001-0000-0000-0000-000000000015'::uuid, 'd1000001-0000-0000-0000-000000000005'::uuid, 'payos', 'vietqr', 'PAY-REFUND-0015', 120000, 'PAID', '2026-09-30 10:00:00+07'::timestamptz, '2026-09-30 09:50:00+07'::timestamptz, 'booking')
ON CONFLICT (id) DO NOTHING;

INSERT INTO refunds (id, booking_id, payment_id, user_id, branch_id, amount, reason_type, reason, status, resolution_note, processed_by, processed_at, created_at, updated_at) VALUES
  ('fa000001-0000-0000-0000-000000000002'::uuid, 'b0261002-0000-0000-0000-000000000006'::uuid, 'ea261002-0000-0000-0000-000000000006'::uuid,
   'd1000001-0000-0000-0000-000000000009'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid,
   450000, 'CANCELLATION', 'Khách hủy phòng họp MR-202 trước 24h, hoàn 100% qua PayOS',
   'pending', NULL, NULL, NULL, '2026-10-01 18:35:00+07'::timestamptz, '2026-10-01 18:35:00+07'::timestamptz),

  ('fa000001-0000-0000-0000-000000000003'::uuid, 'b0010001-0000-0000-0000-000000000015'::uuid, 'ea111111-0000-0000-0000-000000000001'::uuid,
   'd1000001-0000-0000-0000-000000000005'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid,
   120000, 'CANCELLATION', 'Khách đổi lịch làm việc đột xuất, hoàn 100% theo chính sách linh hoạt',
   'processed', 'Đã chuyển khoản hoàn tiền qua PayOS VietQR', 'd4000001-0000-0000-0000-000000000001'::uuid, '2026-09-30 14:00:00+07'::timestamptz,
   '2026-09-30 11:00:00+07'::timestamptz, '2026-09-30 14:00:00+07'::timestamptz)
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. THÔNG BÁO CHO USER DEMO (NOTIFICATIONS)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO notifications (id, user_id, type, title, content, is_read, created_at) VALUES
  ('aa000002-0000-0000-0000-000000000001'::uuid, 'd1000001-0000-0000-0000-000000000001'::uuid,
   'BOOKING_CONFIRMED', 'Đặt chỗ thành công! [CS-BK-2610-0201]', 'Đơn đặt bàn Hotdesk HD-101 ngày 02/10/2026 tại Chi nhánh Nguyễn Huệ (Q1) đã được xác nhận. Vui lòng check-in khi đến.', false, '2026-10-02 07:15:00+07'::timestamptz),
  ('aa000002-0000-0000-0000-000000000002'::uuid, 'd1000001-0000-0000-0000-000000000002'::uuid,
   'RUNNING_TAB', 'Dịch vụ đã được ghi vào Running Tab [MR-101]', '2 ly Cà Phê Latte và 1 Bánh Mì Thịt Nguội đã được giao đến phòng họp của bạn. Tổng: 100.000đ (thanh toán lúc check-out).', false, '2026-10-02 09:30:00+07'::timestamptz),
  ('aa000002-0000-0000-0000-000000000003'::uuid, 'd1000001-0000-0000-0000-000000000003'::uuid,
   'TIME_EXPIRING', 'Sắp hết giờ đặt chỗ [HD-103]', 'Thời gian sử dụng bàn HD-103 của bạn sẽ kết thúc lúc 11:30. Bạn có thể bấm Gia Hạn Thời Gian nếu muốn tiếp tục làm việc.', false, '2026-10-02 11:10:00+07'::timestamptz)
ON CONFLICT (id) DO NOTHING;

COMMIT;
