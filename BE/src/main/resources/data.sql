-- Spring Boot auto-runs data.sql on startup (spring.sql.init.mode=always)
-- Master seed for Workspace Types, Extra Services (Active/Inactive), and Cancellation Policies

-- 1. WORKSPACE TYPES
INSERT INTO workspace_types (id, code, name, capacity_default)
VALUES
  ('a1000000-0000-0000-0000-000000000001'::uuid, 'desk', 'Bàn làm việc linh hoạt (Hot Desk)', 1),
  ('a1000000-0000-0000-0000-000000000002'::uuid, 'meeting_room', 'Phòng họp tiêu chuẩn (Meeting Room)', 8),
  ('a1000000-0000-0000-0000-000000000003'::uuid, 'private_office', 'Văn phòng riêng tư (Private Office)', 4),
  ('a1000000-0000-0000-0000-000000000004'::uuid, 'standing_desk', 'Bàn đứng công thái học (Standing Desk)', 1),
  ('a1000000-0000-0000-0000-000000000005'::uuid, 'phone_booth', 'Cabin cách âm (Phone Booth)', 1),
  ('a1000000-0000-0000-0000-000000000006'::uuid, 'event_space', 'Khu vực sự kiện / Hội trường', 30)
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  capacity_default = EXCLUDED.capacity_default;

-- 2. EXTRA SERVICES (Đầy đủ cả BẬT & TẮT, Toàn hệ thống & Ghi đè chi nhánh)
INSERT INTO extra_services (id, branch_id, code, name, service_type, unit, price, is_active, description)
VALUES
  -- Global Defaults (Đang BẬT)
  ('e0000001-0000-0000-0000-000000000001'::uuid, NULL, 'cafe-latte',    'Cà Phê Latte Sữa Tươi',         'drink',    'ly',    35000, true, 'Latte pha máy từ hạt Arabica Cầu Đất nguyên chất'),
  ('e0000001-0000-0000-0000-000000000002'::uuid, NULL, 'tra-dao',       'Trà Đào Cam Sả Tươi',           'drink',    'ly',    40000, true, 'Trà đào thanh nhiệt kèm miếng đào giòn và sả tươi'),
  ('e0000001-0000-0000-0000-000000000003'::uuid, NULL, 'nuoc-ep',       'Nước Ép Trái Cây Tươi',          'drink',    'ly',    45000, true, 'Nước ép cam / dưa hấu / ổi nguyên chất 100%'),
  ('e0000001-0000-0000-0000-000000000004'::uuid, NULL, 'in-trang-den',  'In Ấn Trắng Đen A4',             'printing', 'trang',  1000, true, 'In ấn laser tài liệu văn phòng giấy Double A 80gsm'),
  ('e0000001-0000-0000-0000-000000000005'::uuid, NULL, 'in-mau',        'In Ấn Màu Laser A4',             'printing', 'trang',  3000, true, 'In màu sắc nét cho báo cáo, biểu đồ, profile'),
  ('e0000001-0000-0000-0000-000000000006'::uuid, NULL, 'banh-mi',       'Bánh Mì Thịt Nguội & Pate',      'meal',     'phần',  30000, true, 'Bánh mì giòn nóng kèm pate, chả lụa và dưa góp'),
  ('e0000001-0000-0000-0000-000000000007'::uuid, NULL, 'com-trua',      'Cơm Trưa Văn Phòng Healthy',     'meal',     'phần',  55000, true, 'Set cơm trưa cân bằng dinh dưỡng thay đổi mỗi ngày'),
  ('e0000001-0000-0000-0000-000000000008'::uuid, NULL, 'may-chieu-4k',  'Máy Chiếu 4K & Màn Chiếu 150in', 'equipment', 'giờ',  150000, true, 'Máy chiếu laser 4K siêu nét hỗ trợ HDMI & Không dây'),
  ('e0000001-0000-0000-0000-000000000009'::uuid, NULL, 'smart-board',   'Bảng Tương Tác Cảm Ứng 75in',    'equipment', 'giờ',  100000, true, 'Bảng viết cảm ứng đa điểm hỗ trợ lưu file & họp online'),

  -- Global Defaults (Đang TẮT - Dành cho demo tính năng Bật/Tắt)
  ('e0000001-0000-0000-0000-000000000021'::uuid, NULL, 'teabreak-vip',  'Gói Tiệc Trà Teabreak Cao Cấp',  'meal',     'phần', 120000, false, 'Tạm ngưng do đối tác bánh bảo trì hệ thống bếp'),
  ('e0000001-0000-0000-0000-000000000022'::uuid, NULL, 'do-xe-oto',     'Chỗ Đỗ Xe Ô Tô Tầng Hầm B2',     'facility', 'ngày', 150000, false, 'Tạm ngưng phục vụ do hầm xe đang bảo dưỡng sơn sàn'),
  ('e0000001-0000-0000-0000-000000000023'::uuid, NULL, 'livestream-kit', 'Bộ Livestream & Hội Thảo 4K',   'equipment', 'buổi', 500000, false, 'Tạm ngưng do đang nâng cấp firmware thiết bị'),

  -- Branch 1 (Q1) Ghi đè & Riêng biệt
  ('e0000001-0000-0000-0000-000000000011'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'cafe-latte',   'Cà Phê Latte Pha Máy Premium Q1', 'drink',    'ly',    45000, true,  'Phiên bản Latte đặc biệt cho chi nhánh Quận 1'),
  ('e0000001-0000-0000-0000-000000000012'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'combo-sang',   'Combo Sáng Q1 (Bánh Mì + Cafe Đá)', 'meal',  'phần',  65000, true,  'Bữa sáng tiện lợi cho thành viên chi nhánh Q1'),
  ('e0000001-0000-0000-0000-000000000013'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'podcast-room', 'Phòng Thu Podcast Mini Q1',         'facility','giờ',  250000, false, 'Đang hoàn thiện cách âm, sắp ra mắt tại Q1'),

  -- Branch 2 (Q3) Ghi đè & Riêng biệt
  ('e0000001-0000-0000-0000-000000000031'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'tra-dao',      'Trà Đào Hạt Chia Q3',             'drink',    'ly',    38000, true,  'Trà đào thơm mát giảm giá riêng cho Q3'),
  ('e0000001-0000-0000-0000-000000000032'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid, 'may-chieu-4k', 'Máy Chiếu Hội Thảo Q3',          'equipment','giờ',  120000, true,  'Mức giá ưu đãi cho phòng họp tại Q3')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  service_type = EXCLUDED.service_type,
  unit = EXCLUDED.unit,
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  description = EXCLUDED.description;

-- 3. CANCELLATION POLICIES (Đầy đủ 5 bậc logic, Toàn hệ thống & Ghi đè chi nhánh)
INSERT INTO cancellation_policies (id, name, rule_type, min_value, max_value, refund_percent, priority, branch_id, workspace_type_id, is_active, effective_from)
VALUES
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
