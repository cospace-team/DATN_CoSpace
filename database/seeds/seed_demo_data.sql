-- =============================================================================
-- CoSpace Seed Script: Demo Data (Bookings, Payments, Users, Services, etc.)
-- PURPOSE: Populate system with realistic demo data for all dashboards
-- DATE: 2026-09-11
-- USAGE: Run AFTER seed_3_branches_9_floors.sql
-- NOTE: Uses NOW()-relative dates so data is always fresh for demos
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. GLOBAL DEFAULT PRICE POLICIES (branch_id = NULL)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO price_policies (id, branch_id, workspace_type_id, duration_unit, price, is_active) VALUES
  -- Desk
  ('d0000001-0000-0000-0000-000000000001'::uuid, NULL, 'a1000000-0000-0000-0000-000000000001'::uuid, 'hour',    25000.00, true),
  ('d0000001-0000-0000-0000-000000000002'::uuid, NULL, 'a1000000-0000-0000-0000-000000000001'::uuid, 'day',    170000.00, true),
  ('d0000001-0000-0000-0000-000000000003'::uuid, NULL, 'a1000000-0000-0000-0000-000000000001'::uuid, 'week',   700000.00, true),
  ('d0000001-0000-0000-0000-000000000004'::uuid, NULL, 'a1000000-0000-0000-0000-000000000001'::uuid, 'month', 2500000.00, true),
  -- Meeting Room
  ('d0000001-0000-0000-0000-000000000005'::uuid, NULL, 'a1000000-0000-0000-0000-000000000002'::uuid, 'hour',   100000.00, true),
  ('d0000001-0000-0000-0000-000000000006'::uuid, NULL, 'a1000000-0000-0000-0000-000000000002'::uuid, 'day',    700000.00, true),
  ('d0000001-0000-0000-0000-000000000007'::uuid, NULL, 'a1000000-0000-0000-0000-000000000002'::uuid, 'week',  2800000.00, true),
  ('d0000001-0000-0000-0000-000000000008'::uuid, NULL, 'a1000000-0000-0000-0000-000000000002'::uuid, 'month',10000000.00, true),
  -- Private Office
  ('d0000001-0000-0000-0000-000000000009'::uuid, NULL, 'a1000000-0000-0000-0000-000000000003'::uuid, 'hour',   200000.00, true),
  ('d0000001-0000-0000-0000-000000000010'::uuid, NULL, 'a1000000-0000-0000-0000-000000000003'::uuid, 'day',   1500000.00, true),
  ('d0000001-0000-0000-0000-000000000011'::uuid, NULL, 'a1000000-0000-0000-0000-000000000003'::uuid, 'week',  5000000.00, true),
  ('d0000001-0000-0000-0000-000000000012'::uuid, NULL, 'a1000000-0000-0000-0000-000000000003'::uuid, 'month',18000000.00, true)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. EXTRA SERVICES (Đầy đủ cả BẬT & TẮT, Toàn hệ thống & Ghi đè chi nhánh)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO extra_services (id, branch_id, code, name, service_type, unit, price, is_active, description) VALUES
  -- Global Defaults (Đang BẬT)
  ('e0000001-0000-0000-0000-000000000001'::uuid, NULL, 'cafe-latte',    'Cà Phê Latte Sữa Tươi',         'drink',    'ly',    35000.00, true, 'Latte pha máy từ hạt Arabica Cầu Đất nguyên chất'),
  ('e0000001-0000-0000-0000-000000000002'::uuid, NULL, 'tra-dao',       'Trà Đào Cam Sả Tươi',           'drink',    'ly',    40000.00, true, 'Trà đào thanh nhiệt kèm miếng đào giòn và sả tươi'),
  ('e0000001-0000-0000-0000-000000000003'::uuid, NULL, 'nuoc-ep',       'Nước Ép Trái Cây Tươi',          'drink',    'ly',    45000.00, true, 'Nước ép cam / dưa hấu / ổi nguyên chất 100%'),
  ('e0000001-0000-0000-0000-000000000004'::uuid, NULL, 'in-trang-den',  'In Ấn Trắng Đen A4',             'printing', 'trang',  1000.00, true, 'In ấn laser tài liệu văn phòng giấy Double A 80gsm'),
  ('e0000001-0000-0000-0000-000000000005'::uuid, NULL, 'in-mau',        'In Ấn Màu Laser A4',             'printing', 'trang',  3000.00, true, 'In màu sắc nét cho báo cáo, biểu đồ, profile'),
  ('e0000001-0000-0000-0000-000000000006'::uuid, NULL, 'banh-mi',       'Bánh Mì Thịt Nguội & Pate',      'meal',     'phần',  30000.00, true, 'Bánh mì giòn nóng kèm pate, chả lụa và dưa góp'),
  ('e0000001-0000-0000-0000-000000000007'::uuid, NULL, 'com-trua',      'Cơm Trưa Văn Phòng Healthy',     'meal',     'phần',  55000.00, true, 'Set cơm trưa cân bằng dinh dưỡng thay đổi mỗi ngày'),
  ('e0000001-0000-0000-0000-000000000008'::uuid, NULL, 'may-chieu-4k',  'Máy Chiếu 4K & Màn Chiếu 150in', 'equipment', 'giờ',  150000.00, true, 'Máy chiếu laser 4K siêu nét hỗ trợ HDMI & Không dây'),
  ('e0000001-0000-0000-0000-000000000009'::uuid, NULL, 'smart-board',   'Bảng Tương Tác Cảm Ứng 75in',    'equipment', 'giờ',  100000.00, true, 'Bảng viết cảm ứng đa điểm hỗ trợ lưu file & họp online'),

  -- Global Defaults (Đang TẮT - Dành cho demo tính năng Bật/Tắt)
  ('e0000001-0000-0000-0000-000000000021'::uuid, NULL, 'teabreak-vip',  'Gói Tiệc Trà Teabreak Cao Cấp',  'meal',     'phần', 120000.00, false, 'Tạm ngưng do đối tác bánh bảo trì hệ thống bếp'),
  ('e0000001-0000-0000-0000-000000000022'::uuid, NULL, 'do-xe-oto',     'Chỗ Đỗ Xe Ô Tô Tầng Hầm B2',     'facility', 'ngày', 150000.00, false, 'Tạm ngưng phục vụ do hầm xe đang bảo dưỡng sơn sàn'),
  ('e0000001-0000-0000-0000-000000000023'::uuid, NULL, 'livestream-kit', 'Bộ Livestream & Hội Thảo 4K',   'equipment', 'buổi', 500000.00, false, 'Tạm ngưng do đang nâng cấp firmware thiết bị'),

  -- Branch 1 (Q1) Ghi đè & Riêng biệt
  ('e0000001-0000-0000-0000-000000000011'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'cafe-latte',   'Cà Phê Latte Pha Máy Premium Q1', 'drink',    'ly',    45000.00, true,  'Phiên bản Latte đặc biệt cho chi nhánh Quận 1'),
  ('e0000001-0000-0000-0000-000000000012'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'combo-sang',   'Combo Sáng Q1 (Bánh Mì + Cafe Đá)', 'meal',  'phần',  65000.00, true,  'Bữa sáng tiện lợi cho thành viên chi nhánh Q1'),
  ('e0000001-0000-0000-0000-000000000013'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'podcast-room', 'Phòng Thu Podcast Mini Q1',         'facility','giờ',  250000.00, false, 'Đang hoàn thiện cách âm, sắp ra mắt tại Q1'),

  -- Branch 2 (Q3) Ghi đè & Riêng biệt
  ('e0000001-0000-0000-0000-000000000031'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'tra-dao',      'Trà Đào Hạt Chia Q3',             'drink',    'ly',    38000.00, true,  'Trà đào thơm mát giảm giá riêng cho Q3'),
  ('e0000001-0000-0000-0000-000000000032'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'may-chieu-4k', 'Máy Chiếu Hội Thảo Q3',          'equipment','giờ',  120000.00, true,  'Mức giá ưu đãi cho phòng họp tại Q3')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  service_type = EXCLUDED.service_type,
  unit = EXCLUDED.unit,
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  description = EXCLUDED.description;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CANCELLATION POLICIES (Đầy đủ 5 bậc logic, Toàn hệ thống & Ghi đè chi nhánh)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO cancellation_policies (id, name, rule_type, min_value, max_value, refund_percent, priority, branch_id, workspace_type_id, is_active, effective_from) VALUES
  -- Bậc 1 (Grace Period): Trong vòng 2 giờ kể từ khi tạo đơn -> Hoàn 100%
  ('f0000001-0000-0000-0000-000000000001'::uuid, 'Miễn phí hủy trong 2 giờ đầu (Grace Period)',   'GRACE_HOURS',        0,   2, 100.00, 300, NULL, NULL, true,  '2026-01-01T00:00:00Z'),
  -- Bậc 2 (Hủy rất sớm): Trước 7 ngày trở lên -> Hoàn 90% (Phí xử lý 10%)
  ('f0000001-0000-0000-0000-000000000002'::uuid, 'Hủy trước 7 ngày (Hoàn 90% - Phí 10%)',         'BEFORE_START_DAYS',  7, 999,  90.00, 250, NULL, NULL, true,  '2026-01-01T00:00:00Z'),
  -- Bậc 3 (Hủy tiêu chuẩn): Trước 3 đến 7 ngày -> Hoàn 70% (Phí giữ chỗ 30%)
  ('f0000001-0000-0000-0000-000000000003'::uuid, 'Hủy trước 3 - 7 ngày (Hoàn 70% - Phí 30%)',     'BEFORE_START_DAYS',  3,   7,  70.00, 200, NULL, NULL, true,  '2026-01-01T00:00:00Z'),
  -- Bậc 4 (Hủy cận ngày): Trước 1 đến 3 ngày -> Hoàn 50% (Phí 50%)
  ('f0000001-0000-0000-0000-000000000004'::uuid, 'Hủy trước 1 - 3 ngày (Hoàn 50% - Phí 50%)',     'BEFORE_START_DAYS',  1,   3,  50.00, 150, NULL, NULL, true,  '2026-01-01T00:00:00Z'),
  -- Bậc 5 (Hủy gấp): Trong vòng 24 giờ trước nhận phòng -> Hoàn 0%
  ('f0000001-0000-0000-0000-000000000005'::uuid, 'Hủy sát giờ trong 24h (Không hoàn tiền)',        'BEFORE_START_DAYS',  0,   1,   0.00, 100, NULL, NULL, true,  '2026-01-01T00:00:00Z'),

  -- Chi nhánh 1 (Q1) Ghi đè ưu đãi VIP:
  ('f0000001-0000-0000-0000-000000000006'::uuid, 'Q1 Đặc quyền: Miễn phí hủy trong 4 giờ đầu',     'GRACE_HOURS',        0,   4, 100.00, 350, 'b1000000-0000-0000-0000-000000000001'::uuid, NULL, true, '2026-01-01T00:00:00Z'),
  ('f0000001-0000-0000-0000-000000000007'::uuid, 'Q1 Hỗ trợ sát giờ (Hoàn 20% phí)',              'BEFORE_START_DAYS',  0,   1,  20.00, 120, 'b1000000-0000-0000-0000-000000000001'::uuid, NULL, true, '2026-01-01T00:00:00Z'),

  -- Chính sách TẠM NGƯNG (is_active = false) để demo Bật/Tắt chính sách:
  ('f0000001-0000-0000-0000-000000000008'::uuid, 'Khuyến mại hè: Hủy trước 2 ngày hoàn 80% (Tắt)', 'BEFORE_START_DAYS',  2,   5,  80.00, 180, NULL, NULL, false, '2026-01-01T00:00:00Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  rule_type = EXCLUDED.rule_type,
  min_value = EXCLUDED.min_value,
  max_value = EXCLUDED.max_value,
  refund_percent = EXCLUDED.refund_percent,
  priority = EXCLUDED.priority,
  is_active = EXCLUDED.is_active;

-- Ensure password column exists on users for self-hosted auth compatibility
ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. DEMO CUSTOMER ACCOUNTS (10 customers)
-- Password for all demo accounts is: Staff@123
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO users (id, email, password, password_hash, full_name, phone, role, branch_id, status, membership_tier) VALUES
  ('d1000001-0000-0000-0000-000000000001'::uuid, 'nguyenvana@demo.cospace.vn',  '$2a$10$dVOBfTMSFcVEPNA.asw9NOmIWG1E4z9ImH5POUwWRRRLX39lqF9Oq', '$2a$10$dVOBfTMSFcVEPNA.asw9NOmIWG1E4z9ImH5POUwWRRRLX39lqF9Oq', 'Nguyễn Văn An',     '0901000001', 'customer', NULL, 'active', 'standard'),
  ('d1000001-0000-0000-0000-000000000002'::uuid, 'tranthib@demo.cospace.vn',    '$2a$10$dVOBfTMSFcVEPNA.asw9NOmIWG1E4z9ImH5POUwWRRRLX39lqF9Oq', '$2a$10$dVOBfTMSFcVEPNA.asw9NOmIWG1E4z9ImH5POUwWRRRLX39lqF9Oq', 'Trần Thị Bình',     '0901000002', 'customer', NULL, 'active', 'standard'),
  ('d1000001-0000-0000-0000-000000000003'::uuid, 'lequocc@demo.cospace.vn',     '$2a$10$dVOBfTMSFcVEPNA.asw9NOmIWG1E4z9ImH5POUwWRRRLX39lqF9Oq', '$2a$10$dVOBfTMSFcVEPNA.asw9NOmIWG1E4z9ImH5POUwWRRRLX39lqF9Oq', 'Lê Quốc Cường',     '0901000003', 'customer', NULL, 'active', 'standard'),
  ('d1000001-0000-0000-0000-000000000004'::uuid, 'phamthid@demo.cospace.vn',    '$2a$10$dVOBfTMSFcVEPNA.asw9NOmIWG1E4z9ImH5POUwWRRRLX39lqF9Oq', '$2a$10$dVOBfTMSFcVEPNA.asw9NOmIWG1E4z9ImH5POUwWRRRLX39lqF9Oq', 'Phạm Thị Dung',     '0901000004', 'customer', NULL, 'active', 'standard'),
  ('d1000001-0000-0000-0000-000000000005'::uuid, 'hoange@demo.cospace.vn',      '$2a$10$dVOBfTMSFcVEPNA.asw9NOmIWG1E4z9ImH5POUwWRRRLX39lqF9Oq', '$2a$10$dVOBfTMSFcVEPNA.asw9NOmIWG1E4z9ImH5POUwWRRRLX39lqF9Oq', 'Hoàng Minh Em',     '0901000005', 'customer', NULL, 'active', 'standard'),
  ('d1000001-0000-0000-0000-000000000006'::uuid, 'vuthif@demo.cospace.vn',      '$2a$10$dVOBfTMSFcVEPNA.asw9NOmIWG1E4z9ImH5POUwWRRRLX39lqF9Oq', '$2a$10$dVOBfTMSFcVEPNA.asw9NOmIWG1E4z9ImH5POUwWRRRLX39lqF9Oq', 'Vũ Thị Phương',     '0901000006', 'customer', NULL, 'active', 'standard'),
  ('d1000001-0000-0000-0000-000000000007'::uuid, 'dangvang@demo.cospace.vn',    '$2a$10$dVOBfTMSFcVEPNA.asw9NOmIWG1E4z9ImH5POUwWRRRLX39lqF9Oq', '$2a$10$dVOBfTMSFcVEPNA.asw9NOmIWG1E4z9ImH5POUwWRRRLX39lqF9Oq', 'Đặng Văn Giang',    '0901000007', 'customer', NULL, 'active', 'standard'),
  ('d1000001-0000-0000-0000-000000000008'::uuid, 'buithih@demo.cospace.vn',     '$2a$10$dVOBfTMSFcVEPNA.asw9NOmIWG1E4z9ImH5POUwWRRRLX39lqF9Oq', '$2a$10$dVOBfTMSFcVEPNA.asw9NOmIWG1E4z9ImH5POUwWRRRLX39lqF9Oq', 'Bùi Thị Hồng',      '0901000008', 'customer', NULL, 'active', 'standard'),
  ('d1000001-0000-0000-0000-000000000009'::uuid, 'doanvani@demo.cospace.vn',    '$2a$10$dVOBfTMSFcVEPNA.asw9NOmIWG1E4z9ImH5POUwWRRRLX39lqF9Oq', '$2a$10$dVOBfTMSFcVEPNA.asw9NOmIWG1E4z9ImH5POUwWRRRLX39lqF9Oq', 'Đoàn Văn Khôi',     '0901000009', 'customer', NULL, 'active', 'standard'),
  ('d1000001-0000-0000-0000-000000000010'::uuid, 'ngothik@demo.cospace.vn',     '$2a$10$dVOBfTMSFcVEPNA.asw9NOmIWG1E4z9ImH5POUwWRRRLX39lqF9Oq', '$2a$10$dVOBfTMSFcVEPNA.asw9NOmIWG1E4z9ImH5POUwWRRRLX39lqF9Oq', 'Ngô Thị Kim Liên',  '0901000010', 'customer', NULL, 'active', 'standard')
ON CONFLICT (id) DO UPDATE SET
  password = EXCLUDED.password,
  password_hash = EXCLUDED.password_hash;

-- Profiles for demo customers
INSERT INTO profiles (user_id, bio, profession, company, contact_email, contact_public, primary_branch_id) VALUES
  ('d1000001-0000-0000-0000-000000000001'::uuid, 'Full-stack developer yêu thích StartUp và AI', 'Software Engineer', 'TechViet JSC', 'an@techviet.vn', true, 'b1000000-0000-0000-0000-000000000001'::uuid),
  ('d1000001-0000-0000-0000-000000000002'::uuid, 'UX Designer đam mê trải nghiệm người dùng', 'UX Designer', 'DesignStudio', 'binh@designstudio.vn', true, 'b1000000-0000-0000-0000-000000000001'::uuid),
  ('d1000001-0000-0000-0000-000000000003'::uuid, 'Freelancer chuyên về Marketing Digital', 'Digital Marketer', 'Freelance', 'cuong@gmail.com', true, 'b2000000-0000-0000-0000-000000000002'::uuid),
  ('d1000001-0000-0000-0000-000000000004'::uuid, 'Nhà sáng lập startup Edu-Tech', 'CEO / Founder', 'EduSpark', 'dung@eduspark.vn', true, 'b1000000-0000-0000-0000-000000000001'::uuid),
  ('d1000001-0000-0000-0000-000000000005'::uuid, 'Data Analyst yêu thích big data', 'Data Analyst', 'DataVN', 'em@datavn.io', false, 'b2000000-0000-0000-0000-000000000002'::uuid),
  ('d1000001-0000-0000-0000-000000000006'::uuid, 'Content Writer và Blogger', 'Content Creator', 'Freelance', 'phuong@blog.vn', true, 'b3000000-0000-0000-0000-000000000003'::uuid),
  ('d1000001-0000-0000-0000-000000000007'::uuid, 'Backend Developer, thích Go và Rust', 'Senior Developer', 'CloudNine', 'giang@cloudnine.dev', true, 'b1000000-0000-0000-0000-000000000001'::uuid),
  ('d1000001-0000-0000-0000-000000000008'::uuid, 'Product Manager với 5 năm kinh nghiệm', 'Product Manager', 'VNTech', 'hong@vntech.vn', true, 'b2000000-0000-0000-0000-000000000002'::uuid),
  ('d1000001-0000-0000-0000-000000000009'::uuid, 'Mobile developer React Native & Flutter', 'Mobile Developer', 'AppFactory', 'khoi@appfactory.vn', false, 'b3000000-0000-0000-0000-000000000003'::uuid),
  ('d1000001-0000-0000-0000-000000000010'::uuid, 'HR Manager, kết nối con người', 'HR Manager', 'PeopleFirst', 'lien@peoplefirst.vn', true, 'b1000000-0000-0000-0000-000000000001'::uuid)
ON CONFLICT (user_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. DEMO STAFF & ADMIN ACCOUNTS
-- Password for all staff & admin accounts is: Staff@123
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO users (id, email, password, password_hash, full_name, phone, role, branch_id, status) VALUES
  -- Branch Admins (password: Staff@123)
  ('d2000001-0000-0000-0000-000000000001'::uuid, 'admin.q1@cospace.vn', '$2a$10$dVOBfTMSFcVEPNA.asw9NOmIWG1E4z9ImH5POUwWRRRLX39lqF9Oq', '$2a$10$dVOBfTMSFcVEPNA.asw9NOmIWG1E4z9ImH5POUwWRRRLX39lqF9Oq', 'Lê Thị Quản Lý (Q1)', '0909000001', 'branch_admin', 'b1000000-0000-0000-0000-000000000001'::uuid, 'active'),
  ('d2000001-0000-0000-0000-000000000002'::uuid, 'admin.q3@cospace.vn', '$2a$10$dVOBfTMSFcVEPNA.asw9NOmIWG1E4z9ImH5POUwWRRRLX39lqF9Oq', '$2a$10$dVOBfTMSFcVEPNA.asw9NOmIWG1E4z9ImH5POUwWRRRLX39lqF9Oq', 'Trần Văn Quản Lý (Q3)', '0909000002', 'branch_admin', 'b2000000-0000-0000-0000-000000000002'::uuid, 'active'),
  ('d2000001-0000-0000-0000-000000000003'::uuid, 'admin.td@cospace.vn', '$2a$10$dVOBfTMSFcVEPNA.asw9NOmIWG1E4z9ImH5POUwWRRRLX39lqF9Oq', '$2a$10$dVOBfTMSFcVEPNA.asw9NOmIWG1E4z9ImH5POUwWRRRLX39lqF9Oq', 'Phạm Quản Lý (TĐ)', '0909000003', 'branch_admin', 'b3000000-0000-0000-0000-000000000003'::uuid, 'active'),
  -- Staff (password: Staff@123)
  ('d3000001-0000-0000-0000-000000000001'::uuid, 'staff1.q1@cospace.vn', '$2a$10$dVOBfTMSFcVEPNA.asw9NOmIWG1E4z9ImH5POUwWRRRLX39lqF9Oq', '$2a$10$dVOBfTMSFcVEPNA.asw9NOmIWG1E4z9ImH5POUwWRRRLX39lqF9Oq', 'Nguyễn Nhân Viên (Q1)', '0908000001', 'staff', 'b1000000-0000-0000-0000-000000000001'::uuid, 'active'),
  ('d3000001-0000-0000-0000-000000000002'::uuid, 'staff1.q3@cospace.vn', '$2a$10$dVOBfTMSFcVEPNA.asw9NOmIWG1E4z9ImH5POUwWRRRLX39lqF9Oq', '$2a$10$dVOBfTMSFcVEPNA.asw9NOmIWG1E4z9ImH5POUwWRRRLX39lqF9Oq', 'Trần Nhân Viên (Q3)', '0908000002', 'staff', 'b2000000-0000-0000-0000-000000000002'::uuid, 'active'),
  ('d3000001-0000-0000-0000-000000000003'::uuid, 'staff1.td@cospace.vn', '$2a$10$dVOBfTMSFcVEPNA.asw9NOmIWG1E4z9ImH5POUwWRRRLX39lqF9Oq', '$2a$10$dVOBfTMSFcVEPNA.asw9NOmIWG1E4z9ImH5POUwWRRRLX39lqF9Oq', 'Lê Nhân Viên (TĐ)', '0908000003', 'staff', 'b3000000-0000-0000-0000-000000000003'::uuid, 'active'),
  -- Super Admin (password: Superadmin@123)
  ('d4000001-0000-0000-0000-000000000001'::uuid, 'superadmin@cospace.vn', '$2a$10$QmEXTFf7BXDrI0Avr3thseP83npyh.25s7BNZp0KBx7oNKAM32Bgi', '$2a$10$QmEXTFf7BXDrI0Avr3thseP83npyh.25s7BNZp0KBx7oNKAM32Bgi', 'Admin Hệ Thống', '0900000001', 'super_admin', NULL, 'active')
ON CONFLICT (id) DO UPDATE SET
  password = EXCLUDED.password,
  password_hash = EXCLUDED.password_hash;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. DEMO BOOKINGS (40+ bookings across 3 branches, various statuses)
-- Uses NOW()-relative timestamps so data is always "fresh" for demo
-- ─────────────────────────────────────────────────────────────────────────────

-- === BRANCH 1 (Q1) — 18 bookings ===

-- TODAY's bookings (for Staff Dashboard) — CONFIRMED, waiting check-in
INSERT INTO bookings (id, booking_code, user_id, workspace_id, branch_id, workspace_type_id, start_at, end_at, unit, unit_count, is_contract, status, price_per_unit, subtotal_amount, discount_amount, addon_amount, total_amount, source) VALUES
  ('b0010001-0000-0000-0000-000000000001'::uuid, 'CS-BK-2609-0001', 'd1000001-0000-0000-0000-000000000001'::uuid, 'c1010001-0000-0000-0000-000000000001'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'desk', (CURRENT_DATE + TIME '08:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE + TIME '12:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'hour', 4, false, 'CONFIRMED', 30000, 120000, 0, 0, 120000, 'web'),
  ('b0010001-0000-0000-0000-000000000002'::uuid, 'CS-BK-2609-0002', 'd1000001-0000-0000-0000-000000000002'::uuid, 'c1020003-0000-0000-0000-000000000003'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'desk', (CURRENT_DATE + TIME '09:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE + TIME '17:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'day', 1, false, 'CONFIRMED', 200000, 200000, 0, 0, 200000, 'web'),
  ('b0010001-0000-0000-0000-000000000003'::uuid, 'CS-BK-2609-0003', 'd1000001-0000-0000-0000-000000000004'::uuid, 'c1020001-0000-0000-0000-000000000001'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'meeting_room', (CURRENT_DATE + TIME '14:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE + TIME '16:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'hour', 2, false, 'CONFIRMED', 150000, 300000, 0, 0, 300000, 'web'),

-- TODAY's bookings — CHECKED_IN (currently seated)
  ('b0010001-0000-0000-0000-000000000004'::uuid, 'CS-BK-2609-0004', 'd1000001-0000-0000-0000-000000000003'::uuid, 'c1010003-0000-0000-0000-000000000003'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'desk', (CURRENT_DATE + TIME '08:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE + TIME '18:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'day', 1, false, 'CHECKED_IN', 200000, 200000, 0, 35000, 235000, 'counter'),
  ('b0010001-0000-0000-0000-000000000005'::uuid, 'CS-BK-2609-0005', 'd1000001-0000-0000-0000-000000000007'::uuid, 'c1010004-0000-0000-0000-000000000004'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'desk', (CURRENT_DATE + TIME '07:30:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE + TIME '17:30:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'day', 1, false, 'CHECKED_IN', 200000, 200000, 0, 0, 200000, 'web'),

-- Contract booking spanning today (weekly — started 3 days ago, ends in 4 days)
  ('b0010001-0000-0000-0000-000000000006'::uuid, 'CS-BK-2609-0006', 'd1000001-0000-0000-0000-000000000010'::uuid, 'c1030001-0000-0000-0000-000000000001'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'private_office', (CURRENT_DATE - INTERVAL '3 days' + TIME '08:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE + INTERVAL '4 days' + TIME '18:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'week', 1, true, 'CHECKED_IN', 5000000, 5000000, 0, 0, 5000000, 'web'),

-- Yesterday COMPLETED bookings
  ('b0010001-0000-0000-0000-000000000007'::uuid, 'CS-BK-2609-0007', 'd1000001-0000-0000-0000-000000000001'::uuid, 'c1010001-0000-0000-0000-000000000001'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'desk', (CURRENT_DATE - INTERVAL '1 day' + TIME '09:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE - INTERVAL '1 day' + TIME '17:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'day', 1, false, 'COMPLETED', 200000, 200000, 0, 40000, 240000, 'web'),
  ('b0010001-0000-0000-0000-000000000008'::uuid, 'CS-BK-2609-0008', 'd1000001-0000-0000-0000-000000000005'::uuid, 'c1020001-0000-0000-0000-000000000001'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'meeting_room', (CURRENT_DATE - INTERVAL '1 day' + TIME '10:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE - INTERVAL '1 day' + TIME '12:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'hour', 2, false, 'COMPLETED', 150000, 300000, 0, 0, 300000, 'web'),

-- Last 7 days COMPLETED
  ('b0010001-0000-0000-0000-000000000009'::uuid, 'CS-BK-2609-0009', 'd1000001-0000-0000-0000-000000000002'::uuid, 'c1010003-0000-0000-0000-000000000003'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'desk', (CURRENT_DATE - INTERVAL '3 days' + TIME '08:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE - INTERVAL '3 days' + TIME '18:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'day', 1, false, 'COMPLETED', 200000, 200000, 0, 55000, 255000, 'web'),
  ('b0010001-0000-0000-0000-000000000010'::uuid, 'CS-BK-2609-0010', 'd1000001-0000-0000-0000-000000000006'::uuid, 'c1010004-0000-0000-0000-000000000004'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'desk', (CURRENT_DATE - INTERVAL '4 days' + TIME '09:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE - INTERVAL '4 days' + TIME '15:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'hour', 6, false, 'COMPLETED', 30000, 180000, 0, 0, 180000, 'counter'),
  ('b0010001-0000-0000-0000-000000000011'::uuid, 'CS-BK-2609-0011', 'd1000001-0000-0000-0000-000000000008'::uuid, 'c1020002-0000-0000-0000-000000000002'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'meeting_room', (CURRENT_DATE - INTERVAL '5 days' + TIME '14:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE - INTERVAL '5 days' + TIME '17:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'hour', 3, false, 'COMPLETED', 150000, 450000, 0, 80000, 530000, 'web'),

-- Last 30 days COMPLETED (for monthly reports)
  ('b0010001-0000-0000-0000-000000000012'::uuid, 'CS-BK-2609-0012', 'd1000001-0000-0000-0000-000000000004'::uuid, 'c1030002-0000-0000-0000-000000000002'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'private_office', (CURRENT_DATE - INTERVAL '15 days') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE - INTERVAL '15 days' + INTERVAL '1 month') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'month', 1, true, 'CONFIRMED', 8000000, 8000000, 0, 0, 8000000, 'web'),
  ('b0010001-0000-0000-0000-000000000013'::uuid, 'CS-BK-2609-0013', 'd1000001-0000-0000-0000-000000000009'::uuid, 'c1010005-0000-0000-0000-000000000005'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'desk', (CURRENT_DATE - INTERVAL '10 days' + TIME '08:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE - INTERVAL '10 days' + TIME '16:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'day', 1, false, 'COMPLETED', 200000, 200000, 0, 0, 200000, 'web'),
  ('b0010001-0000-0000-0000-000000000014'::uuid, 'CS-BK-2609-0014', 'd1000001-0000-0000-0000-000000000003'::uuid, 'c1010001-0000-0000-0000-000000000001'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'desk', (CURRENT_DATE - INTERVAL '20 days' + TIME '09:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE - INTERVAL '20 days' + TIME '17:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'day', 1, false, 'COMPLETED', 200000, 200000, 0, 30000, 230000, 'web'),

-- CANCELLED bookings (for cancellation reports)
  ('b0010001-0000-0000-0000-000000000015'::uuid, 'CS-BK-2609-0015', 'd1000001-0000-0000-0000-000000000005'::uuid, 'c1010002-0000-0000-0000-000000000002'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'desk', (CURRENT_DATE - INTERVAL '2 days' + TIME '10:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE - INTERVAL '2 days' + TIME '14:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'hour', 4, false, 'CANCELLED', 30000, 120000, 0, 0, 120000, 'web'),
  ('b0010001-0000-0000-0000-000000000016'::uuid, 'CS-BK-2609-0016', 'd1000001-0000-0000-0000-000000000006'::uuid, 'c1020001-0000-0000-0000-000000000001'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'meeting_room', (CURRENT_DATE - INTERVAL '6 days' + TIME '09:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE - INTERVAL '6 days' + TIME '11:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'hour', 2, false, 'CANCELLED', 150000, 300000, 0, 0, 300000, 'web'),

-- Future booking
  ('b0010001-0000-0000-0000-000000000017'::uuid, 'CS-BK-2609-0017', 'd1000001-0000-0000-0000-000000000001'::uuid, 'c1020002-0000-0000-0000-000000000002'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'meeting_room', (CURRENT_DATE + INTERVAL '2 days' + TIME '10:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE + INTERVAL '2 days' + TIME '12:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'hour', 2, false, 'CONFIRMED', 150000, 300000, 0, 0, 300000, 'web'),

-- EXPIRED booking
  ('b0010001-0000-0000-0000-000000000018'::uuid, 'CS-BK-2609-0018', 'd1000001-0000-0000-0000-000000000008'::uuid, 'c1010005-0000-0000-0000-000000000005'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'desk', (CURRENT_DATE - INTERVAL '1 day' + TIME '14:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE - INTERVAL '1 day' + TIME '18:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'hour', 4, false, 'EXPIRED', 30000, 120000, 0, 0, 120000, 'web')
ON CONFLICT (id) DO NOTHING;

-- === BRANCH 2 (Q3) — 12 bookings ===
INSERT INTO bookings (id, booking_code, user_id, workspace_id, branch_id, workspace_type_id, start_at, end_at, unit, unit_count, is_contract, status, price_per_unit, subtotal_amount, discount_amount, addon_amount, total_amount, source) VALUES
  -- Today
  ('b0020001-0000-0000-0000-000000000001'::uuid, 'CS-BK-2609-0019', 'd1000001-0000-0000-0000-000000000003'::uuid, 'c2010001-0000-0000-0000-000000000001'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'desk', (CURRENT_DATE + TIME '08:30:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE + TIME '16:30:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'day', 1, false, 'CHECKED_IN', 180000, 180000, 0, 40000, 220000, 'web'),
  ('b0020001-0000-0000-0000-000000000002'::uuid, 'CS-BK-2609-0020', 'd1000001-0000-0000-0000-000000000005'::uuid, 'c2010002-0000-0000-0000-000000000002'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'desk', (CURRENT_DATE + TIME '09:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE + TIME '13:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'hour', 4, false, 'CONFIRMED', 25000, 100000, 0, 0, 100000, 'web'),
  ('b0020001-0000-0000-0000-000000000003'::uuid, 'CS-BK-2609-0021', 'd1000001-0000-0000-0000-000000000008'::uuid, 'c2010003-0000-0000-0000-000000000003'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'meeting_room', (CURRENT_DATE + TIME '14:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE + TIME '17:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'hour', 3, false, 'CONFIRMED', 120000, 360000, 0, 0, 360000, 'web'),
  -- Past completed
  ('b0020001-0000-0000-0000-000000000004'::uuid, 'CS-BK-2609-0022', 'd1000001-0000-0000-0000-000000000003'::uuid, 'c2010001-0000-0000-0000-000000000001'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'desk', (CURRENT_DATE - INTERVAL '2 days' + TIME '08:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE - INTERVAL '2 days' + TIME '18:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'day', 1, false, 'COMPLETED', 180000, 180000, 0, 0, 180000, 'web'),
  ('b0020001-0000-0000-0000-000000000005'::uuid, 'CS-BK-2609-0023', 'd1000001-0000-0000-0000-000000000005'::uuid, 'c2020001-0000-0000-0000-000000000001'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'meeting_room', (CURRENT_DATE - INTERVAL '3 days' + TIME '10:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE - INTERVAL '3 days' + TIME '12:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'hour', 2, false, 'COMPLETED', 120000, 240000, 0, 45000, 285000, 'web'),
  ('b0020001-0000-0000-0000-000000000006'::uuid, 'CS-BK-2609-0024', 'd1000001-0000-0000-0000-000000000008'::uuid, 'c2010002-0000-0000-0000-000000000002'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'desk', (CURRENT_DATE - INTERVAL '5 days' + TIME '09:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE - INTERVAL '5 days' + TIME '17:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'day', 1, false, 'COMPLETED', 180000, 180000, 0, 0, 180000, 'web'),
  ('b0020001-0000-0000-0000-000000000007'::uuid, 'CS-BK-2609-0025', 'd1000001-0000-0000-0000-000000000002'::uuid, 'c2020002-0000-0000-0000-000000000002'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'meeting_room', (CURRENT_DATE - INTERVAL '7 days' + TIME '13:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE - INTERVAL '7 days' + TIME '16:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'hour', 3, false, 'COMPLETED', 120000, 360000, 0, 0, 360000, 'web'),
  -- Monthly contract
  ('b0020001-0000-0000-0000-000000000008'::uuid, 'CS-BK-2609-0026', 'd1000001-0000-0000-0000-000000000009'::uuid, 'c2020003-0000-0000-0000-000000000003'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'private_office', (CURRENT_DATE - INTERVAL '10 days') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE + INTERVAL '20 days') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'month', 1, true, 'CONFIRMED', 7500000, 7500000, 0, 0, 7500000, 'web'),
  -- Cancelled
  ('b0020001-0000-0000-0000-000000000009'::uuid, 'CS-BK-2609-0027', 'd1000001-0000-0000-0000-000000000006'::uuid, 'c2010001-0000-0000-0000-000000000001'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'desk', (CURRENT_DATE - INTERVAL '4 days' + TIME '08:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE - INTERVAL '4 days' + TIME '12:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'hour', 4, false, 'CANCELLED', 25000, 100000, 0, 0, 100000, 'web'),
  -- Old completed (for reports)
  ('b0020001-0000-0000-0000-000000000010'::uuid, 'CS-BK-2609-0028', 'd1000001-0000-0000-0000-000000000004'::uuid, 'c2010001-0000-0000-0000-000000000001'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'desk', (CURRENT_DATE - INTERVAL '14 days' + TIME '09:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE - INTERVAL '14 days' + TIME '17:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'day', 1, false, 'COMPLETED', 180000, 180000, 0, 55000, 235000, 'web'),
  ('b0020001-0000-0000-0000-000000000011'::uuid, 'CS-BK-2609-0029', 'd1000001-0000-0000-0000-000000000007'::uuid, 'c2020001-0000-0000-0000-000000000001'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'meeting_room', (CURRENT_DATE - INTERVAL '21 days' + TIME '10:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE - INTERVAL '21 days' + TIME '15:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'hour', 5, false, 'COMPLETED', 120000, 600000, 0, 0, 600000, 'web'),
  ('b0020001-0000-0000-0000-000000000012'::uuid, 'CS-BK-2609-0030', 'd1000001-0000-0000-0000-000000000001'::uuid, 'c2010002-0000-0000-0000-000000000002'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'desk', (CURRENT_DATE - INTERVAL '25 days' + TIME '08:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE - INTERVAL '25 days' + TIME '16:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'day', 1, false, 'COMPLETED', 180000, 180000, 0, 0, 180000, 'web')
ON CONFLICT (id) DO NOTHING;

-- === BRANCH 3 (Thủ Đức) — 10 bookings ===
INSERT INTO bookings (id, booking_code, user_id, workspace_id, branch_id, workspace_type_id, start_at, end_at, unit, unit_count, is_contract, status, price_per_unit, subtotal_amount, discount_amount, addon_amount, total_amount, source) VALUES
  -- Today
  ('b0030001-0000-0000-0000-000000000001'::uuid, 'CS-BK-2609-0031', 'd1000001-0000-0000-0000-000000000006'::uuid, 'c3010001-0000-0000-0000-000000000001'::uuid, 'b3000000-0000-0000-0000-000000000003'::uuid, 'desk', (CURRENT_DATE + TIME '08:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE + TIME '17:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'day', 1, false, 'CONFIRMED', 220000, 220000, 0, 0, 220000, 'web'),
  ('b0030001-0000-0000-0000-000000000002'::uuid, 'CS-BK-2609-0032', 'd1000001-0000-0000-0000-000000000009'::uuid, 'c3010002-0000-0000-0000-000000000002'::uuid, 'b3000000-0000-0000-0000-000000000003'::uuid, 'desk', (CURRENT_DATE + TIME '09:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE + TIME '15:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'hour', 6, false, 'CHECKED_IN', 35000, 210000, 0, 0, 210000, 'counter'),
  -- Past completed
  ('b0030001-0000-0000-0000-000000000003'::uuid, 'CS-BK-2609-0033', 'd1000001-0000-0000-0000-000000000006'::uuid, 'c3010003-0000-0000-0000-000000000003'::uuid, 'b3000000-0000-0000-0000-000000000003'::uuid, 'desk', (CURRENT_DATE - INTERVAL '1 day' + TIME '08:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE - INTERVAL '1 day' + TIME '18:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'day', 1, false, 'COMPLETED', 220000, 220000, 0, 35000, 255000, 'web'),
  ('b0030001-0000-0000-0000-000000000004'::uuid, 'CS-BK-2609-0034', 'd1000001-0000-0000-0000-000000000009'::uuid, 'c3020001-0000-0000-0000-000000000001'::uuid, 'b3000000-0000-0000-0000-000000000003'::uuid, 'meeting_room', (CURRENT_DATE - INTERVAL '2 days' + TIME '14:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE - INTERVAL '2 days' + TIME '17:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'hour', 3, false, 'COMPLETED', 180000, 540000, 0, 0, 540000, 'web'),
  ('b0030001-0000-0000-0000-000000000005'::uuid, 'CS-BK-2609-0035', 'd1000001-0000-0000-0000-000000000004'::uuid, 'c3010001-0000-0000-0000-000000000001'::uuid, 'b3000000-0000-0000-0000-000000000003'::uuid, 'desk', (CURRENT_DATE - INTERVAL '6 days' + TIME '09:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE - INTERVAL '6 days' + TIME '17:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'day', 1, false, 'COMPLETED', 220000, 220000, 0, 45000, 265000, 'web'),
  ('b0030001-0000-0000-0000-000000000006'::uuid, 'CS-BK-2609-0036', 'd1000001-0000-0000-0000-000000000010'::uuid, 'c3020002-0000-0000-0000-000000000002'::uuid, 'b3000000-0000-0000-0000-000000000003'::uuid, 'meeting_room', (CURRENT_DATE - INTERVAL '8 days' + TIME '10:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE - INTERVAL '8 days' + TIME '16:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'hour', 6, false, 'COMPLETED', 180000, 1080000, 0, 0, 1080000, 'web'),
  -- Monthly contract
  ('b0030001-0000-0000-0000-000000000007'::uuid, 'CS-BK-2609-0037', 'd1000001-0000-0000-0000-000000000007'::uuid, 'c3030001-0000-0000-0000-000000000001'::uuid, 'b3000000-0000-0000-0000-000000000003'::uuid, 'private_office', (CURRENT_DATE - INTERVAL '5 days') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE + INTERVAL '25 days') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'month', 1, true, 'CONFIRMED', 9000000, 9000000, 0, 0, 9000000, 'web'),
  -- Cancelled
  ('b0030001-0000-0000-0000-000000000008'::uuid, 'CS-BK-2609-0038', 'd1000001-0000-0000-0000-000000000001'::uuid, 'c3010002-0000-0000-0000-000000000002'::uuid, 'b3000000-0000-0000-0000-000000000003'::uuid, 'desk', (CURRENT_DATE - INTERVAL '3 days' + TIME '09:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE - INTERVAL '3 days' + TIME '17:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'day', 1, false, 'CANCELLED', 220000, 220000, 0, 0, 220000, 'web'),
  -- Old completed
  ('b0030001-0000-0000-0000-000000000009'::uuid, 'CS-BK-2609-0039', 'd1000001-0000-0000-0000-000000000002'::uuid, 'c3010003-0000-0000-0000-000000000003'::uuid, 'b3000000-0000-0000-0000-000000000003'::uuid, 'desk', (CURRENT_DATE - INTERVAL '12 days' + TIME '08:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE - INTERVAL '12 days' + TIME '18:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'day', 1, false, 'COMPLETED', 220000, 220000, 0, 0, 220000, 'web'),
  ('b0030001-0000-0000-0000-000000000010'::uuid, 'CS-BK-2609-0040', 'd1000001-0000-0000-0000-000000000005'::uuid, 'c3020001-0000-0000-0000-000000000001'::uuid, 'b3000000-0000-0000-0000-000000000003'::uuid, 'meeting_room', (CURRENT_DATE - INTERVAL '18 days' + TIME '09:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE - INTERVAL '18 days' + TIME '12:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'hour', 3, false, 'COMPLETED', 180000, 540000, 0, 0, 540000, 'web')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. PAYMENTS (matching bookings above)
-- ─────────────────────────────────────────────────────────────────────────────

-- Branch 1 payments (for completed, confirmed, checked_in bookings)
INSERT INTO payments (id, booking_id, user_id, provider, method, order_id, amount, status, paid_at, created_at) VALUES
  ('ea010001-0000-0000-0000-000000000001'::uuid, 'b0010001-0000-0000-0000-000000000001'::uuid, 'd1000001-0000-0000-0000-000000000001'::uuid, 'payos', 'qr',    'PAY-CS-0001', 120000, 'PAID', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '3 hours'),
  ('ea010001-0000-0000-0000-000000000002'::uuid, 'b0010001-0000-0000-0000-000000000002'::uuid, 'd1000001-0000-0000-0000-000000000002'::uuid, 'payos', 'qr',    'PAY-CS-0002', 200000, 'PAID', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '5 hours'),
  ('ea010001-0000-0000-0000-000000000003'::uuid, 'b0010001-0000-0000-0000-000000000003'::uuid, 'd1000001-0000-0000-0000-000000000004'::uuid, 'payos', 'qr',    'PAY-CS-0003', 300000, 'PAID', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '2 hours'),
  ('ea010001-0000-0000-0000-000000000004'::uuid, 'b0010001-0000-0000-0000-000000000004'::uuid, 'd1000001-0000-0000-0000-000000000003'::uuid, 'cash',  'cash',  'PAY-CS-0004', 235000, 'PAID', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours'),
  ('ea010001-0000-0000-0000-000000000005'::uuid, 'b0010001-0000-0000-0000-000000000005'::uuid, 'd1000001-0000-0000-0000-000000000007'::uuid, 'payos', 'qr',    'PAY-CS-0005', 200000, 'PAID', NOW() - INTERVAL '8 hours', NOW() - INTERVAL '9 hours'),
  ('ea010001-0000-0000-0000-000000000006'::uuid, 'b0010001-0000-0000-0000-000000000006'::uuid, 'd1000001-0000-0000-0000-000000000010'::uuid, 'payos', 'qr',    'PAY-CS-0006', 5000000, 'PAID', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
  ('ea010001-0000-0000-0000-000000000007'::uuid, 'b0010001-0000-0000-0000-000000000007'::uuid, 'd1000001-0000-0000-0000-000000000001'::uuid, 'payos', 'qr',    'PAY-CS-0007', 240000, 'PAID', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
  ('ea010001-0000-0000-0000-000000000008'::uuid, 'b0010001-0000-0000-0000-000000000008'::uuid, 'd1000001-0000-0000-0000-000000000005'::uuid, 'cash',  'cash',  'PAY-CS-0008', 300000, 'PAID', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
  ('ea010001-0000-0000-0000-000000000009'::uuid, 'b0010001-0000-0000-0000-000000000009'::uuid, 'd1000001-0000-0000-0000-000000000002'::uuid, 'payos', 'qr',    'PAY-CS-0009', 255000, 'PAID', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
  ('ea010001-0000-0000-0000-000000000010'::uuid, 'b0010001-0000-0000-0000-000000000010'::uuid, 'd1000001-0000-0000-0000-000000000006'::uuid, 'cash',  'cash',  'PAY-CS-0010', 180000, 'PAID', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
  ('ea010001-0000-0000-0000-000000000011'::uuid, 'b0010001-0000-0000-0000-000000000011'::uuid, 'd1000001-0000-0000-0000-000000000008'::uuid, 'payos', 'qr',    'PAY-CS-0011', 530000, 'PAID', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
  ('ea010001-0000-0000-0000-000000000012'::uuid, 'b0010001-0000-0000-0000-000000000012'::uuid, 'd1000001-0000-0000-0000-000000000004'::uuid, 'payos', 'qr',    'PAY-CS-0012', 8000000, 'PAID', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
  ('ea010001-0000-0000-0000-000000000013'::uuid, 'b0010001-0000-0000-0000-000000000013'::uuid, 'd1000001-0000-0000-0000-000000000009'::uuid, 'payos', 'qr',    'PAY-CS-0013', 200000, 'PAID', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
  ('ea010001-0000-0000-0000-000000000014'::uuid, 'b0010001-0000-0000-0000-000000000014'::uuid, 'd1000001-0000-0000-0000-000000000003'::uuid, 'cash',  'cash',  'PAY-CS-0014', 230000, 'PAID', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
  ('ea010001-0000-0000-0000-000000000017'::uuid, 'b0010001-0000-0000-0000-000000000017'::uuid, 'd1000001-0000-0000-0000-000000000001'::uuid, 'payos', 'qr',    'PAY-CS-0017', 300000, 'PAID', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour')
ON CONFLICT (id) DO NOTHING;

-- Branch 2 payments
INSERT INTO payments (id, booking_id, user_id, provider, method, order_id, amount, status, paid_at, created_at) VALUES
  ('ea020001-0000-0000-0000-000000000001'::uuid, 'b0020001-0000-0000-0000-000000000001'::uuid, 'd1000001-0000-0000-0000-000000000003'::uuid, 'payos', 'qr',   'PAY-CS-0019', 220000, 'PAID', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '6 hours'),
  ('ea020001-0000-0000-0000-000000000002'::uuid, 'b0020001-0000-0000-0000-000000000002'::uuid, 'd1000001-0000-0000-0000-000000000005'::uuid, 'payos', 'qr',   'PAY-CS-0020', 100000, 'PAID', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '4 hours'),
  ('ea020001-0000-0000-0000-000000000003'::uuid, 'b0020001-0000-0000-0000-000000000003'::uuid, 'd1000001-0000-0000-0000-000000000008'::uuid, 'payos', 'qr',   'PAY-CS-0021', 360000, 'PAID', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '2 hours'),
  ('ea020001-0000-0000-0000-000000000004'::uuid, 'b0020001-0000-0000-0000-000000000004'::uuid, 'd1000001-0000-0000-0000-000000000003'::uuid, 'payos', 'qr',   'PAY-CS-0022', 180000, 'PAID', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
  ('ea020001-0000-0000-0000-000000000005'::uuid, 'b0020001-0000-0000-0000-000000000005'::uuid, 'd1000001-0000-0000-0000-000000000005'::uuid, 'cash',  'cash', 'PAY-CS-0023', 285000, 'PAID', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
  ('ea020001-0000-0000-0000-000000000006'::uuid, 'b0020001-0000-0000-0000-000000000006'::uuid, 'd1000001-0000-0000-0000-000000000008'::uuid, 'payos', 'qr',   'PAY-CS-0024', 180000, 'PAID', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
  ('ea020001-0000-0000-0000-000000000007'::uuid, 'b0020001-0000-0000-0000-000000000007'::uuid, 'd1000001-0000-0000-0000-000000000002'::uuid, 'payos', 'qr',   'PAY-CS-0025', 360000, 'PAID', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),
  ('ea020001-0000-0000-0000-000000000008'::uuid, 'b0020001-0000-0000-0000-000000000008'::uuid, 'd1000001-0000-0000-0000-000000000009'::uuid, 'payos', 'qr',   'PAY-CS-0026', 7500000, 'PAID', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
  ('ea020001-0000-0000-0000-000000000010'::uuid, 'b0020001-0000-0000-0000-000000000010'::uuid, 'd1000001-0000-0000-0000-000000000004'::uuid, 'cash',  'cash', 'PAY-CS-0028', 235000, 'PAID', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days'),
  ('ea020001-0000-0000-0000-000000000011'::uuid, 'b0020001-0000-0000-0000-000000000011'::uuid, 'd1000001-0000-0000-0000-000000000007'::uuid, 'payos', 'qr',   'PAY-CS-0029', 600000, 'PAID', NOW() - INTERVAL '21 days', NOW() - INTERVAL '21 days')
ON CONFLICT (id) DO NOTHING;

-- Branch 3 payments
INSERT INTO payments (id, booking_id, user_id, provider, method, order_id, amount, status, paid_at, created_at) VALUES
  ('ea030001-0000-0000-0000-000000000001'::uuid, 'b0030001-0000-0000-0000-000000000001'::uuid, 'd1000001-0000-0000-0000-000000000006'::uuid, 'payos', 'qr',   'PAY-CS-0031', 220000, 'PAID', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '3 hours'),
  ('ea030001-0000-0000-0000-000000000002'::uuid, 'b0030001-0000-0000-0000-000000000002'::uuid, 'd1000001-0000-0000-0000-000000000009'::uuid, 'cash',  'cash', 'PAY-CS-0032', 210000, 'PAID', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours'),
  ('ea030001-0000-0000-0000-000000000003'::uuid, 'b0030001-0000-0000-0000-000000000003'::uuid, 'd1000001-0000-0000-0000-000000000006'::uuid, 'payos', 'qr',   'PAY-CS-0033', 255000, 'PAID', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
  ('ea030001-0000-0000-0000-000000000004'::uuid, 'b0030001-0000-0000-0000-000000000004'::uuid, 'd1000001-0000-0000-0000-000000000009'::uuid, 'payos', 'qr',   'PAY-CS-0034', 540000, 'PAID', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
  ('ea030001-0000-0000-0000-000000000005'::uuid, 'b0030001-0000-0000-0000-000000000005'::uuid, 'd1000001-0000-0000-0000-000000000004'::uuid, 'payos', 'qr',   'PAY-CS-0035', 265000, 'PAID', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),
  ('ea030001-0000-0000-0000-000000000006'::uuid, 'b0030001-0000-0000-0000-000000000006'::uuid, 'd1000001-0000-0000-0000-000000000010'::uuid, 'cash',  'cash', 'PAY-CS-0036', 1080000, 'PAID', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'),
  ('ea030001-0000-0000-0000-000000000007'::uuid, 'b0030001-0000-0000-0000-000000000007'::uuid, 'd1000001-0000-0000-0000-000000000007'::uuid, 'payos', 'qr',   'PAY-CS-0037', 9000000, 'PAID', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
  ('ea030001-0000-0000-0000-000000000009'::uuid, 'b0030001-0000-0000-0000-000000000009'::uuid, 'd1000001-0000-0000-0000-000000000002'::uuid, 'payos', 'qr',   'PAY-CS-0039', 220000, 'PAID', NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days'),
  ('ea030001-0000-0000-0000-000000000010'::uuid, 'b0030001-0000-0000-0000-000000000010'::uuid, 'd1000001-0000-0000-0000-000000000005'::uuid, 'payos', 'qr',   'PAY-CS-0040', 540000, 'PAID', NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. CHECKIN LOGS (for CHECKED_IN and COMPLETED bookings)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO checkin_logs (id, booking_id, staff_user_id, checkin_at, checkout_at) VALUES
  -- Branch 1: currently checked in
  ('c1100001-0000-0000-0000-000000000001'::uuid, 'b0010001-0000-0000-0000-000000000004'::uuid, 'd3000001-0000-0000-0000-000000000001'::uuid, NOW() - INTERVAL '4 hours', NULL),
  ('c1100001-0000-0000-0000-000000000002'::uuid, 'b0010001-0000-0000-0000-000000000005'::uuid, 'd3000001-0000-0000-0000-000000000001'::uuid, NOW() - INTERVAL '6 hours', NULL),
  ('c1100001-0000-0000-0000-000000000003'::uuid, 'b0010001-0000-0000-0000-000000000006'::uuid, 'd3000001-0000-0000-0000-000000000001'::uuid, NOW() - INTERVAL '3 days', NULL),
  -- Branch 1: completed (checked out)
  ('c1100001-0000-0000-0000-000000000004'::uuid, 'b0010001-0000-0000-0000-000000000007'::uuid, 'd3000001-0000-0000-0000-000000000001'::uuid, NOW() - INTERVAL '1 day' - INTERVAL '8 hours', NOW() - INTERVAL '1 day'),
  ('c1100001-0000-0000-0000-000000000005'::uuid, 'b0010001-0000-0000-0000-000000000008'::uuid, 'd3000001-0000-0000-0000-000000000001'::uuid, NOW() - INTERVAL '1 day' - INTERVAL '4 hours', NOW() - INTERVAL '1 day' - INTERVAL '2 hours'),
  -- Branch 2: currently checked in
  ('c1200001-0000-0000-0000-000000000001'::uuid, 'b0020001-0000-0000-0000-000000000001'::uuid, 'd3000001-0000-0000-0000-000000000002'::uuid, NOW() - INTERVAL '5 hours', NULL),
  -- Branch 3: currently checked in
  ('c1300001-0000-0000-0000-000000000001'::uuid, 'b0030001-0000-0000-0000-000000000002'::uuid, 'd3000001-0000-0000-0000-000000000003'::uuid, NOW() - INTERVAL '4 hours', NULL)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. BOOKING CANCELLATIONS (for CANCELLED bookings)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO booking_cancellations (id, booking_id, user_id, reason, refund_percent, refund_amount, penalty_amount, refund_status, applied_rule_json, created_at) VALUES
  -- Branch 1 cancellations
  ('bc000001-0000-0000-0000-000000000001'::uuid, 'b0010001-0000-0000-0000-000000000015'::uuid, 'd1000001-0000-0000-0000-000000000005'::uuid, 'Thay đổi lịch công tác đột xuất', 30, 36000, 84000, 'confirmed', '{"rule_type":"BEFORE_START_DAYS","refund_percent":30,"policy_name":"Hủy sát giờ - hoàn 30%","min_value":0,"max_value":1}', NOW() - INTERVAL '2 days'),
  ('bc000001-0000-0000-0000-000000000002'::uuid, 'b0010001-0000-0000-0000-000000000016'::uuid, 'd1000001-0000-0000-0000-000000000006'::uuid, 'Khách hàng dời cuộc họp', 80, 240000, 60000, 'confirmed', '{"rule_type":"BEFORE_START_DAYS","refund_percent":80,"policy_name":"Hủy trước 1 ngày - hoàn 80%","min_value":1,"max_value":999}', NOW() - INTERVAL '6 days'),
  -- Branch 2 cancellation
  ('bc000002-0000-0000-0000-000000000001'::uuid, 'b0020001-0000-0000-0000-000000000009'::uuid, 'd1000001-0000-0000-0000-000000000006'::uuid, 'Đặt nhầm chi nhánh', 100, 100000, 0, 'confirmed', '{"rule_type":"GRACE_HOURS","refund_percent":100,"policy_name":"Miễn phí hủy 2 giờ đầu","min_value":0,"max_value":2}', NOW() - INTERVAL '4 days'),
  -- Branch 3 cancellation
  ('bc000003-0000-0000-0000-000000000001'::uuid, 'b0030001-0000-0000-0000-000000000008'::uuid, 'd1000001-0000-0000-0000-000000000001'::uuid, 'Kế hoạch cá nhân thay đổi', 80, 176000, 44000, 'confirmed', '{"rule_type":"BEFORE_START_DAYS","refund_percent":80,"policy_name":"Hủy trước 1 ngày - hoàn 80%","min_value":1,"max_value":999}', NOW() - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. NOTIFICATIONS (sample in-app notifications)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO notifications (id, user_id, type, title, content, is_read, created_at) VALUES
  ('fa000001-0000-0000-0000-000000000001'::uuid, 'd1000001-0000-0000-0000-000000000001'::uuid, 'BOOKING_CONFIRMED', 'Đặt chỗ thành công!', 'Bạn đã đặt thành công bàn HD-101 vào hôm nay lúc 08:00.', false, NOW() - INTERVAL '3 hours'),
  ('fa000001-0000-0000-0000-000000000002'::uuid, 'd1000001-0000-0000-0000-000000000003'::uuid, 'CHECKIN_REMINDER', 'Nhắc nhở check-in', 'Đặt chỗ của bạn tại HD-103 sẽ bắt đầu sau 1 giờ.', true, NOW() - INTERVAL '5 hours'),
  ('fa000001-0000-0000-0000-000000000003'::uuid, 'd1000001-0000-0000-0000-000000000005'::uuid, 'BOOKING_CANCELLED', 'Đơn đặt chỗ đã hủy', 'Đơn CS-BK-2609-0015 đã được hủy. Hoàn tiền 30%: 36,000₫.', true, NOW() - INTERVAL '2 days'),
  ('fa000001-0000-0000-0000-000000000004'::uuid, 'd1000001-0000-0000-0000-000000000010'::uuid, 'BOOKING_CONFIRMED', 'Hợp đồng tuần đã xác nhận', 'Hợp đồng thuê PO-301 từ ngày hôm nay đã được xác nhận.', false, NOW() - INTERVAL '3 days'),
  ('fa000001-0000-0000-0000-000000000005'::uuid, 'd1000001-0000-0000-0000-000000000002'::uuid, 'PARTNER_SUGGESTION', 'Gợi ý đối tác mới!', 'Có 3 thành viên mới phù hợp với kỹ năng của bạn.', false, NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. EXPANDED FULL-YEAR 2026 (T1..T12) & EARLY 2027 (T1..T2) BOOKINGS & PAYMENTS
-- Enterprise-grade: Full analytics across all quarters + Future pipeline bookings
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO bookings (id, booking_code, user_id, workspace_id, branch_id, workspace_type_id, start_at, end_at, unit, unit_count, is_contract, status, price_per_unit, subtotal_amount, discount_amount, addon_amount, total_amount, source) VALUES
  -- ─── Q1 2026 ───
  -- T1 (Jan 2026)
  ('b0010002-0000-0000-0000-000000000001'::uuid, 'CS-BK-2601-0001', 'd1000001-0000-0000-0000-000000000001'::uuid, 'c1030001-0000-0000-0000-000000000001'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'private_office', '2026-01-05 08:00:00+07'::timestamptz, '2026-02-05 18:00:00+07'::timestamptz, 'month', 1, true, 'COMPLETED', 18000000, 18000000, 0, 0, 18000000, 'web'),
  ('b0010002-0000-0000-0000-000000000002'::uuid, 'CS-BK-2601-0002', 'd1000001-0000-0000-0000-000000000002'::uuid, 'c1020001-0000-0000-0000-000000000001'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'meeting_room', '2026-01-15 09:00:00+07'::timestamptz, '2026-01-15 13:00:00+07'::timestamptz, 'hour', 4, false, 'COMPLETED', 150000, 600000, 0, 0, 600000, 'web'),
  ('b0020002-0000-0000-0000-000000000001'::uuid, 'CS-BK-2601-0003', 'd1000001-0000-0000-0000-000000000003'::uuid, 'c2020003-0000-0000-0000-000000000003'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'private_office', '2026-01-08 08:00:00+07'::timestamptz, '2026-02-08 18:00:00+07'::timestamptz, 'month', 1, true, 'COMPLETED', 7500000, 7500000, 0, 0, 7500000, 'web'),
  ('b0030002-0000-0000-0000-000000000001'::uuid, 'CS-BK-2601-0004', 'd1000001-0000-0000-0000-000000000004'::uuid, 'c3030001-0000-0000-0000-000000000001'::uuid, 'b3000000-0000-0000-0000-000000000003'::uuid, 'private_office', '2026-01-10 08:00:00+07'::timestamptz, '2026-02-10 18:00:00+07'::timestamptz, 'month', 1, true, 'COMPLETED', 9000000, 9000000, 0, 0, 9000000, 'web'),

  -- T2 (Feb 2026)
  ('b0010002-0000-0000-0000-000000000003'::uuid, 'CS-BK-2602-0001', 'd1000001-0000-0000-0000-000000000005'::uuid, 'c1010001-0000-0000-0000-000000000001'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'desk', '2026-02-10 08:00:00+07'::timestamptz, '2026-02-17 18:00:00+07'::timestamptz, 'week', 1, false, 'COMPLETED', 700000, 700000, 0, 0, 700000, 'web'),
  ('b0010002-0000-0000-0000-000000000004'::uuid, 'CS-BK-2602-0002', 'd1000001-0000-0000-0000-000000000006'::uuid, 'c1020002-0000-0000-0000-000000000002'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'meeting_room', '2026-02-20 13:00:00+07'::timestamptz, '2026-02-20 18:00:00+07'::timestamptz, 'hour', 5, false, 'COMPLETED', 150000, 750000, 0, 0, 750000, 'web'),
  ('b0020002-0000-0000-0000-000000000002'::uuid, 'CS-BK-2602-0003', 'd1000001-0000-0000-0000-000000000007'::uuid, 'c2020001-0000-0000-0000-000000000001'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'meeting_room', '2026-02-16 09:00:00+07'::timestamptz, '2026-02-16 16:00:00+07'::timestamptz, 'hour', 7, false, 'COMPLETED', 120000, 840000, 0, 0, 840000, 'web'),
  ('b0030002-0000-0000-0000-000000000002'::uuid, 'CS-BK-2602-0004', 'd1000001-0000-0000-0000-000000000008'::uuid, 'c3010001-0000-0000-0000-000000000001'::uuid, 'b3000000-0000-0000-0000-000000000003'::uuid, 'desk', '2026-02-01 08:00:00+07'::timestamptz, '2026-03-01 18:00:00+07'::timestamptz, 'month', 1, true, 'COMPLETED', 2500000, 2500000, 0, 0, 2500000, 'web'),

  -- T3 (Mar 2026)
  ('b0010002-0000-0000-0000-000000000005'::uuid, 'CS-BK-2603-0001', 'd1000001-0000-0000-0000-000000000009'::uuid, 'c1030002-0000-0000-0000-000000000002'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'private_office', '2026-03-01 08:00:00+07'::timestamptz, '2026-04-01 18:00:00+07'::timestamptz, 'month', 1, true, 'COMPLETED', 8000000, 8000000, 0, 0, 8000000, 'web'),
  ('b0010002-0000-0000-0000-000000000006'::uuid, 'CS-BK-2603-0002', 'd1000001-0000-0000-0000-000000000010'::uuid, 'c1010002-0000-0000-0000-000000000002'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'desk', '2026-03-18 08:30:00+07'::timestamptz, '2026-03-18 17:30:00+07'::timestamptz, 'day', 1, false, 'COMPLETED', 200000, 200000, 0, 0, 200000, 'web'),
  ('b0020002-0000-0000-0000-000000000003'::uuid, 'CS-BK-2603-0003', 'd1000001-0000-0000-0000-000000000001'::uuid, 'c2010001-0000-0000-0000-000000000001'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'desk', '2026-03-10 08:00:00+07'::timestamptz, '2026-03-17 18:00:00+07'::timestamptz, 'week', 1, false, 'COMPLETED', 600000, 600000, 0, 0, 600000, 'web'),
  ('b0030002-0000-0000-0000-000000000003'::uuid, 'CS-BK-2603-0004', 'd1000001-0000-0000-0000-000000000002'::uuid, 'c3020001-0000-0000-0000-000000000001'::uuid, 'b3000000-0000-0000-0000-000000000003'::uuid, 'meeting_room', '2026-03-22 09:00:00+07'::timestamptz, '2026-03-22 15:00:00+07'::timestamptz, 'hour', 6, false, 'COMPLETED', 180000, 1080000, 0, 0, 1080000, 'web'),

  -- ─── Q2 2026 ───
  -- T4 (Apr 2026)
  ('b0010003-0000-0000-0000-000000000001'::uuid, 'CS-BK-2604-0001', 'd1000001-0000-0000-0000-000000000003'::uuid, 'c1030001-0000-0000-0000-000000000001'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'private_office', '2026-04-01 08:00:00+07'::timestamptz, '2026-05-01 18:00:00+07'::timestamptz, 'month', 1, true, 'COMPLETED', 18000000, 18000000, 0, 0, 18000000, 'web'),
  ('b0010003-0000-0000-0000-000000000002'::uuid, 'CS-BK-2604-0002', 'd1000001-0000-0000-0000-000000000004'::uuid, 'c1020001-0000-0000-0000-000000000001'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'meeting_room', '2026-04-14 09:00:00+07'::timestamptz, '2026-04-14 17:00:00+07'::timestamptz, 'hour', 8, false, 'COMPLETED', 150000, 1200000, 0, 0, 1200000, 'web'),
  ('b0020003-0000-0000-0000-000000000001'::uuid, 'CS-BK-2604-0003', 'd1000001-0000-0000-0000-000000000005'::uuid, 'c2020003-0000-0000-0000-000000000003'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'private_office', '2026-04-05 08:00:00+07'::timestamptz, '2026-05-05 18:00:00+07'::timestamptz, 'month', 1, true, 'COMPLETED', 7500000, 7500000, 0, 0, 7500000, 'web'),
  ('b0030003-0000-0000-0000-000000000001'::uuid, 'CS-BK-2604-0004', 'd1000001-0000-0000-0000-000000000006'::uuid, 'c3020002-0000-0000-0000-000000000002'::uuid, 'b3000000-0000-0000-0000-000000000003'::uuid, 'meeting_room', '2026-04-20 09:00:00+07'::timestamptz, '2026-04-20 17:00:00+07'::timestamptz, 'hour', 8, false, 'COMPLETED', 180000, 1440000, 0, 0, 1440000, 'web'),

  -- T5 (May 2026)
  ('b0010003-0000-0000-0000-000000000003'::uuid, 'CS-BK-2605-0001', 'd1000001-0000-0000-0000-000000000007'::uuid, 'c1030002-0000-0000-0000-000000000002'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'private_office', '2026-05-01 08:00:00+07'::timestamptz, '2026-06-01 18:00:00+07'::timestamptz, 'month', 1, true, 'COMPLETED', 8000000, 8000000, 0, 0, 8000000, 'web'),
  ('b0010003-0000-0000-0000-000000000004'::uuid, 'CS-BK-2605-0002', 'd1000001-0000-0000-0000-000000000008'::uuid, 'c1010003-0000-0000-0000-000000000003'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'desk', '2026-05-12 08:00:00+07'::timestamptz, '2026-05-12 17:00:00+07'::timestamptz, 'day', 1, false, 'COMPLETED', 200000, 200000, 0, 0, 200000, 'web'),
  ('b0020003-0000-0000-0000-000000000002'::uuid, 'CS-BK-2605-0003', 'd1000001-0000-0000-0000-000000000009'::uuid, 'c2020002-0000-0000-0000-000000000002'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'meeting_room', '2026-05-18 09:00:00+07'::timestamptz, '2026-05-18 17:00:00+07'::timestamptz, 'hour', 8, false, 'COMPLETED', 120000, 960000, 0, 0, 960000, 'web'),
  ('b0030003-0000-0000-0000-000000000002'::uuid, 'CS-BK-2605-0004', 'd1000001-0000-0000-0000-000000000010'::uuid, 'c3030001-0000-0000-0000-000000000001'::uuid, 'b3000000-0000-0000-0000-000000000003'::uuid, 'private_office', '2026-05-05 08:00:00+07'::timestamptz, '2026-06-05 18:00:00+07'::timestamptz, 'month', 1, true, 'COMPLETED', 9000000, 9000000, 0, 0, 9000000, 'web'),

  -- T6 (Jun 2026)
  ('b0010003-0000-0000-0000-000000000005'::uuid, 'CS-BK-2606-0001', 'd1000001-0000-0000-0000-000000000001'::uuid, 'c1010004-0000-0000-0000-000000000004'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'desk', '2026-06-08 08:00:00+07'::timestamptz, '2026-06-15 18:00:00+07'::timestamptz, 'week', 1, false, 'COMPLETED', 700000, 700000, 0, 0, 700000, 'web'),
  ('b0010003-0000-0000-0000-000000000006'::uuid, 'CS-BK-2606-0002', 'd1000001-0000-0000-0000-000000000002'::uuid, 'c1020002-0000-0000-0000-000000000002'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'meeting_room', '2026-06-22 08:00:00+07'::timestamptz, '2026-06-22 18:00:00+07'::timestamptz, 'hour', 10, false, 'COMPLETED', 150000, 1500000, 0, 0, 1500000, 'web'),
  ('b0020003-0000-0000-0000-000000000003'::uuid, 'CS-BK-2606-0003', 'd1000001-0000-0000-0000-000000000003'::uuid, 'c2020003-0000-0000-0000-000000000003'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'private_office', '2026-06-01 08:00:00+07'::timestamptz, '2026-07-01 18:00:00+07'::timestamptz, 'month', 1, true, 'COMPLETED', 7500000, 7500000, 0, 0, 7500000, 'web'),
  ('b0030003-0000-0000-0000-000000000003'::uuid, 'CS-BK-2606-0004', 'd1000001-0000-0000-0000-000000000004'::uuid, 'c3010002-0000-0000-0000-000000000002'::uuid, 'b3000000-0000-0000-0000-000000000003'::uuid, 'desk', '2026-06-15 08:30:00+07'::timestamptz, '2026-06-15 17:30:00+07'::timestamptz, 'day', 1, false, 'COMPLETED', 220000, 220000, 0, 0, 220000, 'web'),

  -- ─── Q3 2026 (T7, T8) ───
  -- T7 (Jul 2026)
  ('b0010004-0000-0000-0000-000000000001'::uuid, 'CS-BK-2607-0001', 'd1000001-0000-0000-0000-000000000005'::uuid, 'c1030001-0000-0000-0000-000000000001'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'private_office', '2026-07-01 08:00:00+07'::timestamptz, '2026-08-01 18:00:00+07'::timestamptz, 'month', 1, true, 'COMPLETED', 18000000, 18000000, 0, 0, 18000000, 'web'),
  ('b0010004-0000-0000-0000-000000000002'::uuid, 'CS-BK-2607-0002', 'd1000001-0000-0000-0000-000000000006'::uuid, 'c1020001-0000-0000-0000-000000000001'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'meeting_room', '2026-07-16 09:00:00+07'::timestamptz, '2026-07-16 15:00:00+07'::timestamptz, 'hour', 6, false, 'COMPLETED', 150000, 900000, 0, 0, 900000, 'web'),
  ('b0020004-0000-0000-0000-000000000001'::uuid, 'CS-BK-2607-0003', 'd1000001-0000-0000-0000-000000000007'::uuid, 'c2020001-0000-0000-0000-000000000001'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'meeting_room', '2026-07-20 08:00:00+07'::timestamptz, '2026-07-20 18:00:00+07'::timestamptz, 'hour', 10, false, 'COMPLETED', 120000, 1200000, 0, 0, 1200000, 'web'),
  ('b0030004-0000-0000-0000-000000000001'::uuid, 'CS-BK-2607-0004', 'd1000001-0000-0000-0000-000000000008'::uuid, 'c3030001-0000-0000-0000-000000000001'::uuid, 'b3000000-0000-0000-0000-000000000003'::uuid, 'private_office', '2026-07-05 08:00:00+07'::timestamptz, '2026-08-05 18:00:00+07'::timestamptz, 'month', 1, true, 'COMPLETED', 9000000, 9000000, 0, 0, 9000000, 'web'),

  -- T8 (Aug 2026)
  ('b0010004-0000-0000-0000-000000000003'::uuid, 'CS-BK-2608-0001', 'd1000001-0000-0000-0000-000000000009'::uuid, 'c1030002-0000-0000-0000-000000000002'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'private_office', '2026-08-01 08:00:00+07'::timestamptz, '2026-09-01 18:00:00+07'::timestamptz, 'month', 1, true, 'COMPLETED', 8000000, 8000000, 0, 0, 8000000, 'web'),
  ('b0010004-0000-0000-0000-000000000004'::uuid, 'CS-BK-2608-0002', 'd1000001-0000-0000-0000-000000000010'::uuid, 'c1010005-0000-0000-0000-000000000005'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'desk', '2026-08-10 08:00:00+07'::timestamptz, '2026-08-17 18:00:00+07'::timestamptz, 'week', 1, false, 'COMPLETED', 700000, 700000, 0, 0, 700000, 'web'),
  ('b0020004-0000-0000-0000-000000000002'::uuid, 'CS-BK-2608-0003', 'd1000001-0000-0000-0000-000000000001'::uuid, 'c2020003-0000-0000-0000-000000000003'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'private_office', '2026-08-01 08:00:00+07'::timestamptz, '2026-09-01 18:00:00+07'::timestamptz, 'month', 1, true, 'COMPLETED', 7500000, 7500000, 0, 0, 7500000, 'web'),
  ('b0030004-0000-0000-0000-000000000002'::uuid, 'CS-BK-2608-0004', 'd1000001-0000-0000-0000-000000000002'::uuid, 'c3020002-0000-0000-0000-000000000002'::uuid, 'b3000000-0000-0000-0000-000000000003'::uuid, 'meeting_room', '2026-08-18 08:00:00+07'::timestamptz, '2026-08-18 18:00:00+07'::timestamptz, 'hour', 10, false, 'COMPLETED', 180000, 1800000, 0, 0, 1800000, 'web'),

  -- ─── Q4 2026 (ADVANCE BOOKINGS — T10, T11, T12) ───
  -- T10 (Oct 2026)
  ('b0010005-0000-0000-0000-000000000001'::uuid, 'CS-BK-2610-0001', 'd1000001-0000-0000-0000-000000000001'::uuid, 'c1030001-0000-0000-0000-000000000001'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'private_office', '2026-10-05 08:00:00+07'::timestamptz, '2026-11-05 18:00:00+07'::timestamptz, 'month', 1, true, 'CONFIRMED', 18000000, 18000000, 0, 0, 18000000, 'web'),
  ('b0010005-0000-0000-0000-000000000002'::uuid, 'CS-BK-2610-0002', 'd1000001-0000-0000-0000-000000000002'::uuid, 'c1020001-0000-0000-0000-000000000001'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'meeting_room', '2026-10-15 08:00:00+07'::timestamptz, '2026-10-17 18:00:00+07'::timestamptz, 'day', 3, false, 'CONFIRMED', 700000, 2100000, 0, 0, 2100000, 'web'),
  ('b0020005-0000-0000-0000-000000000001'::uuid, 'CS-BK-2610-0003', 'd1000001-0000-0000-0000-000000000003'::uuid, 'c2020003-0000-0000-0000-000000000003'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'private_office', '2026-10-01 08:00:00+07'::timestamptz, '2026-11-01 18:00:00+07'::timestamptz, 'month', 1, true, 'CONFIRMED', 7500000, 7500000, 0, 0, 7500000, 'web'),
  ('b0030005-0000-0000-0000-000000000001'::uuid, 'CS-BK-2610-0004', 'd1000001-0000-0000-0000-000000000004'::uuid, 'c3030001-0000-0000-0000-000000000001'::uuid, 'b3000000-0000-0000-0000-000000000003'::uuid, 'private_office', '2026-10-10 08:00:00+07'::timestamptz, '2026-11-10 18:00:00+07'::timestamptz, 'month', 1, true, 'CONFIRMED', 9000000, 9000000, 0, 0, 9000000, 'web'),

  -- T11 (Nov 2026)
  ('b0010005-0000-0000-0000-000000000003'::uuid, 'CS-BK-2611-0001', 'd1000001-0000-0000-0000-000000000005'::uuid, 'c1020002-0000-0000-0000-000000000002'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'meeting_room', '2026-11-12 09:00:00+07'::timestamptz, '2026-11-12 17:00:00+07'::timestamptz, 'hour', 8, false, 'CONFIRMED', 150000, 1200000, 0, 0, 1200000, 'web'),
  ('b0010005-0000-0000-0000-000000000004'::uuid, 'CS-BK-2611-0002', 'd1000001-0000-0000-0000-000000000006'::uuid, 'c1010001-0000-0000-0000-000000000001'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'desk', '2026-11-01 08:00:00+07'::timestamptz, '2026-12-01 18:00:00+07'::timestamptz, 'month', 1, true, 'CONFIRMED', 2500000, 2500000, 0, 0, 2500000, 'web'),
  ('b0020005-0000-0000-0000-000000000002'::uuid, 'CS-BK-2611-0003', 'd1000001-0000-0000-0000-000000000007'::uuid, 'c2010001-0000-0000-0000-000000000001'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'desk', '2026-11-05 08:00:00+07'::timestamptz, '2026-11-19 18:00:00+07'::timestamptz, 'week', 2, false, 'CONFIRMED', 600000, 1200000, 0, 0, 1200000, 'web'),
  ('b0030005-0000-0000-0000-000000000002'::uuid, 'CS-BK-2611-0004', 'd1000001-0000-0000-0000-000000000008'::uuid, 'c3020001-0000-0000-0000-000000000001'::uuid, 'b3000000-0000-0000-0000-000000000003'::uuid, 'meeting_room', '2026-11-18 09:00:00+07'::timestamptz, '2026-11-18 17:00:00+07'::timestamptz, 'hour', 8, false, 'CONFIRMED', 180000, 1440000, 0, 0, 1440000, 'web'),

  -- T12 (Dec 2026)
  ('b0010005-0000-0000-0000-000000000005'::uuid, 'CS-BK-2612-0001', 'd1000001-0000-0000-0000-000000000009'::uuid, 'c1020001-0000-0000-0000-000000000001'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'meeting_room', '2026-12-18 08:00:00+07'::timestamptz, '2026-12-18 18:00:00+07'::timestamptz, 'day', 1, false, 'CONFIRMED', 700000, 700000, 0, 0, 700000, 'web'),
  ('b0010005-0000-0000-0000-000000000006'::uuid, 'CS-BK-2612-0002', 'd1000001-0000-0000-0000-000000000010'::uuid, 'c1030002-0000-0000-0000-000000000002'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'private_office', '2026-12-01 08:00:00+07'::timestamptz, '2026-12-15 18:00:00+07'::timestamptz, 'week', 2, true, 'CONFIRMED', 4000000, 8000000, 0, 0, 8000000, 'web'),
  ('b0020005-0000-0000-0000-000000000003'::uuid, 'CS-BK-2612-0003', 'd1000001-0000-0000-0000-000000000001'::uuid, 'c2020002-0000-0000-0000-000000000002'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'meeting_room', '2026-12-22 09:00:00+07'::timestamptz, '2026-12-22 17:00:00+07'::timestamptz, 'hour', 8, false, 'CONFIRMED', 120000, 960000, 0, 0, 960000, 'web'),
  ('b0030005-0000-0000-0000-000000000003'::uuid, 'CS-BK-2612-0004', 'd1000001-0000-0000-0000-000000000002'::uuid, 'c3030001-0000-0000-0000-000000000001'::uuid, 'b3000000-0000-0000-0000-000000000003'::uuid, 'private_office', '2026-12-05 08:00:00+07'::timestamptz, '2026-12-19 18:00:00+07'::timestamptz, 'week', 2, true, 'CONFIRMED', 4500000, 9000000, 0, 0, 9000000, 'web'),

  -- ─── ADVANCE 2027 BOOKINGS (T1 & T2/2027) ───
  -- T1 (Jan 2027)
  ('b0010006-0000-0000-0000-000000000001'::uuid, 'CS-BK-2701-0001', 'd1000001-0000-0000-0000-000000000001'::uuid, 'c1030001-0000-0000-0000-000000000001'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'private_office', '2027-01-05 08:00:00+07'::timestamptz, '2027-02-05 18:00:00+07'::timestamptz, 'month', 1, true, 'CONFIRMED', 18000000, 18000000, 0, 0, 18000000, 'web'),
  ('b0010006-0000-0000-0000-000000000002'::uuid, 'CS-BK-2701-0002', 'd1000001-0000-0000-0000-000000000002'::uuid, 'c1020001-0000-0000-0000-000000000001'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'meeting_room', '2027-01-12 09:00:00+07'::timestamptz, '2027-01-12 17:00:00+07'::timestamptz, 'hour', 8, false, 'CONFIRMED', 150000, 1200000, 0, 0, 1200000, 'web'),
  ('b0020006-0000-0000-0000-000000000001'::uuid, 'CS-BK-2701-0003', 'd1000001-0000-0000-0000-000000000003'::uuid, 'c2020003-0000-0000-0000-000000000003'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'private_office', '2027-01-04 08:00:00+07'::timestamptz, '2027-02-04 18:00:00+07'::timestamptz, 'month', 1, true, 'CONFIRMED', 7500000, 7500000, 0, 0, 7500000, 'web'),
  ('b0030006-0000-0000-0000-000000000001'::uuid, 'CS-BK-2701-0004', 'd1000001-0000-0000-0000-000000000004'::uuid, 'c3030001-0000-0000-0000-000000000001'::uuid, 'b3000000-0000-0000-0000-000000000003'::uuid, 'private_office', '2027-01-10 08:00:00+07'::timestamptz, '2027-02-10 18:00:00+07'::timestamptz, 'month', 1, true, 'CONFIRMED', 9000000, 9000000, 0, 0, 9000000, 'web'),

  -- T2 (Feb 2027)
  ('b0010006-0000-0000-0000-000000000003'::uuid, 'CS-BK-2702-0001', 'd1000001-0000-0000-0000-000000000005'::uuid, 'c1030001-0000-0000-0000-000000000001'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'private_office', '2027-02-06 08:00:00+07'::timestamptz, '2027-03-06 18:00:00+07'::timestamptz, 'month', 1, true, 'CONFIRMED', 18000000, 18000000, 0, 0, 18000000, 'web'),
  ('b0010006-0000-0000-0000-000000000004'::uuid, 'CS-BK-2702-0002', 'd1000001-0000-0000-0000-000000000006'::uuid, 'c1020002-0000-0000-0000-000000000002'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'meeting_room', '2027-02-18 13:00:00+07'::timestamptz, '2027-02-18 18:00:00+07'::timestamptz, 'hour', 5, false, 'CONFIRMED', 150000, 750000, 0, 0, 750000, 'web'),
  ('b0020006-0000-0000-0000-000000000002'::uuid, 'CS-BK-2702-0003', 'd1000001-0000-0000-0000-000000000007'::uuid, 'c2010001-0000-0000-0000-000000000001'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'desk', '2027-02-15 08:00:00+07'::timestamptz, '2027-03-15 18:00:00+07'::timestamptz, 'month', 1, true, 'CONFIRMED', 2200000, 2200000, 0, 0, 2200000, 'web'),
  ('b0030006-0000-0000-0000-000000000002'::uuid, 'CS-BK-2702-0004', 'd1000001-0000-0000-0000-000000000008'::uuid, 'c3020001-0000-0000-0000-000000000001'::uuid, 'b3000000-0000-0000-0000-000000000003'::uuid, 'meeting_room', '2027-02-20 09:00:00+07'::timestamptz, '2027-02-20 15:00:00+07'::timestamptz, 'hour', 6, false, 'CONFIRMED', 180000, 1080000, 0, 0, 1080000, 'web')
ON CONFLICT (id) DO NOTHING;

-- PAYMENTS for expanded bookings
INSERT INTO payments (id, booking_id, user_id, provider, method, order_id, amount, status, paid_at, created_at) VALUES
  -- Q1 2026 Payments
  ('ea010002-0000-0000-0000-000000000001'::uuid, 'b0010002-0000-0000-0000-000000000001'::uuid, 'd1000001-0000-0000-0000-000000000001'::uuid, 'payos', 'qr', 'PAY-HIST-2601-1', 18000000, 'PAID', '2026-01-04 15:00:00+07'::timestamptz, '2026-01-04 14:50:00+07'::timestamptz),
  ('ea010002-0000-0000-0000-000000000002'::uuid, 'b0010002-0000-0000-0000-000000000002'::uuid, 'd1000001-0000-0000-0000-000000000002'::uuid, 'payos', 'qr', 'PAY-HIST-2601-2', 600000, 'PAID', '2026-01-14 10:00:00+07'::timestamptz, '2026-01-14 09:40:00+07'::timestamptz),
  ('ea020002-0000-0000-0000-000000000001'::uuid, 'b0020002-0000-0000-0000-000000000001'::uuid, 'd1000001-0000-0000-0000-000000000003'::uuid, 'payos', 'qr', 'PAY-HIST-2601-3', 7500000, 'PAID', '2026-01-07 11:00:00+07'::timestamptz, '2026-01-07 10:55:00+07'::timestamptz),
  ('ea030002-0000-0000-0000-000000000001'::uuid, 'b0030002-0000-0000-0000-000000000001'::uuid, 'd1000001-0000-0000-0000-000000000004'::uuid, 'payos', 'qr', 'PAY-HIST-2601-4', 9000000, 'PAID', '2026-01-09 14:00:00+07'::timestamptz, '2026-01-09 13:45:00+07'::timestamptz),

  ('ea010002-0000-0000-0000-000000000003'::uuid, 'b0010002-0000-0000-0000-000000000003'::uuid, 'd1000001-0000-0000-0000-000000000005'::uuid, 'cash', 'cash', 'PAY-HIST-2602-1', 700000, 'PAID', '2026-02-10 08:05:00+07'::timestamptz, '2026-02-10 08:00:00+07'::timestamptz),
  ('ea010002-0000-0000-0000-000000000004'::uuid, 'b0010002-0000-0000-0000-000000000004'::uuid, 'd1000001-0000-0000-0000-000000000006'::uuid, 'payos', 'qr', 'PAY-HIST-2602-2', 750000, 'PAID', '2026-02-19 16:00:00+07'::timestamptz, '2026-02-19 15:30:00+07'::timestamptz),
  ('ea020002-0000-0000-0000-000000000002'::uuid, 'b0020002-0000-0000-0000-000000000002'::uuid, 'd1000001-0000-0000-0000-000000000007'::uuid, 'payos', 'qr', 'PAY-HIST-2602-3', 840000, 'PAID', '2026-02-15 14:00:00+07'::timestamptz, '2026-02-15 13:50:00+07'::timestamptz),
  ('ea030002-0000-0000-0000-000000000002'::uuid, 'b0030002-0000-0000-0000-000000000002'::uuid, 'd1000001-0000-0000-0000-000000000008'::uuid, 'payos', 'qr', 'PAY-HIST-2602-4', 2500000, 'PAID', '2026-01-31 09:00:00+07'::timestamptz, '2026-01-31 08:30:00+07'::timestamptz),

  ('ea010002-0000-0000-0000-000000000005'::uuid, 'b0010002-0000-0000-0000-000000000005'::uuid, 'd1000001-0000-0000-0000-000000000009'::uuid, 'payos', 'qr', 'PAY-HIST-2603-1', 8000000, 'PAID', '2026-02-28 10:00:00+07'::timestamptz, '2026-02-28 09:40:00+07'::timestamptz),
  ('ea010002-0000-0000-0000-000000000006'::uuid, 'b0010002-0000-0000-0000-000000000006'::uuid, 'd1000001-0000-0000-0000-000000000010'::uuid, 'cash', 'cash', 'PAY-HIST-2603-2', 200000, 'PAID', '2026-03-18 08:35:00+07'::timestamptz, '2026-03-18 08:30:00+07'::timestamptz),
  ('ea020002-0000-0000-0000-000000000003'::uuid, 'b0020002-0000-0000-0000-000000000003'::uuid, 'd1000001-0000-0000-0000-000000000001'::uuid, 'payos', 'qr', 'PAY-HIST-2603-3', 600000, 'PAID', '2026-03-09 16:00:00+07'::timestamptz, '2026-03-09 15:45:00+07'::timestamptz),
  ('ea030002-0000-0000-0000-000000000003'::uuid, 'b0030002-0000-0000-0000-000000000003'::uuid, 'd1000001-0000-0000-0000-000000000002'::uuid, 'payos', 'qr', 'PAY-HIST-2603-4', 1080000, 'PAID', '2026-03-21 11:00:00+07'::timestamptz, '2026-03-21 10:30:00+07'::timestamptz),

  -- Q2 2026 Payments
  ('ea010003-0000-0000-0000-000000000001'::uuid, 'b0010003-0000-0000-0000-000000000001'::uuid, 'd1000001-0000-0000-0000-000000000003'::uuid, 'payos', 'qr', 'PAY-HIST-2604-1', 18000000, 'PAID', '2026-03-31 16:00:00+07'::timestamptz, '2026-03-31 15:30:00+07'::timestamptz),
  ('ea010003-0000-0000-0000-000000000002'::uuid, 'b0010003-0000-0000-0000-000000000002'::uuid, 'd1000001-0000-0000-0000-000000000004'::uuid, 'payos', 'qr', 'PAY-HIST-2604-2', 1200000, 'PAID', '2026-04-13 14:00:00+07'::timestamptz, '2026-04-13 13:30:00+07'::timestamptz),
  ('ea020003-0000-0000-0000-000000000001'::uuid, 'b0020003-0000-0000-0000-000000000001'::uuid, 'd1000001-0000-0000-0000-000000000005'::uuid, 'payos', 'qr', 'PAY-HIST-2604-3', 7500000, 'PAID', '2026-04-04 10:00:00+07'::timestamptz, '2026-04-04 09:30:00+07'::timestamptz),
  ('ea030003-0000-0000-0000-000000000001'::uuid, 'b0030003-0000-0000-0000-000000000001'::uuid, 'd1000001-0000-0000-0000-000000000006'::uuid, 'payos', 'qr', 'PAY-HIST-2604-4', 1440000, 'PAID', '2026-04-19 15:00:00+07'::timestamptz, '2026-04-19 14:30:00+07'::timestamptz),

  ('ea010003-0000-0000-0000-000000000003'::uuid, 'b0010003-0000-0000-0000-000000000003'::uuid, 'd1000001-0000-0000-0000-000000000007'::uuid, 'payos', 'qr', 'PAY-HIST-2605-1', 8000000, 'PAID', '2026-04-30 11:00:00+07'::timestamptz, '2026-04-30 10:30:00+07'::timestamptz),
  ('ea010003-0000-0000-0000-000000000004'::uuid, 'b0010003-0000-0000-0000-000000000004'::uuid, 'd1000001-0000-0000-0000-000000000008'::uuid, 'cash', 'cash', 'PAY-HIST-2605-2', 200000, 'PAID', '2026-05-12 08:05:00+07'::timestamptz, '2026-05-12 08:00:00+07'::timestamptz),
  ('ea020003-0000-0000-0000-000000000002'::uuid, 'b0020003-0000-0000-0000-000000000002'::uuid, 'd1000001-0000-0000-0000-000000000009'::uuid, 'payos', 'qr', 'PAY-HIST-2605-3', 960000, 'PAID', '2026-05-17 12:00:00+07'::timestamptz, '2026-05-17 11:30:00+07'::timestamptz),
  ('ea030003-0000-0000-0000-000000000002'::uuid, 'b0030003-0000-0000-0000-000000000002'::uuid, 'd1000001-0000-0000-0000-000000000010'::uuid, 'payos', 'qr', 'PAY-HIST-2605-4', 9000000, 'PAID', '2026-05-04 14:00:00+07'::timestamptz, '2026-05-04 13:20:00+07'::timestamptz),

  ('ea010003-0000-0000-0000-000000000005'::uuid, 'b0010003-0000-0000-0000-000000000005'::uuid, 'd1000001-0000-0000-0000-000000000001'::uuid, 'payos', 'qr', 'PAY-HIST-2606-1', 700000, 'PAID', '2026-06-07 10:00:00+07'::timestamptz, '2026-06-07 09:30:00+07'::timestamptz),
  ('ea010003-0000-0000-0000-000000000006'::uuid, 'b0010003-0000-0000-0000-000000000006'::uuid, 'd1000001-0000-0000-0000-000000000002'::uuid, 'payos', 'qr', 'PAY-HIST-2606-2', 1500000, 'PAID', '2026-06-21 16:00:00+07'::timestamptz, '2026-06-21 15:30:00+07'::timestamptz),
  ('ea020003-0000-0000-0000-000000000003'::uuid, 'b0020003-0000-0000-0000-000000000003'::uuid, 'd1000001-0000-0000-0000-000000000003'::uuid, 'payos', 'qr', 'PAY-HIST-2606-3', 7500000, 'PAID', '2026-05-31 09:00:00+07'::timestamptz, '2026-05-31 08:30:00+07'::timestamptz),
  ('ea030003-0000-0000-0000-000000000003'::uuid, 'b0030003-0000-0000-0000-000000000003'::uuid, 'd1000001-0000-0000-0000-000000000004'::uuid, 'cash', 'cash', 'PAY-HIST-2606-4', 220000, 'PAID', '2026-06-15 08:35:00+07'::timestamptz, '2026-06-15 08:30:00+07'::timestamptz),

  -- Q3 2026 Payments (T7, T8)
  ('ea010004-0000-0000-0000-000000000001'::uuid, 'b0010004-0000-0000-0000-000000000001'::uuid, 'd1000001-0000-0000-0000-000000000005'::uuid, 'payos', 'qr', 'PAY-HIST-2607-1', 18000000, 'PAID', '2026-06-30 14:00:00+07'::timestamptz, '2026-06-30 13:30:00+07'::timestamptz),
  ('ea010004-0000-0000-0000-000000000002'::uuid, 'b0010004-0000-0000-0000-000000000002'::uuid, 'd1000001-0000-0000-0000-000000000006'::uuid, 'payos', 'qr', 'PAY-HIST-2607-2', 900000, 'PAID', '2026-07-15 11:00:00+07'::timestamptz, '2026-07-15 10:30:00+07'::timestamptz),
  ('ea020004-0000-0000-0000-000000000001'::uuid, 'b0020004-0000-0000-0000-000000000001'::uuid, 'd1000001-0000-0000-0000-000000000007'::uuid, 'payos', 'qr', 'PAY-HIST-2607-3', 1200000, 'PAID', '2026-07-19 16:00:00+07'::timestamptz, '2026-07-19 15:40:00+07'::timestamptz),
  ('ea030004-0000-0000-0000-000000000001'::uuid, 'b0030004-0000-0000-0000-000000000001'::uuid, 'd1000001-0000-0000-0000-000000000008'::uuid, 'payos', 'qr', 'PAY-HIST-2607-4', 9000000, 'PAID', '2026-07-04 10:00:00+07'::timestamptz, '2026-07-04 09:25:00+07'::timestamptz),

  ('ea010004-0000-0000-0000-000000000003'::uuid, 'b0010004-0000-0000-0000-000000000003'::uuid, 'd1000001-0000-0000-0000-000000000009'::uuid, 'payos', 'qr', 'PAY-HIST-2608-1', 8000000, 'PAID', '2026-07-31 15:00:00+07'::timestamptz, '2026-07-31 14:30:00+07'::timestamptz),
  ('ea010004-0000-0000-0000-000000000004'::uuid, 'b0010004-0000-0000-0000-000000000004'::uuid, 'd1000001-0000-0000-0000-000000000010'::uuid, 'payos', 'qr', 'PAY-HIST-2608-2', 700000, 'PAID', '2026-08-09 11:00:00+07'::timestamptz, '2026-08-09 10:20:00+07'::timestamptz),
  ('ea020004-0000-0000-0000-000000000002'::uuid, 'b0020004-0000-0000-0000-000000000002'::uuid, 'd1000001-0000-0000-0000-000000000001'::uuid, 'payos', 'qr', 'PAY-HIST-2608-3', 7500000, 'PAID', '2026-07-31 16:00:00+07'::timestamptz, '2026-07-31 15:10:00+07'::timestamptz),
  ('ea030004-0000-0000-0000-000000000002'::uuid, 'b0030004-0000-0000-0000-000000000002'::uuid, 'd1000001-0000-0000-0000-000000000002'::uuid, 'payos', 'qr', 'PAY-HIST-2608-4', 1800000, 'PAID', '2026-08-17 14:00:00+07'::timestamptz, '2026-08-17 13:30:00+07'::timestamptz),

  -- Q4 2026 Advance Payments (T10, T11, T12)
  ('ea010005-0000-0000-0000-000000000001'::uuid, 'b0010005-0000-0000-0000-000000000001'::uuid, 'd1000001-0000-0000-0000-000000000001'::uuid, 'payos', 'qr', 'PAY-ADV-2610-1', 18000000, 'PAID', '2026-09-08 10:00:00+07'::timestamptz, '2026-09-08 09:30:00+07'::timestamptz),
  ('ea010005-0000-0000-0000-000000000002'::uuid, 'b0010005-0000-0000-0000-000000000002'::uuid, 'd1000001-0000-0000-0000-000000000002'::uuid, 'payos', 'qr', 'PAY-ADV-2610-2', 2100000, 'PAID', '2026-09-09 11:00:00+07'::timestamptz, '2026-09-09 10:45:00+07'::timestamptz),
  ('ea020005-0000-0000-0000-000000000001'::uuid, 'b0020005-0000-0000-0000-000000000001'::uuid, 'd1000001-0000-0000-0000-000000000003'::uuid, 'payos', 'qr', 'PAY-ADV-2610-3', 7500000, 'PAID', '2026-09-10 14:00:00+07'::timestamptz, '2026-09-10 13:20:00+07'::timestamptz),
  ('ea030005-0000-0000-0000-000000000001'::uuid, 'b0030005-0000-0000-0000-000000000001'::uuid, 'd1000001-0000-0000-0000-000000000004'::uuid, 'payos', 'qr', 'PAY-ADV-2610-4', 9000000, 'PAID', '2026-09-11 09:00:00+07'::timestamptz, '2026-09-11 08:35:00+07'::timestamptz),

  ('ea010005-0000-0000-0000-000000000003'::uuid, 'b0010005-0000-0000-0000-000000000003'::uuid, 'd1000001-0000-0000-0000-000000000005'::uuid, 'payos', 'qr', 'PAY-ADV-2611-1', 1200000, 'PAID', '2026-09-11 11:30:00+07'::timestamptz, '2026-09-11 11:00:00+07'::timestamptz),
  ('ea010005-0000-0000-0000-000000000004'::uuid, 'b0010005-0000-0000-0000-000000000004'::uuid, 'd1000001-0000-0000-0000-000000000006'::uuid, 'payos', 'qr', 'PAY-ADV-2611-2', 2500000, 'PAID', '2026-09-11 14:00:00+07'::timestamptz, '2026-09-11 13:30:00+07'::timestamptz),
  ('ea020005-0000-0000-0000-000000000002'::uuid, 'b0020005-0000-0000-0000-000000000002'::uuid, 'd1000001-0000-0000-0000-000000000007'::uuid, 'payos', 'qr', 'PAY-ADV-2611-3', 1200000, 'PAID', '2026-09-11 15:30:00+07'::timestamptz, '2026-09-11 15:00:00+07'::timestamptz),
  ('ea030005-0000-0000-0000-000000000002'::uuid, 'b0030005-0000-0000-0000-000000000002'::uuid, 'd1000001-0000-0000-0000-000000000008'::uuid, 'payos', 'qr', 'PAY-ADV-2611-4', 1440000, 'PAID', '2026-09-11 16:00:00+07'::timestamptz, '2026-09-11 15:30:00+07'::timestamptz),

  ('ea010005-0000-0000-0000-000000000005'::uuid, 'b0010005-0000-0000-0000-000000000005'::uuid, 'd1000001-0000-0000-0000-000000000009'::uuid, 'payos', 'qr', 'PAY-ADV-2612-1', 700000, 'PAID', '2026-09-12 09:00:00+07'::timestamptz, '2026-09-12 08:30:00+07'::timestamptz),
  ('ea010005-0000-0000-0000-000000000006'::uuid, 'b0010005-0000-0000-0000-000000000006'::uuid, 'd1000001-0000-0000-0000-000000000010'::uuid, 'payos', 'qr', 'PAY-ADV-2612-2', 8000000, 'PAID', '2026-09-12 10:30:00+07'::timestamptz, '2026-09-12 10:00:00+07'::timestamptz),
  ('ea020005-0000-0000-0000-000000000003'::uuid, 'b0020005-0000-0000-0000-000000000003'::uuid, 'd1000001-0000-0000-0000-000000000001'::uuid, 'payos', 'qr', 'PAY-ADV-2612-3', 960000, 'PAID', '2026-09-12 11:00:00+07'::timestamptz, '2026-09-12 10:20:00+07'::timestamptz),
  ('ea030005-0000-0000-0000-000000000003'::uuid, 'b0030005-0000-0000-0000-000000000003'::uuid, 'd1000001-0000-0000-0000-000000000002'::uuid, 'payos', 'qr', 'PAY-ADV-2612-4', 9000000, 'PAID', '2026-09-12 11:30:00+07'::timestamptz, '2026-09-12 11:00:00+07'::timestamptz),

  -- 2027 Early Advance Payments (T1 & T2 2027)
  ('ea010006-0000-0000-0000-000000000001'::uuid, 'b0010006-0000-0000-0000-000000000001'::uuid, 'd1000001-0000-0000-0000-000000000001'::uuid, 'payos', 'qr', 'PAY-ADV-2701-1', 18000000, 'PAID', '2026-09-12 13:00:00+07'::timestamptz, '2026-09-12 12:30:00+07'::timestamptz),
  ('ea010006-0000-0000-0000-000000000002'::uuid, 'b0010006-0000-0000-0000-000000000002'::uuid, 'd1000001-0000-0000-0000-000000000002'::uuid, 'payos', 'qr', 'PAY-ADV-2701-2', 1200000, 'PAID', '2026-09-12 13:30:00+07'::timestamptz, '2026-09-12 13:00:00+07'::timestamptz),
  ('ea020006-0000-0000-0000-000000000001'::uuid, 'b0020006-0000-0000-0000-000000000003'::uuid, 'd1000001-0000-0000-0000-000000000003'::uuid, 'payos', 'qr', 'PAY-ADV-2701-3', 7500000, 'PAID', '2026-09-12 14:00:00+07'::timestamptz, '2026-09-12 13:40:00+07'::timestamptz),
  ('ea030006-0000-0000-0000-000000000001'::uuid, 'b0030006-0000-0000-0000-000000000004'::uuid, 'd1000001-0000-0000-0000-000000000004'::uuid, 'payos', 'qr', 'PAY-ADV-2701-4', 9000000, 'PAID', '2026-09-12 14:15:00+07'::timestamptz, '2026-09-12 13:50:00+07'::timestamptz),

  ('ea010006-0000-0000-0000-000000000003'::uuid, 'b0010006-0000-0000-0000-000000000003'::uuid, 'd1000001-0000-0000-0000-000000000005'::uuid, 'payos', 'qr', 'PAY-ADV-2702-1', 18000000, 'PAID', '2026-09-12 14:30:00+07'::timestamptz, '2026-09-12 14:00:00+07'::timestamptz),
  ('ea010006-0000-0000-0000-000000000004'::uuid, 'b0010006-0000-0000-0000-000000000004'::uuid, 'd1000001-0000-0000-0000-000000000006'::uuid, 'payos', 'qr', 'PAY-ADV-2702-2', 750000, 'PAID', '2026-09-12 15:00:00+07'::timestamptz, '2026-09-12 14:20:00+07'::timestamptz),
  ('ea020006-0000-0000-0000-000000000002'::uuid, 'b0020006-0000-0000-0000-000000000002'::uuid, 'd1000001-0000-0000-0000-000000000007'::uuid, 'payos', 'qr', 'PAY-ADV-2702-3', 2200000, 'PAID', '2026-09-12 15:15:00+07'::timestamptz, '2026-09-12 14:50:00+07'::timestamptz),
  ('ea030006-0000-0000-0000-000000000002'::uuid, 'b0030006-0000-0000-0000-000000000002'::uuid, 'd1000001-0000-0000-0000-000000000008'::uuid, 'payos', 'qr', 'PAY-ADV-2702-4', 1080000, 'PAID', '2026-09-12 15:30:00+07'::timestamptz, '2026-09-12 15:00:00+07'::timestamptz)
ON CONFLICT (id) DO NOTHING;

-- CHECKIN LOGS for historical completed bookings
INSERT INTO checkin_logs (id, booking_id, staff_user_id, checkin_at, checkout_at) VALUES
  ('c1100002-0000-0000-0000-000000000001'::uuid, 'b0010002-0000-0000-0000-000000000001'::uuid, 'd3000001-0000-0000-0000-000000000001'::uuid, '2026-01-05 08:05:00+07'::timestamptz, '2026-02-05 18:00:00+07'::timestamptz),
  ('c1100002-0000-0000-0000-000000000002'::uuid, 'b0010002-0000-0000-0000-000000000002'::uuid, 'd3000001-0000-0000-0000-000000000001'::uuid, '2026-01-15 08:55:00+07'::timestamptz, '2026-01-15 13:00:00+07'::timestamptz),
  ('c1200002-0000-0000-0000-000000000001'::uuid, 'b0020002-0000-0000-0000-000000000001'::uuid, 'd3000001-0000-0000-0000-000000000002'::uuid, '2026-01-08 08:10:00+07'::timestamptz, '2026-02-08 18:00:00+07'::timestamptz),
  ('c1300002-0000-0000-0000-000000000001'::uuid, 'b0030002-0000-0000-0000-000000000001'::uuid, 'd3000001-0000-0000-0000-000000000003'::uuid, '2026-01-10 08:00:00+07'::timestamptz, '2026-02-10 18:00:00+07'::timestamptz),

  ('c1100003-0000-0000-0000-000000000001'::uuid, 'b0010003-0000-0000-0000-000000000001'::uuid, 'd3000001-0000-0000-0000-000000000001'::uuid, '2026-04-01 08:00:00+07'::timestamptz, '2026-05-01 18:00:00+07'::timestamptz),
  ('c1100003-0000-0000-0000-000000000002'::uuid, 'b0010003-0000-0000-0000-000000000002'::uuid, 'd3000001-0000-0000-0000-000000000001'::uuid, '2026-04-14 08:50:00+07'::timestamptz, '2026-04-14 17:00:00+07'::timestamptz),
  ('c1200003-0000-0000-0000-000000000001'::uuid, 'b0020003-0000-0000-0000-000000000001'::uuid, 'd3000001-0000-0000-0000-000000000002'::uuid, '2026-04-05 08:00:00+07'::timestamptz, '2026-05-05 18:00:00+07'::timestamptz),
  ('c1300003-0000-0000-0000-000000000001'::uuid, 'b0030003-0000-0000-0000-000000000001'::uuid, 'd3000001-0000-0000-0000-000000000003'::uuid, '2026-04-20 09:00:00+07'::timestamptz, '2026-04-20 17:00:00+07'::timestamptz),

  ('c1100004-0000-0000-0000-000000000001'::uuid, 'b0010004-0000-0000-0000-000000000001'::uuid, 'd3000001-0000-0000-0000-000000000001'::uuid, '2026-07-01 08:00:00+07'::timestamptz, '2026-08-01 18:00:00+07'::timestamptz),
  ('c1100004-0000-0000-0000-000000000002'::uuid, 'b0010004-0000-0000-0000-000000000002'::uuid, 'd3000001-0000-0000-0000-000000000001'::uuid, '2026-07-16 09:00:00+07'::timestamptz, '2026-07-16 15:00:00+07'::timestamptz),
  ('c1200004-0000-0000-0000-000000000001'::uuid, 'b0020004-0000-0000-0000-000000000001'::uuid, 'd3000001-0000-0000-0000-000000000002'::uuid, '2026-07-20 08:00:00+07'::timestamptz, '2026-07-20 18:00:00+07'::timestamptz),
  ('c1300004-0000-0000-0000-000000000001'::uuid, 'b0030004-0000-0000-0000-000000000001'::uuid, 'd3000001-0000-0000-0000-000000000003'::uuid, '2026-07-05 08:00:00+07'::timestamptz, '2026-08-05 18:00:00+07'::timestamptz)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. DEMO AUDIT LOGS (realistic logs with relative NOW() timestamps)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_name VARCHAR(100) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO audit_logs (id, user_id, action, entity_name, entity_id, old_values, new_values, ip_address, user_agent, created_at) VALUES
  ('a0000001-0000-0000-0000-000000000001'::uuid, 'd4000001-0000-0000-0000-000000000001'::uuid, 'CREATE_BRANCH', 'branches', 'b1000000-0000-0000-0000-000000000001'::uuid, NULL, '{"name": "CoSpace Nguyễn Huệ (Q1)", "code": "Q1"}'::jsonb, '127.0.0.1', 'Mozilla/5.0 Chrome/120.0', NOW() - INTERVAL '15 days'),
  ('a0000001-0000-0000-0000-000000000002'::uuid, 'd4000001-0000-0000-0000-000000000001'::uuid, 'CREATE_BRANCH', 'branches', 'b2000000-0000-0000-0000-000000000002'::uuid, NULL, '{"name": "CoSpace Võ Văn Tần (Q3)", "code": "Q3"}'::jsonb, '127.0.0.1', 'Mozilla/5.0 Chrome/120.0', NOW() - INTERVAL '14 days'),
  ('a0000001-0000-0000-0000-000000000003'::uuid, 'd4000001-0000-0000-0000-000000000001'::uuid, 'CREATE_BRANCH', 'branches', 'b3000000-0000-0000-0000-000000000003'::uuid, NULL, '{"name": "CoSpace Đỗ Xuân Hợp (Thủ Đức)", "code": "TD"}'::jsonb, '127.0.0.1', 'Mozilla/5.0 Chrome/120.0', NOW() - INTERVAL '13 days'),
  ('a0000001-0000-0000-0000-000000000004'::uuid, 'd4000001-0000-0000-0000-000000000001'::uuid, 'UPDATE', 'price_policies', 'p0000001-0000-0000-0000-000000000001'::uuid, '{"price": 20000}'::jsonb, '{"price": 25000}'::jsonb, '127.0.0.1', 'Mozilla/5.0 Chrome/120.0', NOW() - INTERVAL '10 days'),
  ('a0000001-0000-0000-0000-000000000005'::uuid, 'd4000001-0000-0000-0000-000000000001'::uuid, 'CREATE', 'extra_services', 'e0000001-0000-0000-0000-000000000001'::uuid, NULL, '{"name": "Cà Phê Phin", "price": 20000}'::jsonb, '127.0.0.1', 'Mozilla/5.0 Chrome/120.0', NOW() - INTERVAL '9 days'),
  ('a0000001-0000-0000-0000-000000000006'::uuid, 'd2000001-0000-0000-0000-000000000001'::uuid, 'UPDATE_WORKSPACE', 'workspaces', 'c1010001-0000-0000-0000-000000000001'::uuid, '{"status": "maintenance"}'::jsonb, '{"status": "active"}'::jsonb, '14.241.120.45', 'Mozilla/5.0 Mac OS', NOW() - INTERVAL '7 days'),
  ('a0000001-0000-0000-0000-000000000007'::uuid, 'd2000001-0000-0000-0000-000000000001'::uuid, 'TOGGLE_SERVICE', 'extra_services', 'e0000001-0000-0000-0000-000000000011'::uuid, '{"is_active": false}'::jsonb, '{"is_active": true}'::jsonb, '14.241.120.45', 'Mozilla/5.0 Mac OS', NOW() - INTERVAL '5 days'),
  ('a0000001-0000-0000-0000-000000000008'::uuid, 'd1000001-0000-0000-0000-000000000008'::uuid, 'CREATE_BOOKING', 'bookings', 'b0010001-0000-0000-0000-000000000011'::uuid, NULL, '{"booking_code": "CS-BK-2609-0011", "amount": 530000}'::jsonb, '113.161.72.10', 'Mobile Safari', NOW() - INTERVAL '5 days' + TIME '13:45:00'),
  ('a0000001-0000-0000-0000-000000000009'::uuid, 'd1000001-0000-0000-0000-000000000008'::uuid, 'PAYMENT', 'payments', 'ea010001-0000-0000-0000-000000000011'::uuid, NULL, '{"method": "payos", "amount": 530000, "status": "PAID"}'::jsonb, '113.161.72.10', 'Mobile Safari', NOW() - INTERVAL '5 days' + TIME '13:50:00'),
  ('a0000001-0000-0000-0000-000000000010'::uuid, 'd3000001-0000-0000-0000-000000000001'::uuid, 'CHECKIN', 'bookings', 'b0010001-0000-0000-0000-000000000011'::uuid, '{"status": "CONFIRMED"}'::jsonb, '{"status": "CHECKED_IN"}'::jsonb, '192.168.1.50', 'Staff Terminal Q1', NOW() - INTERVAL '5 days' + TIME '14:02:00'),
  ('a0000001-0000-0000-0000-000000000011'::uuid, 'd3000001-0000-0000-0000-000000000001'::uuid, 'CHECKOUT', 'bookings', 'b0010001-0000-0000-0000-000000000011'::uuid, '{"status": "CHECKED_IN"}'::jsonb, '{"status": "COMPLETED"}'::jsonb, '192.168.1.50', 'Staff Terminal Q1', NOW() - INTERVAL '5 days' + TIME '17:05:00'),
  ('a0000001-0000-0000-0000-000000000012'::uuid, 'd1000001-0000-0000-0000-000000000002'::uuid, 'CREATE_BOOKING', 'bookings', 'b0010001-0000-0000-0000-000000000009'::uuid, NULL, '{"booking_code": "CS-BK-2609-0009", "amount": 255000}'::jsonb, '14.169.80.22', 'Chrome Windows', NOW() - INTERVAL '3 days' + TIME '07:30:00'),
  ('a0000001-0000-0000-0000-000000000013'::uuid, 'd1000001-0000-0000-0000-000000000002'::uuid, 'PAYMENT', 'payments', 'ea010001-0000-0000-0000-000000000009'::uuid, NULL, '{"method": "momo", "amount": 255000, "status": "PAID"}'::jsonb, '14.169.80.22', 'Chrome Windows', NOW() - INTERVAL '3 days' + TIME '07:35:00'),
  ('a0000001-0000-0000-0000-000000000014'::uuid, 'd3000001-0000-0000-0000-000000000001'::uuid, 'CHECKIN', 'bookings', 'b0010001-0000-0000-0000-000000000009'::uuid, '{"status": "CONFIRMED"}'::jsonb, '{"status": "CHECKED_IN"}'::jsonb, '192.168.1.50', 'Staff Terminal Q1', NOW() - INTERVAL '3 days' + TIME '08:05:00'),
  ('a0000001-0000-0000-0000-000000000015'::uuid, 'd3000001-0000-0000-0000-000000000001'::uuid, 'CHECKOUT', 'bookings', 'b0010001-0000-0000-0000-000000000009'::uuid, '{"status": "CHECKED_IN"}'::jsonb, '{"status": "COMPLETED"}'::jsonb, '192.168.1.50', 'Staff Terminal Q1', NOW() - INTERVAL '3 days' + TIME '18:02:00'),
  ('a0000001-0000-0000-0000-000000000016'::uuid, 'd1000001-0000-0000-0000-000000000001'::uuid, 'CREATE_BOOKING', 'bookings', 'b0010001-0000-0000-0000-000000000007'::uuid, NULL, '{"booking_code": "CS-BK-2609-0007", "amount": 240000}'::jsonb, '118.69.182.5', 'Chrome Mac', NOW() - INTERVAL '1 day' + TIME '08:15:00'),
  ('a0000001-0000-0000-0000-000000000017'::uuid, 'd1000001-0000-0000-0000-000000000001'::uuid, 'PAYMENT', 'payments', 'ea010001-0000-0000-0000-000000000007'::uuid, NULL, '{"method": "payos", "amount": 240000, "status": "PAID"}'::jsonb, '118.69.182.5', 'Chrome Mac', NOW() - INTERVAL '1 day' + TIME '08:20:00'),
  ('a0000001-0000-0000-0000-000000000018'::uuid, 'd3000001-0000-0000-0000-000000000001'::uuid, 'CHECKIN', 'bookings', 'b0010001-0000-0000-0000-000000000007'::uuid, '{"status": "CONFIRMED"}'::jsonb, '{"status": "CHECKED_IN"}'::jsonb, '192.168.1.50', 'Staff Terminal Q1', NOW() - INTERVAL '1 day' + TIME '08:58:00'),
  ('a0000001-0000-0000-0000-000000000019'::uuid, 'd3000001-0000-0000-0000-000000000001'::uuid, 'CHECKOUT', 'bookings', 'b0010001-0000-0000-0000-000000000007'::uuid, '{"status": "CHECKED_IN"}'::jsonb, '{"status": "COMPLETED"}'::jsonb, '192.168.1.50', 'Staff Terminal Q1', NOW() - INTERVAL '1 day' + TIME '17:02:00'),
  ('a0000001-0000-0000-0000-000000000020'::uuid, 'd1000001-0000-0000-0000-000000000003'::uuid, 'CREATE_BOOKING', 'bookings', 'b0010001-0000-0000-0000-000000000004'::uuid, NULL, '{"booking_code": "CS-BK-2609-0004", "amount": 235000}'::jsonb, '192.168.1.50', 'Staff Terminal Q1', (CURRENT_DATE + TIME '07:50:00') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
  ('a0000001-0000-0000-0000-000000000021'::uuid, 'd3000001-0000-0000-0000-000000000001'::uuid, 'PAYMENT', 'payments', 'ea010001-0000-0000-0000-000000000004'::uuid, NULL, '{"method": "cash", "amount": 235000, "status": "PAID"}'::jsonb, '192.168.1.50', 'Staff Terminal Q1', (CURRENT_DATE + TIME '07:55:00') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
  ('a0000001-0000-0000-0000-000000000022'::uuid, 'd3000001-0000-0000-0000-000000000001'::uuid, 'CHECKIN', 'bookings', 'b0010001-0000-0000-0000-000000000004'::uuid, '{"status": "CONFIRMED"}'::jsonb, '{"status": "CHECKED_IN"}'::jsonb, '192.168.1.50', 'Staff Terminal Q1', (CURRENT_DATE + TIME '08:02:00') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
  ('a0000001-0000-0000-0000-000000000023'::uuid, 'd1000001-0000-0000-0000-000000000007'::uuid, 'CREATE_BOOKING', 'bookings', 'b0010001-0000-0000-0000-000000000005'::uuid, NULL, '{"booking_code": "CS-BK-2609-0005", "amount": 200000}'::jsonb, '42.112.98.15', 'Chrome Android', (CURRENT_DATE + TIME '07:15:00') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
  ('a0000001-0000-0000-0000-000000000024'::uuid, 'd3000001-0000-0000-0000-000000000001'::uuid, 'CHECKIN', 'bookings', 'b0010001-0000-0000-0000-000000000005'::uuid, '{"status": "CONFIRMED"}'::jsonb, '{"status": "CHECKED_IN"}'::jsonb, '192.168.1.50', 'Staff Terminal Q1', (CURRENT_DATE + TIME '07:32:00') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
  ('a0000001-0000-0000-0000-000000000025'::uuid, 'd1000001-0000-0000-0000-000000000001'::uuid, 'CREATE_BOOKING', 'bookings', 'b0010001-0000-0000-0000-000000000001'::uuid, NULL, '{"booking_code": "CS-BK-2609-0001", "amount": 120000}'::jsonb, '118.69.182.5', 'Chrome Mac', (CURRENT_DATE + TIME '07:45:00') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
  ('a0000001-0000-0000-0000-000000000026'::uuid, 'd1000001-0000-0000-0000-000000000001'::uuid, 'PAYMENT', 'payments', 'ea010001-0000-0000-0000-000000000001'::uuid, NULL, '{"method": "payos", "amount": 120000, "status": "PAID"}'::jsonb, '118.69.182.5', 'Chrome Mac', (CURRENT_DATE + TIME '07:48:00') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
  ('a0000001-0000-0000-0000-000000000027'::uuid, 'd1000001-0000-0000-0000-000000000002'::uuid, 'CREATE_BOOKING', 'bookings', 'b0010001-0000-0000-0000-000000000002'::uuid, NULL, '{"booking_code": "CS-BK-2609-0002", "amount": 200000}'::jsonb, '14.169.80.22', 'Chrome Windows', (CURRENT_DATE + TIME '08:30:00') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
  ('a0000001-0000-0000-0000-000000000028'::uuid, 'd1000001-0000-0000-0000-000000000004'::uuid, 'CREATE_BOOKING', 'bookings', 'b0010001-0000-0000-0000-000000000003'::uuid, NULL, '{"booking_code": "CS-BK-2609-0003", "amount": 300000}'::jsonb, '27.72.100.5', 'Firefox Windows', (CURRENT_DATE + TIME '08:45:00') AT TIME ZONE 'Asia/Ho_Chi_Minh')
ON CONFLICT (id) DO NOTHING;

COMMIT;
