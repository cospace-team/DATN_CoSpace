-- =============================================================================
-- CoSpace Seed Script: Master Demo Data for Thesis Defense (02/10 & 05/10 & Full 2026)
-- TARGET: PostgreSQL 13+ / Supabase PostgreSQL
-- PURPOSE:
--   1. Full price policies (global + 3 branch overrides) across all units (hour, day, week, month)
--   2. Rich extra services (F&B, tech, printing, equipment, amenities - active & inactive)
--   3. Active promotions & vouchers for checkout demo
--   4. Cancellation & refund policies
--   5. Focus Day 1 (2026-10-02): Waiting Check-in, Running Tab F&B, Extension, Late Checkout, Cancelled
--   6. Focus Day 2 (2026-10-05): Fresh complete operational scenario across all branches
--   7. Full Year 2026 (Jan - Dec): Continuous revenue analytics, monthly trends, healthy occupancy
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PRICE POLICIES (HOÀN THIỆN ĐẦY ĐỦ GLOBAL & TỪNG CHI NHÁNH)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1.1 Global Default Policies (branch_id = NULL)
INSERT INTO price_policies (id, branch_id, workspace_type_id, duration_unit, price, is_active) VALUES
  -- Desk (Bàn làm việc)
  ('d0000001-0000-0000-0000-000000000001'::uuid, NULL, 'a1000000-0000-0000-0000-000000000001'::uuid, 'hour',    25000.00, true),
  ('d0000001-0000-0000-0000-000000000002'::uuid, NULL, 'a1000000-0000-0000-0000-000000000001'::uuid, 'day',    170000.00, true),
  ('d0000001-0000-0000-0000-000000000003'::uuid, NULL, 'a1000000-0000-0000-0000-000000000001'::uuid, 'week',   700000.00, true),
  ('d0000001-0000-0000-0000-000000000004'::uuid, NULL, 'a1000000-0000-0000-0000-000000000001'::uuid, 'month', 2500000.00, true),
  -- Meeting Room (Phòng họp)
  ('d0000001-0000-0000-0000-000000000005'::uuid, NULL, 'a1000000-0000-0000-0000-000000000002'::uuid, 'hour',   120000.00, true),
  ('d0000001-0000-0000-0000-000000000006'::uuid, NULL, 'a1000000-0000-0000-0000-000000000002'::uuid, 'day',    800000.00, true),
  ('d0000001-0000-0000-0000-000000000007'::uuid, NULL, 'a1000000-0000-0000-0000-000000000002'::uuid, 'week',  3200000.00, true),
  ('d0000001-0000-0000-0000-000000000008'::uuid, NULL, 'a1000000-0000-0000-0000-000000000002'::uuid, 'month',11000000.00, true),
  -- Private Office (Văn phòng riêng)
  ('d0000001-0000-0000-0000-000000000009'::uuid, NULL, 'a1000000-0000-0000-0000-000000000003'::uuid, 'hour',   220000.00, true),
  ('d0000001-0000-0000-0000-000000000010'::uuid, NULL, 'a1000000-0000-0000-0000-000000000003'::uuid, 'day',   1600000.00, true),
  ('d0000001-0000-0000-0000-000000000011'::uuid, NULL, 'a1000000-0000-0000-0000-000000000003'::uuid, 'week',  5500000.00, true),
  ('d0000001-0000-0000-0000-000000000012'::uuid, NULL, 'a1000000-0000-0000-0000-000000000003'::uuid, 'month',18000000.00, true)
ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price, is_active = true;

-- 1.2 Branch 1: Nguyễn Huệ Q1 (Flagship Premium)
INSERT INTO price_policies (id, branch_id, workspace_type_id, duration_unit, price, is_active) VALUES
  ('d1000001-0001-0000-0000-000000000001'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'hour',    30000.00, true),
  ('d1000001-0001-0000-0000-000000000002'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'day',    200000.00, true),
  ('d1000001-0001-0000-0000-000000000003'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'week',   850000.00, true),
  ('d1000001-0001-0000-0000-000000000004'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'month', 3000000.00, true),
  ('d1000001-0001-0000-0000-000000000005'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'a1000000-0000-0000-0000-000000000002'::uuid, 'hour',   150000.00, true),
  ('d1000001-0001-0000-0000-000000000006'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'a1000000-0000-0000-0000-000000000002'::uuid, 'day',   1000000.00, true),
  ('d1000001-0001-0000-0000-000000000007'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'a1000000-0000-0000-0000-000000000002'::uuid, 'week',  4000000.00, true),
  ('d1000001-0001-0000-0000-000000000008'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'a1000000-0000-0000-0000-000000000002'::uuid, 'month',14000000.00, true),
  ('d1000001-0001-0000-0000-000000000009'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'a1000000-0000-0000-0000-000000000003'::uuid, 'hour',   250000.00, true),
  ('d1000001-0001-0000-0000-000000000010'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'a1000000-0000-0000-0000-000000000003'::uuid, 'day',   1800000.00, true),
  ('d1000001-0001-0000-0000-000000000011'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'a1000000-0000-0000-0000-000000000003'::uuid, 'week',  6500000.00, true),
  ('d1000001-0001-0000-0000-000000000012'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'a1000000-0000-0000-0000-000000000003'::uuid, 'month',22000000.00, true)
ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price, is_active = true;

-- 1.3 Branch 2: Hồ Con Rùa Q3 (Creative Tech Standard)
INSERT INTO price_policies (id, branch_id, workspace_type_id, duration_unit, price, is_active) VALUES
  ('d1000002-0001-0000-0000-000000000001'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'hour',    25000.00, true),
  ('d1000002-0001-0000-0000-000000000002'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'day',    180000.00, true),
  ('d1000002-0001-0000-0000-000000000003'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'week',   720000.00, true),
  ('d1000002-0001-0000-0000-000000000004'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'month', 2600000.00, true),
  ('d1000002-0001-0000-0000-000000000005'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'a1000000-0000-0000-0000-000000000002'::uuid, 'hour',   120000.00, true),
  ('d1000002-0001-0000-0000-000000000006'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'a1000000-0000-0000-0000-000000000002'::uuid, 'day',    850000.00, true),
  ('d1000002-0001-0000-0000-000000000007'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'a1000000-0000-0000-0000-000000000002'::uuid, 'week',  3300000.00, true),
  ('d1000002-0001-0000-0000-000000000008'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'a1000000-0000-0000-0000-000000000002'::uuid, 'month',11500000.00, true),
  ('d1000002-0001-0000-0000-000000000009'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'a1000000-0000-0000-0000-000000000003'::uuid, 'hour',   220000.00, true),
  ('d1000002-0001-0000-0000-000000000010'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'a1000000-0000-0000-0000-000000000003'::uuid, 'day',   1600000.00, true),
  ('d1000002-0001-0000-0000-000000000011'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'a1000000-0000-0000-0000-000000000003'::uuid, 'week',  5800000.00, true),
  ('d1000002-0001-0000-0000-000000000012'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'a1000000-0000-0000-0000-000000000003'::uuid, 'month',19500000.00, true)
ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price, is_active = true;

-- 1.4 Branch 3: ĐHQG Thủ Đức (Campus Tech Startup Value)
INSERT INTO price_policies (id, branch_id, workspace_type_id, duration_unit, price, is_active) VALUES
  ('d1000003-0001-0000-0000-000000000001'::uuid, 'b3000000-0000-0000-0000-000000000003'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'hour',    20000.00, true),
  ('d1000003-0001-0000-0000-000000000002'::uuid, 'b3000000-0000-0000-0000-000000000003'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'day',    140000.00, true),
  ('d1000003-0001-0000-0000-000000000003'::uuid, 'b3000000-0000-0000-0000-000000000003'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'week',   550000.00, true),
  ('d1000003-0001-0000-0000-000000000004'::uuid, 'b3000000-0000-0000-0000-000000000003'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'month', 2000000.00, true),
  ('d1000003-0001-0000-0000-000000000005'::uuid, 'b3000000-0000-0000-0000-000000000003'::uuid, 'a1000000-0000-0000-0000-000000000002'::uuid, 'hour',   100000.00, true),
  ('d1000003-0001-0000-0000-000000000006'::uuid, 'b3000000-0000-0000-0000-000000000003'::uuid, 'a1000000-0000-0000-0000-000000000002'::uuid, 'day',    700000.00, true),
  ('d1000003-0001-0000-0000-000000000007'::uuid, 'b3000000-0000-0000-0000-000000000003'::uuid, 'a1000000-0000-0000-0000-000000000002'::uuid, 'week',  2600000.00, true),
  ('d1000003-0001-0000-0000-000000000008'::uuid, 'b3000000-0000-0000-0000-000000000003'::uuid, 'a1000000-0000-0000-0000-000000000002'::uuid, 'month', 9000000.00, true),
  ('d1000003-0001-0000-0000-000000000009'::uuid, 'b3000000-0000-0000-0000-000000000003'::uuid, 'a1000000-0000-0000-0000-000000000003'::uuid, 'hour',   180000.00, true),
  ('d1000003-0001-0000-0000-000000000010'::uuid, 'b3000000-0000-0000-0000-000000000003'::uuid, 'a1000000-0000-0000-0000-000000000003'::uuid, 'day',   1300000.00, true),
  ('d1000003-0001-0000-0000-000000000011'::uuid, 'b3000000-0000-0000-0000-000000000003'::uuid, 'a1000000-0000-0000-0000-000000000003'::uuid, 'week',  4800000.00, true),
  ('d1000003-0001-0000-0000-000000000012'::uuid, 'b3000000-0000-0000-0000-000000000003'::uuid, 'a1000000-0000-0000-0000-000000000003'::uuid, 'month',16000000.00, true)
ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price, is_active = true;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. EXTRA SERVICES (ĐẦY ĐỦ GLOBAL & CHI NHÁNH, BẬT/TẮT ĐỂ DEMO ADMIN)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO extra_services (id, branch_id, code, name, service_type, unit, price, is_active, description) VALUES
  -- Global Active
  ('e0000001-0000-0000-0000-000000000001'::uuid, NULL, 'cafe-latte',    'Cà Phê Latte Sữa Tươi',         'drink',    'ly',    35000.00, true, 'Latte pha máy từ hạt Arabica Cầu Đất nguyên chất'),
  ('e0000001-0000-0000-0000-000000000002'::uuid, NULL, 'tra-dao',       'Trà Đào Cam Sả Tươi',           'drink',    'ly',    40000.00, true, 'Trà đào thanh nhiệt kèm miếng đào giòn và sả tươi'),
  ('e0000001-0000-0000-0000-000000000003'::uuid, NULL, 'nuoc-ep',       'Nước Ép Trái Cây Tươi',          'drink',    'ly',    45000.00, true, 'Nước ép cam / dưa hấu / ổi nguyên chất 100%'),
  ('e0000001-0000-0000-0000-000000000004'::uuid, NULL, 'in-trang-den',  'In Ấn Trắng Đen Laser A4',       'printing', 'trang',  1000.00, true, 'In ấn laser tài liệu văn phòng giấy Double A 80gsm'),
  ('e0000001-0000-0000-0000-000000000005'::uuid, NULL, 'in-mau',        'In Ấn Màu Laser A4',             'printing', 'trang',  3000.00, true, 'In màu sắc nét cho báo cáo, biểu đồ, profile'),
  ('e0000001-0000-0000-0000-000000000006'::uuid, NULL, 'banh-mi',       'Bánh Mì Thịt Nguội & Pate',      'meal',     'phần',  30000.00, true, 'Bánh mì giòn nóng kèm pate, chả lụa và dưa góp'),
  ('e0000001-0000-0000-0000-000000000007'::uuid, NULL, 'com-trua',      'Cơm Trưa Văn Phòng Healthy',     'meal',     'phần',  55000.00, true, 'Set cơm trưa cân bằng dinh dưỡng thay đổi mỗi ngày'),
  ('e0000001-0000-0000-0000-000000000008'::uuid, NULL, 'may-chieu-4k',  'Máy Chiếu Laser 4K & Màn 150in', 'equipment', 'giờ',  150000.00, true, 'Máy chiếu laser 4K siêu nét hỗ trợ HDMI & Không dây'),
  ('e0000001-0000-0000-0000-000000000009'::uuid, NULL, 'smart-board',   'Bảng Tương Tác Cảm Ứng 75in',    'equipment', 'giờ',  100000.00, true, 'Bảng viết cảm ứng đa điểm hỗ trợ lưu file & họp online'),
  ('e0000001-0000-0000-0000-000000000010'::uuid, NULL, 'man-hinh-4k',   'Màn Hình Rời Dell 27in 4K',      'equipment', 'ngày', 120000.00, true, 'Màn hình công thái học Dell UltraSharp hỗ trợ Type-C PD 90W'),
  
  -- Global Inactive (để demo Admin bật/tắt dịch vụ)
  ('e0000001-0000-0000-0000-000000000021'::uuid, NULL, 'teabreak-vip',  'Gói Tiệc Trà Teabreak Cao Cấp',  'meal',     'phần', 120000.00, false, 'Tạm ngưng do đối tác bánh bảo trì hệ thống bếp'),
  ('e0000001-0000-0000-0000-000000000022'::uuid, NULL, 'do-xe-oto',     'Chỗ Đỗ Xe Ô Tô Tầng Hầm B2',     'facility', 'ngày', 150000.00, false, 'Tạm ngưng phục vụ do hầm xe đang bảo dưỡng sơn sàn'),
  ('e0000001-0000-0000-0000-000000000023'::uuid, NULL, 'livestream-kit', 'Bộ Livestream & Hội Thảo 4K',   'equipment', 'buổi', 500000.00, false, 'Tạm ngưng do đang nâng cấp firmware thiết bị'),

  -- Branch 1 (Nguyễn Huệ Q1) Special Services
  ('e0000001-0000-0000-0000-000000000011'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'combo-sang-q1', 'Combo Sáng Q1 (Croissant + Americano)', 'meal', 'phần', 65000.00, true, 'Bữa sáng tiêu chuẩn cao cấp chi nhánh Nguyễn Huệ'),
  ('e0000001-0000-0000-0000-000000000012'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'thu-tin-q1',    'Dịch Vụ Nhận Thư Tín & Bưu Phẩm',        'facility', 'tháng', 200000.00, true, 'Địa chỉ đăng ký nhận bưu phẩm chuyên nghiệp tại Q1'),

  -- Branch 2 (Hồ Con Rùa Q3) Special Services
  ('e0000001-0000-0000-0000-000000000031'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'podcast-room',   'Thuê Phòng Thu Podcast Mini Q3',         'facility', 'giờ', 250000.00, true, 'Phòng cách âm chuyên dụng kèm 2 Micro Rode PodMic'),
  ('e0000001-0000-0000-0000-000000000032'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'detox-q3',       'Set Nước Ép Detox Năng Lượng Q3',        'drink',    'ly',   50000.00, true, 'Nước ép cần tây, táo xanh, gừng hữu cơ'),

  -- Branch 3 (ĐHQG Thủ Đức) Special Services
  ('e0000001-0000-0000-0000-000000000041'::uuid, 'b3000000-0000-0000-0000-000000000003'::uuid, 'dev-kit-td',     'Bộ Bàn Phím Cơ & Chuột Ergonomic',       'equipment', 'ngày', 40000.00, true, 'Bàn phím cơ Cherry MX Red và chuột chống mỏi tay cho Lập trình viên'),
  ('e0000001-0000-0000-0000-000000000042'::uuid, 'b3000000-0000-0000-0000-000000000003'::uuid, 'combo-dem-td',   'Combo Thức Khuya Cày Deadline (Mì + Bò Húc)', 'meal', 'phần', 35000.00, true, 'Gói cứu đói ban đêm cho sinh viên và startup')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  price = EXCLUDED.price, 
  is_active = EXCLUDED.is_active, 
  description = EXCLUDED.description;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CHƯƠNG TRÌNH KHUYẾN MÃI (PROMOTIONS / VOUCHERS CHO CHECKOUT DEMO)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO promotions (id, code, name, description, discount_type, discount_value, max_discount_amount, min_order_amount, start_at, end_at, usage_limit, per_user_limit, is_public, is_active) VALUES
  ('a0000001-0000-0000-0000-000000000001'::uuid, 'WELCOME2026', 'Chào Mừng Thành Viên Mới 20%', 'Giảm 20% cho đơn đặt chỗ đầu tiên (tối đa 100.000đ)', 'percent', 20, 100000, 50000, '2026-01-01 00:00:00+07', '2026-12-31 23:59:59+07', 500, 1, true, true),
  ('a0000001-0000-0000-0000-000000000002'::uuid, 'COWORKING10', 'Ưu Đãi Coworking Mùa Thu 10%', 'Giảm 10% cho mọi đơn đặt chỗ bàn làm việc', 'percent', 10, 50000, 30000, '2026-09-01 00:00:00+07', '2026-10-31 23:59:59+07', 1000, 3, true, true),
  ('a0000001-0000-0000-0000-000000000003'::uuid, 'TECHFEST26',  'Khuyến Mãi Phòng Họp 50K',      'Giảm trực tiếp 50.000đ cho đơn phòng họp từ 300.000đ', 'fixed', 50000, 50000, 300000, '2026-09-15 00:00:00+07', '2026-10-15 23:59:59+07', 200, 2, true, true),
  ('a0000001-0000-0000-0000-000000000004'::uuid, 'VIPMEMBER',   'Đặc Quyền Thành Viên Gold/Platinum', 'Giảm 15% cho tất cả dịch vụ và không gian', 'percent', 15, 200000, 100000, '2026-01-01 00:00:00+07', '2026-12-31 23:59:59+07', 500, 5, true, true)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  discount_value = EXCLUDED.discount_value, 
  is_active = true;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. CHÍNH SÁCH HỦY & HOÀN TIỀN (CANCELLATION POLICIES)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO cancellation_policies (id, name, rule_type, min_value, max_value, refund_percent, priority, branch_id, workspace_type_id, is_active, effective_from) VALUES
  -- Flexible (Bàn làm việc)
  ('ca000001-0000-0000-0000-000000000001'::uuid, 'Linh hoạt: Hủy trước 2h hoàn 100%', 'HOURS_BEFORE_CHECKIN', 2, 999999, 100.00, 10, NULL, 'a1000000-0000-0000-0000-000000000001'::uuid, true, '2026-01-01 00:00:00+07'),
  ('ca000001-0000-0000-0000-000000000002'::uuid, 'Linh hoạt: Hủy từ 1h - 2h hoàn 50%', 'HOURS_BEFORE_CHECKIN', 1, 2,      50.00,  20, NULL, 'a1000000-0000-0000-0000-000000000001'::uuid, true, '2026-01-01 00:00:00+07'),
  ('ca000001-0000-0000-0000-000000000003'::uuid, 'Linh hoạt: Dưới 1h không hoàn tiền',  'HOURS_BEFORE_CHECKIN', 0, 1,       0.00,  30, NULL, 'a1000000-0000-0000-0000-000000000001'::uuid, true, '2026-01-01 00:00:00+07'),
  -- Standard (Phòng họp)
  ('ca000001-0000-0000-0000-000000000004'::uuid, 'Tiêu chuẩn: Hủy trước 24h hoàn 100%', 'HOURS_BEFORE_CHECKIN', 24, 999999, 100.00, 10, NULL, 'a1000000-0000-0000-0000-000000000002'::uuid, true, '2026-01-01 00:00:00+07'),
  ('ca000001-0000-0000-0000-000000000005'::uuid, 'Tiêu chuẩn: Hủy trước 6h - 24h hoàn 50%', 'HOURS_BEFORE_CHECKIN', 6, 24, 50.00,  20, NULL, 'a1000000-0000-0000-0000-000000000002'::uuid, true, '2026-01-01 00:00:00+07'),
  -- Strict (Văn phòng riêng)
  ('ca000001-0000-0000-0000-000000000006'::uuid, 'Nghiêm ngặt: Hủy trước 72h hoàn 80%', 'HOURS_BEFORE_CHECKIN', 72, 999999, 80.00, 10, NULL, 'a1000000-0000-0000-0000-000000000003'::uuid, true, '2026-01-01 00:00:00+07'),
  ('ca000001-0000-0000-0000-000000000007'::uuid, 'Nghiêm ngặt: Dưới 72h không hoàn tiền', 'HOURS_BEFORE_CHECKIN', 0, 72,     0.00, 20, NULL, 'a1000000-0000-0000-0000-000000000003'::uuid, true, '2026-01-01 00:00:00+07')
ON CONFLICT (id) DO UPDATE SET refund_percent = EXCLUDED.refund_percent, is_active = true;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. KỊCH BẢN VẬN HÀNH TRỌNG TÂM NGÀY 02/10/2026 (THỨ 6 - NGÀY DEMO 1)
-- ─────────────────────────────────────────────────────────────────────────────

-- 5.1 Đơn 1 — CONFIRMED (Khách Nguyễn Văn An đã thanh toán VietQR, sẵn sàng Demo Check-in)
INSERT INTO bookings (
  id, booking_code, user_id, workspace_id, branch_id, workspace_type_id,
  start_at, end_at, unit, unit_count, is_contract, status,
  price_per_unit, subtotal_amount, discount_amount, addon_amount, total_amount, source
) VALUES (
  'b0261002-0000-0000-0000-000000000001'::uuid, 'CS-BK-2610-0201',
  'd1000001-0000-0000-0000-000000000001'::uuid, 'c1010001-0000-0000-0000-000000000001'::uuid, -- HD-101 (Q1)
  'b1000000-0000-0000-0000-000000000001'::uuid, 'desk',
  '2026-10-02 08:30:00+07'::timestamptz, '2026-10-02 17:30:00+07'::timestamptz,
  'day', 1, false, 'CONFIRMED',
  200000, 200000, 0, 0, 200000, 'web'
) ON CONFLICT (id) DO UPDATE SET status = 'CONFIRMED', start_at = EXCLUDED.start_at, end_at = EXCLUDED.end_at;

INSERT INTO payments (id, booking_id, user_id, provider, method, order_id, amount, status, paid_at, created_at, purpose)
VALUES (
  'ea261002-0000-0000-0000-000000000001'::uuid, 'b0261002-0000-0000-0000-000000000001'::uuid,
  'd1000001-0000-0000-0000-000000000001'::uuid, 'payos', 'vietqr', 'PAY-261002-01',
  200000, 'PAID', '2026-10-02 07:15:00+07'::timestamptz, '2026-10-02 07:10:00+07'::timestamptz, 'booking'
) ON CONFLICT (id) DO NOTHING;

-- 5.2 Đơn 2 — CHECKED_IN CÓ RUNNING TAB (Khách Trần Thị Bình đang họp MR-101 + gọi 2 Latte và 1 Bánh mì chưa trả tiền)
INSERT INTO bookings (
  id, booking_code, user_id, workspace_id, branch_id, workspace_type_id,
  start_at, end_at, unit, unit_count, is_contract, status,
  price_per_unit, subtotal_amount, discount_amount, addon_amount, total_amount, source
) VALUES (
  'b0261002-0000-0000-0000-000000000002'::uuid, 'CS-BK-2610-0202',
  'd1000001-0000-0000-0000-000000000002'::uuid, 'c1010006-0000-0000-0000-000000000006'::uuid, -- MR-101 (Q1)
  'b1000000-0000-0000-0000-000000000001'::uuid, 'meeting_room',
  '2026-10-02 08:00:00+07'::timestamptz, '2026-10-02 12:00:00+07'::timestamptz,
  'hour', 4, false, 'CHECKED_IN',
  150000, 600000, 0, 100000, 700000, 'web'
) ON CONFLICT (id) DO UPDATE SET status = 'CHECKED_IN', addon_amount = 100000, total_amount = 700000;

INSERT INTO payments (id, booking_id, user_id, provider, method, order_id, amount, status, paid_at, created_at, purpose)
VALUES (
  'ea261002-0000-0000-0000-000000000002'::uuid, 'b0261002-0000-0000-0000-000000000002'::uuid,
  'd1000001-0000-0000-0000-000000000002'::uuid, 'payos', 'vietqr', 'PAY-261002-02',
  600000, 'PAID', '2026-10-02 07:30:00+07'::timestamptz, '2026-10-02 07:25:00+07'::timestamptz, 'booking'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO checkin_logs (id, booking_id, staff_user_id, checkin_at, checkout_at, note)
VALUES (
  'ca261002-0000-0000-0000-000000000002'::uuid, 'b0261002-0000-0000-0000-000000000002'::uuid,
  'd3000001-0000-0000-0000-000000000001'::uuid, '2026-10-02 08:02:00+07'::timestamptz,
  NULL, 'Nhóm thiết kế 6 người vào phòng đúng giờ'
) ON CONFLICT (id) DO NOTHING;

DELETE FROM booking_services WHERE booking_id = 'b0261002-0000-0000-0000-000000000002'::uuid;
INSERT INTO booking_services (id, booking_id, service_id, quantity, unit_price, subtotal, status, line_type, description, created_at) VALUES 
  ('ba261002-0000-0000-0000-000000000001'::uuid, 'b0261002-0000-0000-0000-000000000002'::uuid, 'e0000001-0000-0000-0000-000000000001'::uuid, 2, 35000, 70000, 'unpaid', 'service', 'Cà Phê Latte Sữa Tươi (2 ly)', '2026-10-02 09:15:00+07'::timestamptz),
  ('ba261002-0000-0000-0000-000000000002'::uuid, 'b0261002-0000-0000-0000-000000000002'::uuid, 'e0000001-0000-0000-0000-000000000006'::uuid, 1, 30000, 30000, 'unpaid', 'service', 'Bánh Mì Thịt Nguội & Pate', '2026-10-02 09:30:00+07'::timestamptz);

-- 5.3 Đơn 3 — CHECKED_IN SẮP HẾT GIỜ (Khách Lê Quốc Cường HD-103 sắp hết giờ để demo Gia Hạn)
INSERT INTO bookings (
  id, booking_code, user_id, workspace_id, branch_id, workspace_type_id,
  start_at, end_at, unit, unit_count, is_contract, status,
  price_per_unit, subtotal_amount, discount_amount, addon_amount, total_amount, source
) VALUES (
  'b0261002-0000-0000-0000-000000000003'::uuid, 'CS-BK-2610-0203',
  'd1000001-0000-0000-0000-000000000003'::uuid, 'c1010003-0000-0000-0000-000000000003'::uuid, -- HD-103
  'b1000000-0000-0000-0000-000000000001'::uuid, 'desk',
  '2026-10-02 08:30:00+07'::timestamptz, '2026-10-02 11:30:00+07'::timestamptz,
  'hour', 3, false, 'CHECKED_IN',
  30000, 90000, 0, 0, 90000, 'web'
) ON CONFLICT (id) DO UPDATE SET status = 'CHECKED_IN';

INSERT INTO payments (id, booking_id, user_id, provider, method, order_id, amount, status, paid_at, created_at, purpose)
VALUES (
  'ea261002-0000-0000-0000-000000000003'::uuid, 'b0261002-0000-0000-0000-000000000003'::uuid,
  'd1000001-0000-0000-0000-000000000003'::uuid, 'payos', 'vietqr', 'PAY-261002-03',
  90000, 'PAID', '2026-10-02 08:15:00+07'::timestamptz, '2026-10-02 08:10:00+07'::timestamptz, 'booking'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO checkin_logs (id, booking_id, staff_user_id, checkin_at, checkout_at, note)
VALUES (
  'ca261002-0000-0000-0000-000000000003'::uuid, 'b0261002-0000-0000-0000-000000000003'::uuid,
  'd3000001-0000-0000-0000-000000000001'::uuid, '2026-10-02 08:35:00+07'::timestamptz,
  NULL, 'Freelancer Marketing checkin'
) ON CONFLICT (id) DO NOTHING;

-- 5.4 Đơn 4 — CHECKED_IN TRỄ GIỜ CHECK-OUT (Khách Đặng Văn Giang trễ 45 phút để demo Tính Phụ Phí)
INSERT INTO bookings (
  id, booking_code, user_id, workspace_id, branch_id, workspace_type_id,
  start_at, end_at, unit, unit_count, is_contract, status,
  price_per_unit, subtotal_amount, discount_amount, addon_amount, total_amount, source
) VALUES (
  'b0261002-0000-0000-0000-000000000004'::uuid, 'CS-BK-2610-0204',
  'd1000001-0000-0000-0000-000000000007'::uuid, 'c1010002-0000-0000-0000-000000000002'::uuid, -- HD-102
  'b1000000-0000-0000-0000-000000000001'::uuid, 'desk',
  '2026-10-02 07:00:00+07'::timestamptz, '2026-10-02 10:00:00+07'::timestamptz,
  'hour', 3, false, 'CHECKED_IN',
  30000, 90000, 0, 0, 90000, 'counter'
) ON CONFLICT (id) DO UPDATE SET status = 'CHECKED_IN';

INSERT INTO payments (id, booking_id, user_id, provider, method, order_id, amount, status, paid_at, created_at, purpose)
VALUES (
  'ea261002-0000-0000-0000-000000000004'::uuid, 'b0261002-0000-0000-0000-000000000004'::uuid,
  'd1000001-0000-0000-0000-000000000007'::uuid, 'cash', 'cash', 'PAY-261002-04',
  90000, 'PAID', '2026-10-02 07:00:00+07'::timestamptz, '2026-10-02 07:00:00+07'::timestamptz, 'booking'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO checkin_logs (id, booking_id, staff_user_id, checkin_at, checkout_at, note)
VALUES (
  'ca261002-0000-0000-0000-000000000004'::uuid, 'b0261002-0000-0000-0000-000000000004'::uuid,
  'd3000001-0000-0000-0000-000000000001'::uuid, '2026-10-02 07:05:00+07'::timestamptz,
  NULL, 'Khách vãng lai đăng ký tại quầy'
) ON CONFLICT (id) DO NOTHING;

-- 5.5 Đơn 5 — COMPLETED (Phòng họp sáng sớm hoàn tất)
INSERT INTO bookings (
  id, booking_code, user_id, workspace_id, branch_id, workspace_type_id,
  start_at, end_at, unit, unit_count, is_contract, status,
  price_per_unit, subtotal_amount, discount_amount, addon_amount, total_amount, source
) VALUES (
  'b0261002-0000-0000-0000-000000000005'::uuid, 'CS-BK-2610-0205',
  'd1000001-0000-0000-0000-000000000004'::uuid, 'c1020001-0000-0000-0000-000000000001'::uuid, -- MR-201
  'b1000000-0000-0000-0000-000000000001'::uuid, 'meeting_room',
  '2026-10-02 06:30:00+07'::timestamptz, '2026-10-02 08:30:00+07'::timestamptz,
  'hour', 2, false, 'COMPLETED',
  150000, 300000, 0, 0, 300000, 'web'
) ON CONFLICT (id) DO UPDATE SET status = 'COMPLETED';

INSERT INTO payments (id, booking_id, user_id, provider, method, order_id, amount, status, paid_at, created_at, purpose)
VALUES (
  'ea261002-0000-0000-0000-000000000005'::uuid, 'b0261002-0000-0000-0000-000000000005'::uuid,
  'd1000001-0000-0000-0000-000000000004'::uuid, 'payos', 'vietqr', 'PAY-261002-05',
  300000, 'PAID', '2026-10-01 20:00:00+07'::timestamptz, '2026-10-01 19:50:00+07'::timestamptz, 'booking'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO checkin_logs (id, booking_id, staff_user_id, checkin_at, checkout_at, note)
VALUES (
  'ca261002-0000-0000-0000-000000000005'::uuid, 'b0261002-0000-0000-0000-000000000005'::uuid,
  'd3000001-0000-0000-0000-000000000001'::uuid, '2026-10-02 06:32:00+07'::timestamptz,
  '2026-10-02 08:30:00+07'::timestamptz, 'Họp giao ban hoàn tất'
) ON CONFLICT (id) DO NOTHING;

-- 5.6 Đơn 6 — CANCELLED CÓ YÊU CẦU HOÀN TIỀN (Khách Đoàn Văn Khôi hủy để demo Duyệt Hoàn Tiền Admin)
INSERT INTO bookings (
  id, booking_code, user_id, workspace_id, branch_id, workspace_type_id,
  start_at, end_at, unit, unit_count, is_contract, status,
  price_per_unit, subtotal_amount, discount_amount, addon_amount, total_amount, source
) VALUES (
  'b0261002-0000-0000-0000-000000000006'::uuid, 'CS-BK-2610-0206',
  'd1000001-0000-0000-0000-000000000009'::uuid, 'c1020002-0000-0000-0000-000000000002'::uuid, -- MR-202
  'b1000000-0000-0000-0000-000000000001'::uuid, 'meeting_room',
  '2026-10-02 14:00:00+07'::timestamptz, '2026-10-02 17:00:00+07'::timestamptz,
  'hour', 3, false, 'CANCELLED',
  150000, 450000, 0, 0, 450000, 'web'
) ON CONFLICT (id) DO UPDATE SET status = 'CANCELLED';

INSERT INTO payments (id, booking_id, user_id, provider, method, order_id, amount, status, paid_at, created_at, purpose)
VALUES (
  'ea261002-0000-0000-0000-000000000006'::uuid, 'b0261002-0000-0000-0000-000000000006'::uuid,
  'd1000001-0000-0000-0000-000000000009'::uuid, 'payos', 'vietqr', 'PAY-261002-06',
  450000, 'PAID', '2026-10-01 15:00:00+07'::timestamptz, '2026-10-01 14:50:00+07'::timestamptz, 'booking'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO booking_cancellations (id, booking_id, user_id, reason, refund_percent, refund_amount, penalty_amount, refund_status, applied_rule_json, created_at)
VALUES (
  'bc261002-0000-0000-0000-000000000001'::uuid, 'b0261002-0000-0000-0000-000000000006'::uuid,
  'd1000001-0000-0000-0000-000000000009'::uuid, 'Đối tác chuyển lịch họp online qua Google Meet',
  100.00, 450000, 0, 'pending', '{"policyName": "Tiêu chuẩn: Hủy trước 24h hoàn 100%", "refundPercent": 100}'::jsonb, '2026-10-01 18:30:00+07'::timestamptz
) ON CONFLICT (id) DO NOTHING;

-- 5.7 Đơn 7 — HỢP ĐỒNG VĂN PHÒNG RIÊNG (Tháng 10 tại Q1 đang active)
INSERT INTO bookings (
  id, booking_code, user_id, workspace_id, branch_id, workspace_type_id,
  start_at, end_at, unit, unit_count, is_contract, status,
  price_per_unit, subtotal_amount, discount_amount, addon_amount, total_amount, source
) VALUES (
  'b0261002-0000-0000-0000-000000000007'::uuid, 'CS-BK-2610-0207',
  'd1000001-0000-0000-0000-000000000008'::uuid, 'c1030002-0000-0000-0000-000000000002'::uuid, -- PO-302
  'b1000000-0000-0000-0000-000000000001'::uuid, 'private_office',
  '2026-10-01 08:00:00+07'::timestamptz, '2026-11-01 18:00:00+07'::timestamptz,
  'month', 1, true, 'CHECKED_IN',
  18000000, 18000000, 0, 0, 18000000, 'web'
) ON CONFLICT (id) DO UPDATE SET status = 'CHECKED_IN';

INSERT INTO payments (id, booking_id, user_id, provider, method, order_id, amount, status, paid_at, created_at, purpose)
VALUES (
  'ea261002-0000-0000-0000-000000000007'::uuid, 'b0261002-0000-0000-0000-000000000007'::uuid,
  'd1000001-0000-0000-0000-000000000008'::uuid, 'payos', 'vietqr', 'PAY-261002-07',
  18000000, 'PAID', '2026-09-28 10:00:00+07'::timestamptz, '2026-09-28 09:40:00+07'::timestamptz, 'booking'
) ON CONFLICT (id) DO NOTHING;

-- 5.8 Đơn 8 — CHECKED_IN Chi nhánh Q3 (Bàn FL-101)
INSERT INTO bookings (
  id, booking_code, user_id, workspace_id, branch_id, workspace_type_id,
  start_at, end_at, unit, unit_count, is_contract, status,
  price_per_unit, subtotal_amount, discount_amount, addon_amount, total_amount, source
) VALUES (
  'b0261002-0000-0000-0000-000000000008'::uuid, 'CS-BK-2610-0208',
  'd1000001-0000-0000-0000-000000000005'::uuid, 'c2010001-0000-0000-0000-000000000001'::uuid,
  'b2000000-0000-0000-0000-000000000002'::uuid, 'desk',
  '2026-10-02 08:30:00+07'::timestamptz, '2026-10-02 17:30:00+07'::timestamptz,
  'day', 1, false, 'CHECKED_IN',
  180000, 180000, 0, 0, 180000, 'web'
) ON CONFLICT (id) DO UPDATE SET status = 'CHECKED_IN';

INSERT INTO payments (id, booking_id, user_id, provider, method, order_id, amount, status, paid_at, created_at, purpose)
VALUES (
  'ea261002-0000-0000-0000-000000000008'::uuid, 'b0261002-0000-0000-0000-000000000008'::uuid,
  'd1000001-0000-0000-0000-000000000005'::uuid, 'payos', 'vietqr', 'PAY-261002-08',
  180000, 'PAID', '2026-10-02 08:20:00+07'::timestamptz, '2026-10-02 08:15:00+07'::timestamptz, 'booking'
) ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. KỊCH BẢN VẬN HÀNH TRỌNG TÂM NGÀY 05/10/2026 (THỨ 2 - NGÀY DEMO 2)
-- ─────────────────────────────────────────────────────────────────────────────

-- 6.1 Đơn 1 — CONFIRMED (Khách Phạm Thị Dung đặt phòng họp Boardroom VIP Q1 sẵn sàng Demo Check-in)
INSERT INTO bookings (
  id, booking_code, user_id, workspace_id, branch_id, workspace_type_id,
  start_at, end_at, unit, unit_count, is_contract, status,
  price_per_unit, subtotal_amount, discount_amount, addon_amount, total_amount, source
) VALUES (
  'b0261005-0000-0000-0000-000000000001'::uuid, 'CS-BK-2610-0501',
  'd1000001-0000-0000-0000-000000000004'::uuid, 'c1020002-0000-0000-0000-000000000002'::uuid, -- MR-202 (Boardroom 10 chỗ)
  'b1000000-0000-0000-0000-000000000001'::uuid, 'meeting_room',
  '2026-10-05 09:00:00+07'::timestamptz, '2026-10-05 12:00:00+07'::timestamptz,
  'hour', 3, false, 'CONFIRMED',
  150000, 450000, 50000, 0, 400000, 'web' -- Áp dụng voucher TECHFEST26
) ON CONFLICT (id) DO UPDATE SET status = 'CONFIRMED';

INSERT INTO payments (id, booking_id, user_id, provider, method, order_id, amount, status, paid_at, created_at, purpose)
VALUES (
  'ea261005-0000-0000-0000-000000000001'::uuid, 'b0261005-0000-0000-0000-000000000001'::uuid,
  'd1000001-0000-0000-0000-000000000004'::uuid, 'payos', 'vietqr', 'PAY-261005-01',
  400000, 'PAID', '2026-10-05 08:10:00+07'::timestamptz, '2026-10-05 08:05:00+07'::timestamptz, 'booking'
) ON CONFLICT (id) DO NOTHING;

-- 6.2 Đơn 2 — CHECKED_IN CÓ RUNNING TAB (Khách Hoàng Minh Em tại Q3 gọi 1 Nước Ép + 1 Cơm Trưa)
INSERT INTO bookings (
  id, booking_code, user_id, workspace_id, branch_id, workspace_type_id,
  start_at, end_at, unit, unit_count, is_contract, status,
  price_per_unit, subtotal_amount, discount_amount, addon_amount, total_amount, source
) VALUES (
  'b0261005-0000-0000-0000-000000000002'::uuid, 'CS-BK-2610-0502',
  'd1000001-0000-0000-0000-000000000005'::uuid, 'c2010002-0000-0000-0000-000000000002'::uuid, -- FL-102 (Q3)
  'b2000000-0000-0000-0000-000000000002'::uuid, 'desk',
  '2026-10-05 08:00:00+07'::timestamptz, '2026-10-05 17:00:00+07'::timestamptz,
  'day', 1, false, 'CHECKED_IN',
  180000, 180000, 0, 100000, 280000, 'web'
) ON CONFLICT (id) DO UPDATE SET status = 'CHECKED_IN', addon_amount = 100000, total_amount = 280000;

INSERT INTO payments (id, booking_id, user_id, provider, method, order_id, amount, status, paid_at, created_at, purpose)
VALUES (
  'ea261005-0000-0000-0000-000000000002'::uuid, 'b0261005-0000-0000-0000-000000000002'::uuid,
  'd1000001-0000-0000-0000-000000000005'::uuid, 'payos', 'vietqr', 'PAY-261005-02',
  180000, 'PAID', '2026-10-05 07:45:00+07'::timestamptz, '2026-10-05 07:40:00+07'::timestamptz, 'booking'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO checkin_logs (id, booking_id, staff_user_id, checkin_at, checkout_at, note)
VALUES (
  'ca261005-0000-0000-0000-000000000002'::uuid, 'b0261005-0000-0000-0000-000000000002'::uuid,
  'd3000001-0000-0000-0000-000000000002'::uuid, '2026-10-05 08:05:00+07'::timestamptz,
  NULL, 'Thành viên checkin làm việc cả ngày'
) ON CONFLICT (id) DO NOTHING;

DELETE FROM booking_services WHERE booking_id = 'b0261005-0000-0000-0000-000000000002'::uuid;
INSERT INTO booking_services (id, booking_id, service_id, quantity, unit_price, subtotal, status, line_type, description, created_at) VALUES 
  ('ba261005-0000-0000-0000-000000000001'::uuid, 'b0261005-0000-0000-0000-000000000002'::uuid, 'e0000001-0000-0000-0000-000000000003'::uuid, 1, 45000, 45000, 'unpaid', 'service', 'Nước Ép Trái Cây Tươi (Cam vắt)', '2026-10-05 09:30:00+07'::timestamptz),
  ('ba261005-0000-0000-0000-000000000002'::uuid, 'b0261005-0000-0000-0000-000000000002'::uuid, 'e0000001-0000-0000-0000-000000000007'::uuid, 1, 55000, 55000, 'unpaid', 'service', 'Cơm Trưa Văn Phòng Healthy (Set gà áp chảo)', '2026-10-05 10:15:00+07'::timestamptz);

-- 6.3 Đơn 3 — CHECKED_IN Cụm bàn Dedicated Q1 (DD-201)
INSERT INTO bookings (
  id, booking_code, user_id, workspace_id, branch_id, workspace_type_id,
  start_at, end_at, unit, unit_count, is_contract, status,
  price_per_unit, subtotal_amount, discount_amount, addon_amount, total_amount, source
) VALUES (
  'b0261005-0000-0000-0000-000000000003'::uuid, 'CS-BK-2610-0503',
  'd1000001-0000-0000-0000-000000000003'::uuid, 'c1020003-0000-0000-0000-000000000003'::uuid,
  'b1000000-0000-0000-0000-000000000001'::uuid, 'desk',
  '2026-10-05 08:30:00+07'::timestamptz, '2026-10-12 18:00:00+07'::timestamptz,
  'week', 1, false, 'CHECKED_IN',
  850000, 850000, 0, 0, 850000, 'web'
) ON CONFLICT (id) DO UPDATE SET status = 'CHECKED_IN';

INSERT INTO payments (id, booking_id, user_id, provider, method, order_id, amount, status, paid_at, created_at, purpose)
VALUES (
  'ea261005-0000-0000-0000-000000000003'::uuid, 'b0261005-0000-0000-0000-000000000003'::uuid,
  'd1000001-0000-0000-0000-000000000003'::uuid, 'payos', 'vietqr', 'PAY-261005-03',
  850000, 'PAID', '2026-10-04 16:00:00+07'::timestamptz, '2026-10-04 15:50:00+07'::timestamptz, 'booking'
) ON CONFLICT (id) DO NOTHING;

-- 6.4 Đơn 4 — CONFIRMED Đặt tại quầy Chi nhánh Thủ Đức (Bàn TA-101)
INSERT INTO bookings (
  id, booking_code, user_id, workspace_id, branch_id, workspace_type_id,
  start_at, end_at, unit, unit_count, is_contract, status,
  price_per_unit, subtotal_amount, discount_amount, addon_amount, total_amount, source
) VALUES (
  'b0261005-0000-0000-0000-000000000004'::uuid, 'CS-BK-2610-0504',
  'd1000001-0000-0000-0000-000000000006'::uuid, 'c3010001-0000-0000-0000-000000000001'::uuid,
  'b3000000-0000-0000-0000-000000000003'::uuid, 'desk',
  '2026-10-05 13:00:00+07'::timestamptz, '2026-10-05 18:00:00+07'::timestamptz,
  'hour', 5, false, 'CONFIRMED',
  20000, 100000, 0, 0, 100000, 'counter'
) ON CONFLICT (id) DO UPDATE SET status = 'CONFIRMED';

INSERT INTO payments (id, booking_id, user_id, provider, method, order_id, amount, status, paid_at, created_at, purpose)
VALUES (
  'ea261005-0000-0000-0000-000000000004'::uuid, 'b0261005-0000-0000-0000-000000000004'::uuid,
  'd1000001-0000-0000-0000-000000000006'::uuid, 'cash', 'cash', 'PAY-261005-04',
  100000, 'PAID', '2026-10-05 12:45:00+07'::timestamptz, '2026-10-05 12:45:00+07'::timestamptz, 'booking'
) ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. DỮ LIỆU LỊCH SỬ DOANH THU TOÀN DIỆN NĂM 2026 (THÁNG 1 ĐẾN THÁNG 12)
-- Đảm bảo biểu đồ Doanh thu (BarChart/LineChart) và tỷ lệ lấp đầy hiển thị liên tục
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Tháng 8/2026 ──
INSERT INTO bookings (id, booking_code, user_id, workspace_id, branch_id, workspace_type_id, start_at, end_at, unit, unit_count, is_contract, status, price_per_unit, subtotal_amount, discount_amount, addon_amount, total_amount, source) VALUES
  ('b0010008-0000-0000-0000-000000000001'::uuid, 'CS-BK-2608-0001', 'd1000001-0000-0000-0000-000000000001'::uuid, 'c1030001-0000-0000-0000-000000000001'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'private_office', '2026-08-01 08:00:00+07'::timestamptz, '2026-09-01 18:00:00+07'::timestamptz, 'month', 1, true, 'COMPLETED', 18000000, 18000000, 0, 0, 18000000, 'web'),
  ('b0010008-0000-0000-0000-000000000002'::uuid, 'CS-BK-2608-0002', 'd1000001-0000-0000-0000-000000000002'::uuid, 'c1020001-0000-0000-0000-000000000001'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'meeting_room', '2026-08-12 09:00:00+07'::timestamptz, '2026-08-12 17:00:00+07'::timestamptz, 'hour', 8, false, 'COMPLETED', 150000, 1200000, 0, 0, 1200000, 'web'),
  ('b0020008-0000-0000-0000-000000000001'::uuid, 'CS-BK-2608-0003', 'd1000001-0000-0000-0000-000000000003'::uuid, 'c2020003-0000-0000-0000-000000000003'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'private_office', '2026-08-05 08:00:00+07'::timestamptz, '2026-09-05 18:00:00+07'::timestamptz, 'month', 1, true, 'COMPLETED', 7500000, 7500000, 0, 0, 7500000, 'web'),
  ('b0030008-0000-0000-0000-000000000001'::uuid, 'CS-BK-2608-0004', 'd1000001-0000-0000-0000-000000000004'::uuid, 'c3030001-0000-0000-0000-000000000001'::uuid, 'b3000000-0000-0000-0000-000000000003'::uuid, 'private_office', '2026-08-10 08:00:00+07'::timestamptz, '2026-09-10 18:00:00+07'::timestamptz, 'month', 1, true, 'COMPLETED', 9000000, 9000000, 0, 0, 9000000, 'web')
ON CONFLICT (id) DO NOTHING;

INSERT INTO payments (id, booking_id, user_id, provider, method, order_id, amount, status, paid_at, created_at, purpose) VALUES
  ('ea010008-0000-0000-0000-000000000001'::uuid, 'b0010008-0000-0000-0000-000000000001'::uuid, 'd1000001-0000-0000-0000-000000000001'::uuid, 'payos', 'vietqr', 'PAY-HIST-2608-1', 18000000, 'PAID', '2026-07-30 11:00:00+07'::timestamptz, '2026-07-30 10:50:00+07'::timestamptz, 'booking'),
  ('ea010008-0000-0000-0000-000000000002'::uuid, 'b0010008-0000-0000-0000-000000000002'::uuid, 'd1000001-0000-0000-0000-000000000002'::uuid, 'payos', 'vietqr', 'PAY-HIST-2608-2', 1200000, 'PAID', '2026-08-11 15:00:00+07'::timestamptz, '2026-08-11 14:40:00+07'::timestamptz, 'booking'),
  ('ea020008-0000-0000-0000-000000000001'::uuid, 'b0020008-0000-0000-0000-000000000001'::uuid, 'd1000001-0000-0000-0000-000000000003'::uuid, 'payos', 'vietqr', 'PAY-HIST-2608-3', 7500000, 'PAID', '2026-08-04 14:00:00+07'::timestamptz, '2026-08-04 13:55:00+07'::timestamptz, 'booking'),
  ('ea030008-0000-0000-0000-000000000001'::uuid, 'b0030008-0000-0000-0000-000000000001'::uuid, 'd1000001-0000-0000-0000-000000000004'::uuid, 'payos', 'vietqr', 'PAY-HIST-2608-4', 9000000, 'PAID', '2026-08-09 10:00:00+07'::timestamptz, '2026-08-09 09:30:00+07'::timestamptz, 'booking')
ON CONFLICT (id) DO NOTHING;

-- ── Tháng 9/2026 ──
INSERT INTO bookings (id, booking_code, user_id, workspace_id, branch_id, workspace_type_id, start_at, end_at, unit, unit_count, is_contract, status, price_per_unit, subtotal_amount, discount_amount, addon_amount, total_amount, source) VALUES
  ('b0010009-0000-0000-0000-000000000001'::uuid, 'CS-BK-2609-0091', 'd1000001-0000-0000-0000-000000000005'::uuid, 'c1030001-0000-0000-0000-000000000001'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'private_office', '2026-09-01 08:00:00+07'::timestamptz, '2026-10-01 18:00:00+07'::timestamptz, 'month', 1, true, 'COMPLETED', 18000000, 18000000, 0, 0, 18000000, 'web'),
  ('b0010009-0000-0000-0000-000000000002'::uuid, 'CS-BK-2609-0092', 'd1000001-0000-0000-0000-000000000006'::uuid, 'c1020002-0000-0000-0000-000000000002'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'meeting_room', '2026-09-18 08:00:00+07'::timestamptz, '2026-09-18 18:00:00+07'::timestamptz, 'hour', 10, false, 'COMPLETED', 150000, 1500000, 0, 0, 1500000, 'web'),
  ('b0020009-0000-0000-0000-000000000001'::uuid, 'CS-BK-2609-0093', 'd1000001-0000-0000-0000-000000000007'::uuid, 'c2020003-0000-0000-0000-000000000003'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'private_office', '2026-09-05 08:00:00+07'::timestamptz, '2026-10-05 18:00:00+07'::timestamptz, 'month', 1, true, 'COMPLETED', 7500000, 7500000, 0, 0, 7500000, 'web'),
  ('b0030009-0000-0000-0000-000000000001'::uuid, 'CS-BK-2609-0094', 'd1000001-0000-0000-0000-000000000008'::uuid, 'c3020001-0000-0000-0000-000000000001'::uuid, 'b3000000-0000-0000-0000-000000000003'::uuid, 'meeting_room', '2026-09-22 09:00:00+07'::timestamptz, '2026-09-22 17:00:00+07'::timestamptz, 'hour', 8, false, 'COMPLETED', 180000, 1440000, 0, 0, 1440000, 'web')
ON CONFLICT (id) DO NOTHING;

INSERT INTO payments (id, booking_id, user_id, provider, method, order_id, amount, status, paid_at, created_at, purpose) VALUES
  ('ea010009-0000-0000-0000-000000000001'::uuid, 'b0010009-0000-0000-0000-000000000001'::uuid, 'd1000001-0000-0000-0000-000000000005'::uuid, 'payos', 'vietqr', 'PAY-HIST-2609-1', 18000000, 'PAID', '2026-08-30 14:00:00+07'::timestamptz, '2026-08-30 13:45:00+07'::timestamptz, 'booking'),
  ('ea010009-0000-0000-0000-000000000002'::uuid, 'b0010009-0000-0000-0000-000000000002'::uuid, 'd1000001-0000-0000-0000-000000000006'::uuid, 'payos', 'vietqr', 'PAY-HIST-2609-2', 1500000, 'PAID', '2026-09-17 11:00:00+07'::timestamptz, '2026-09-17 10:40:00+07'::timestamptz, 'booking'),
  ('ea020009-0000-0000-0000-000000000001'::uuid, 'b0020009-0000-0000-0000-000000000001'::uuid, 'd1000001-0000-0000-0000-000000000007'::uuid, 'payos', 'vietqr', 'PAY-HIST-2609-3', 7500000, 'PAID', '2026-09-04 16:00:00+07'::timestamptz, '2026-09-04 15:50:00+07'::timestamptz, 'booking'),
  ('ea030009-0000-0000-0000-000000000001'::uuid, 'b0030009-0000-0000-0000-000000000001'::uuid, 'd1000001-0000-0000-0000-000000000008'::uuid, 'payos', 'vietqr', 'PAY-HIST-2609-4', 1440000, 'PAID', '2026-09-21 10:00:00+07'::timestamptz, '2026-09-21 09:30:00+07'::timestamptz, 'booking')
ON CONFLICT (id) DO NOTHING;

COMMIT;
