-- ====================================================================
-- Migration: Seed Customer Community Posts, Policies & Notifications
-- ====================================================================

-- 1. Policies: Cancellation Policies (3 tiers)
INSERT INTO cancellation_policies (
    id, name, rule_type, min_value, max_value, refund_percent, priority, branch_id, is_active, effective_from
) VALUES 
(
    'c1000000-0000-0000-0000-000000000001',
    'Hủy trước 24 giờ (Hoàn 100%)',
    'HOURS_BEFORE_START',
    24,
    999999,
    100.00,
    1,
    NULL,
    true,
    now() - interval '30 days'
),
(
    'c2000000-0000-0000-0000-000000000002',
    'Hủy trước 12 - 24 giờ (Hoàn 50%)',
    'HOURS_BEFORE_START',
    12,
    24,
    50.00,
    2,
    NULL,
    true,
    now() - interval '30 days'
),
(
    'c3000000-0000-0000-0000-000000000003',
    'Hủy dưới 12 giờ (Không hoàn tiền)',
    'HOURS_BEFORE_START',
    0,
    12,
    0.00,
    3,
    NULL,
    true,
    now() - interval '30 days'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Seed Realistic Members & Profiles
-- User 1: Trần Minh Hoàng (AI Lead)
INSERT INTO users (id, email, password_hash, full_name, phone, role, status, created_at)
VALUES (
    'aa111111-1111-1111-1111-111111111111',
    'hoang.tran@cospace.vn',
    '$2a$10$wN31XvQ0bB4VwRz29e1Q1uG6Yq/YvN9R8y9o6H8K5m2.T1aW5iN5C',
    'Trần Minh Hoàng',
    '0909123456',
    'customer',
    'active',
    now() - interval '60 days'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (user_id, profession, company, bio, contact_email, contact_phone, contact_link, contact_public, primary_branch_id)
VALUES (
    'aa111111-1111-1111-1111-111111111111',
    'Lead AI Engineer',
    'VNG Corporation',
    'Chuyên nghiên cứu và ứng dụng Generative AI, RAG và tối ưu LLM phục vụ hơn 10 triệu người dùng. Thường xuyên làm việc tại CoSpace Nguyễn Huệ.',
    'hoang.tran@cospace.vn',
    '0909123456',
    '{"linkedin":"https://linkedin.com/in/hoang-tran-ai","github":"https://github.com/hoangtran-ai","website":"https://hoangtran.dev"}',
    true,
    'b1000000-0000-0000-0000-000000000001'
) ON CONFLICT (user_id) DO UPDATE SET
    profession = EXCLUDED.profession,
    company = EXCLUDED.company,
    bio = EXCLUDED.bio,
    contact_link = EXCLUDED.contact_link,
    contact_public = true;

-- User 2: Nguyễn Phương Linh (Product Designer)
INSERT INTO users (id, email, password_hash, full_name, phone, role, status, created_at)
VALUES (
    'aa222222-2222-2222-2222-222222222222',
    'linh.nguyen@cospace.vn',
    '$2a$10$wN31XvQ0bB4VwRz29e1Q1uG6Yq/YvN9R8y9o6H8K5m2.T1aW5iN5C',
    'Nguyễn Phương Linh',
    '0918234567',
    'customer',
    'active',
    now() - interval '45 days'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (user_id, profession, company, bio, contact_email, contact_phone, contact_link, contact_public, primary_branch_id)
VALUES (
    'aa222222-2222-2222-2222-222222222222',
    'Senior Product Designer',
    'MoMo Fintech',
    '7 năm kinh nghiệm thiết kế trải nghiệm người dùng trong mảng Fintech và E-commerce. Đam mê Design System và Micro-interactions.',
    'linh.nguyen@cospace.vn',
    '0918234567',
    '{"linkedin":"https://linkedin.com/in/linh-product-designer","github":"https://github.com/linh-ux","website":"https://linhdesign.co"}',
    true,
    'b1000000-0000-0000-0000-000000000001'
) ON CONFLICT (user_id) DO UPDATE SET
    profession = EXCLUDED.profession,
    company = EXCLUDED.company,
    bio = EXCLUDED.bio,
    contact_link = EXCLUDED.contact_link,
    contact_public = true;

-- User 3: Đặng Quốc Bảo (Startup Founder)
INSERT INTO users (id, email, password_hash, full_name, phone, role, status, created_at)
VALUES (
    'aa333333-3333-3333-3333-333333333333',
    'bao.dang@cospace.vn',
    '$2a$10$wN31XvQ0bB4VwRz29e1Q1uG6Yq/YvN9R8y9o6H8K5m2.T1aW5iN5C',
    'Đặng Quốc Bảo',
    '0988776655',
    'customer',
    'active',
    now() - interval '90 days'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (user_id, profession, company, bio, contact_email, contact_phone, contact_link, contact_public, primary_branch_id)
VALUES (
    'aa333333-3333-3333-3333-333333333333',
    'Founder & CEO',
    'FinFlow Payments',
    'Đang xây dựng giải pháp thanh toán B2B xuyên biên giới cho các doanh nghiệp xuất khẩu. Tìm kiếm đối tác kỹ thuật và nhà đầu tư thiên thần.',
    'bao.dang@cospace.vn',
    '0988776655',
    '{"linkedin":"https://linkedin.com/in/bao-dang-fintech","github":"","website":"https://finflow.asia"}',
    true,
    'b2000000-0000-0000-0000-000000000002'
) ON CONFLICT (user_id) DO UPDATE SET
    profession = EXCLUDED.profession,
    company = EXCLUDED.company,
    bio = EXCLUDED.bio,
    contact_link = EXCLUDED.contact_link,
    contact_public = true;

-- User 4: Vũ Thu Thảo (Cloud & DevOps Architect)
INSERT INTO users (id, email, password_hash, full_name, phone, role, status, created_at)
VALUES (
    'aa444444-4444-4444-4444-444444444444',
    'thao.vu@cospace.vn',
    '$2a$10$wN31XvQ0bB4VwRz29e1Q1uG6Yq/YvN9R8y9o6H8K5m2.T1aW5iN5C',
    'Vũ Thu Thảo',
    '0976543210',
    'customer',
    'active',
    now() - interval '30 days'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (user_id, profession, company, bio, contact_email, contact_phone, contact_link, contact_public, primary_branch_id)
VALUES (
    'aa444444-4444-4444-4444-444444444444',
    'Cloud Architect',
    'FPT Software',
    'AWS Solutions Architect Professional, chuyên Kubernetes, CI/CD và kiến trúc serverless chịu tải cao. Làm việc linh hoạt tại CoSpace Cầu Giấy.',
    'thao.vu@cospace.vn',
    '0976543210',
    '{"linkedin":"https://linkedin.com/in/thao-vu-cloud","github":"https://github.com/thaovu-k8s","website":""}',
    true,
    'b3000000-0000-0000-0000-000000000003'
) ON CONFLICT (user_id) DO UPDATE SET
    profession = EXCLUDED.profession,
    company = EXCLUDED.company,
    bio = EXCLUDED.bio,
    contact_link = EXCLUDED.contact_link,
    contact_public = true;

-- Update current active user profile with social links JSON
UPDATE profiles
SET contact_link = '{"linkedin":"https://linkedin.com/in/khoa-dang-cospace","github":"https://github.com/khoadang-dev","website":"https://cospace.vn"}'
WHERE user_id = '70d2971d-575a-4d7a-a032-51346c176abc' AND (contact_link IS NULL OR contact_link NOT LIKE '{%');

-- Skills and Interests mapping for seed users
INSERT INTO profile_skills (profile_user_id, tag_id, level) VALUES
('aa111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111005', 5), -- AI
('aa111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111008', 4), -- Data Science
('aa111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111002', 4), -- Backend
('aa222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111004', 5), -- UI/UX
('aa222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111001', 3), -- Frontend
('aa333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111011', 5), -- Fintech
('aa444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111007', 5)  -- DevOps
ON CONFLICT DO NOTHING;

INSERT INTO profile_interests (profile_user_id, tag_id, priority) VALUES
('aa111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111009', 5), -- Khởi nghiệp
('aa222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111013', 5), -- Networking
('aa333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111010', 5), -- Đầu tư
('aa444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111014', 4)  -- Công nghệ
ON CONFLICT DO NOTHING;

-- 3. Seed Realistic Community Posts (8 Posts)
INSERT INTO posts (id, author_user_id, title, content, post_type, branch_id, status, created_at)
VALUES
(
    'bb100000-0000-0000-0000-000000000001',
    'aa333333-3333-3333-3333-333333333333',
    '[Tìm Co-founder Tech] Dự án trợ lý tài chính thông minh cho doanh nghiệp SME',
    'Chào các anh em tại CoSpace! Mình là Bảo, Founder của FinFlow. Team mình đang phát triển nền tảng tự động hóa dòng tiền và đối soát thanh toán cho doanh nghiệp vừa và nhỏ, hiện đã có 5 khách hàng B2B trả phí thử nghiệm.\n\nMình đang tìm kiếm một bạn Co-founder mảng Kỹ thuật (Fullstack hoặc Backend Dev chuyên Spring Boot / Node.js + PostgreSQL), có tư duy sản phẩm tốt và yêu thích bài toán Fintech.\n\nNếu bạn quan tâm hoặc muốn giao lưu cafe tại CoSpace Nam Kỳ Khởi Nghĩa, hãy kết nối với mình qua Profile nhé!',
    'seeking_partner',
    'b2000000-0000-0000-0000-000000000002',
    'published',
    now() - interval '2 hours'
),
(
    'bb200000-0000-0000-0000-000000000002',
    'aa111111-1111-1111-1111-111111111111',
    'Kinh nghiệm triển khai mô hình RAG với Postgres pgvector giảm 60% chi phí so với Pinecone',
    'Tuần vừa rồi team mình đã chuyển đổi thành công hệ thống Vector Search từ SaaS bên thứ ba về trực tiếp PostgreSQL sử dụng extension pgvector.\n\nMột số điểm rút ra đáng chú ý:\n1. Tận dụng hạ tầng DB hiện có, không mất thêm độ trễ mạng ra ngoài.\n2. Với tập dữ liệu dưới 1 triệu vectors, index HNSW trên pgvector cho tốc độ truy vấn dưới 15ms.\n3. Tiết kiệm hơn $400/tháng cho startup.\n\nMình có tài liệu tóm tắt chi tiết cấu hình và benchmark, bạn nào cần tham khảo cứ để lại phản hồi hoặc nhắn mình qua hồ sơ nha!',
    'sharing',
    'b1000000-0000-0000-0000-000000000001',
    'published',
    now() - interval '5 hours'
),
(
    'bb300000-0000-0000-0000-000000000003',
    'aa222222-2222-2222-2222-222222222222',
    '[Workshop Cuối Tuần] Xây dựng Design System từ Figma đến React Component',
    'Thứ Bảy tuần này (14:30 - 17:00), mình tổ chức một buổi chia sẻ thân mật tại Phòng Họp Lớn CoSpace Nguyễn Huệ về chủ đề:\n- Quy chuẩn Design Tokens 3 lớp (Primitive -> Semantic -> Component).\n- Cách đồng bộ tự động style từ Figma sang Tailwind CSS tokens.\n- Case study thực tế tối ưu hóa giao diện ứng dụng Fintech.\n\nSố lượng bàn ghế có hạn khoảng 15 người để tiện trao đổi, các bạn làm Frontend và UI/UX đăng ký sớm nhé. Hoàn toàn miễn phí cho thành viên CoSpace!',
    'event',
    'b1000000-0000-0000-0000-000000000001',
    'published',
    now() - interval '12 hours'
),
(
    'bb400000-0000-0000-0000-000000000004',
    'aa444444-4444-4444-4444-444444444444',
    'Hỏi về khu vực yên tĩnh để họp trực tuyến với khách hàng nước ngoài tại Chi nhánh Cầu Giấy',
    'Chào mọi người! Tuần tới mình có chuỗi cuộc họp quan trọng với đối tác bên Mỹ vào khung giờ tối (19h - 22h). Cho mình hỏi bên chi nhánh Cầu Giấy có phòng Phone Booth hoặc phòng họp nhỏ nào cách âm tốt và mạng ổn định vào ban đêm không ạ? Bạn nào đã từng họp ở đây cho mình xin ít kinh nghiệm nhé, cảm ơn nhiều!',
    'question',
    'b3000000-0000-0000-0000-000000000003',
    'published',
    now() - interval '1 day'
),
(
    'bb500000-0000-0000-0000-000000000005',
    'aa333333-3333-3333-3333-333333333333',
    'Tổng hợp 5 nguồn tài trợ không hoàn lại (Non-dilutive Grants) dành cho Tech Startup Việt Nam 2026',
    'Dành cho các anh chị em đang ấp ủ dự án công nghệ: thay vì vội vã bán cổ phần quá sớm ở định giá thấp, có nhiều quỹ hỗ trợ phát triển đang mở đơn:\n1. Quỹ Đổi mới sáng tạo Quốc gia (NIC Challenge).\n2. AWS Activate / Google for Startups Cloud Credits ($100k - $350k).\n3. Chương trình tài trợ mảng AI & Big Data từ ADB Ventures.\n\nChi tiết tiêu chí nộp và cách chuẩn bị Pitch Deck mình có ghi chú lại, bạn nào cần kết nối cứ liên hệ nhé!',
    'sharing',
    'b2000000-0000-0000-0000-000000000002',
    'published',
    now() - interval '2 days'
),
(
    'bb600000-0000-0000-0000-000000000006',
    'aa111111-1111-1111-1111-111111111111',
    '[Cần tìm cộng tác viên] Lập trình viên Mobile App (Flutter / React Native) dự án giáo dục',
    'Team mình đang cần một bạn Mobile Developer nhiều kinh nghiệm làm việc theo dạng hợp đồng 3 tháng, xây dựng ứng dụng luyện thi tiếng Anh tích hợp AI chấm bài phát âm và sửa lỗi ngữ pháp.\n\nYêu cầu chính:\n- Vững kiến thức Flutter hoặc React Native.\n- Có kinh nghiệm làm việc với WebSocket và Audio Streaming.\n- Làm việc trực tiếp tại CoSpace Nguyễn Huệ 2-3 buổi/tuần.\n\nThù lao thỏa thuận xứng đáng. Inbox hoặc nhắn qua thông tin hồ sơ của mình nhé!',
    'seeking_partner',
    'b1000000-0000-0000-0000-000000000001',
    'published',
    now() - interval '3 days'
),
(
    'bb700000-0000-0000-0000-000000000007',
    'aa444444-4444-4444-4444-444444444444',
    'Chia sẻ Template GitHub Actions CI/CD triển khai ứng dụng Spring Boot + Docker lên VPS',
    'Nhiều bạn mới làm dự án thường gặp khó khi dựng pipeline deploy tự động. Mình vừa open-source một template CI/CD hoàn chỉnh:\n- Tự động chạy unit test & lint code.\n- Build Docker image đa nền tảng và push lên GitHub Container Registry (GHCR).\n- SSH deploy an toàn sử dụng zero-downtime rolling update với Nginx.\n\nMọi người có thể vào profile của mình xem link GitHub để lấy code dùng thử nhé!',
    'sharing',
    'b3000000-0000-0000-0000-000000000003',
    'published',
    now() - interval '4 days'
),
(
    'bb800000-0000-0000-0000-000000000008',
    'aa222222-2222-2222-2222-222222222222',
    '[Cộng đồng] Khảo sát nhanh: Anh em freelancer tại CoSpace thường quản lý thời gian và tài chính thế nào?',
    'Làm việc tự do có rất nhiều ưu điểm nhưng khâu quản lý tài chính và cân bằng sức khỏe đôi khi là thách thức lớn. Mọi người có đang dùng app nào như Notion, Toggl hay giải pháp tự động nào để track thu nhập và tiến độ dự án không? Cùng chia sẻ kinh nghiệm để học hỏi nhau nhé!',
    'question',
    'b1000000-0000-0000-0000-000000000001',
    'published',
    now() - interval '5 days'
)
ON CONFLICT (id) DO NOTHING;

-- Link Post Tags
INSERT INTO post_tags (post_id, tag_id, source) VALUES
-- Post 1: SME FinTech
('bb100000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111011', 'manual'), -- Fintech
('bb100000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111009', 'manual'), -- Khởi nghiệp
('bb100000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111002', 'ai'),     -- Backend Dev
-- Post 2: RAG pgvector
('bb200000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111005', 'manual'), -- AI
('bb200000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111008', 'manual'), -- Data Science
('bb200000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111002', 'ai'),     -- Backend
-- Post 3: Workshop Design System
('bb300000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111004', 'manual'), -- UI/UX Design
('bb300000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111001', 'manual'), -- Frontend Dev
('bb300000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111013', 'ai'),     -- Networking
-- Post 4: Question Call Cau Giay
('bb400000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111014', 'ai'),     -- Công nghệ
('bb400000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111013', 'manual'), -- Networking
-- Post 5: Grants Startup
('bb500000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111009', 'manual'), -- Khởi nghiệp
('bb500000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111010', 'manual'), -- Đầu tư
-- Post 6: Mobile App EdTech
('bb600000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111006', 'manual'), -- Mobile App
('bb600000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111012', 'manual'), -- EdTech
('bb600000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111005', 'ai'),     -- AI
-- Post 7: CI/CD Template
('bb700000-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111007', 'manual'), -- DevOps & Cloud
('bb700000-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111002', 'ai'),     -- Backend Dev
-- Post 8: Freelancer discussion
('bb800000-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111013', 'manual'), -- Networking
('bb800000-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111009', 'ai')      -- Khởi nghiệp
ON CONFLICT DO NOTHING;

-- 4. Seed Booking Cancellations for existing CANCELLED Bookings
INSERT INTO booking_cancellations (
    id, booking_id, user_id, reason, refund_percent, refund_amount, penalty_amount, refund_status, applied_rule_json, processed_at, created_at, updated_at
) VALUES
(
    'bc100000-0000-0000-0000-000000000001',
    '19888348-394d-4dfa-951e-78ae1ac78e94', -- WH-P2MJMH (18,000,000 VND)
    '70d2971d-575a-4d7a-a032-51346c176abc',
    'Thay đổi lịch công tác đột xuất của đoàn công tác.',
    100,
    18000000,
    0,
    'processed',
    '{"policy_name": "Hủy trước 24 giờ (Hoàn 100%)", "refund_percent": 100, "rule_type": "HOURS_BEFORE_START", "hours_before": 48}'::jsonb,
    now() - interval '3 days',
    now() - interval '3 days',
    now() - interval '3 days'
),
(
    'bc200000-0000-0000-0000-000000000002',
    'c5618ed5-76fc-430f-b7e6-226b65961cc4', -- WH-TSPSV7 (1,400,000 VND)
    '70d2971d-575a-4d7a-a032-51346c176abc',
    'Khách hàng chuyển sang hình thức họp online qua Zoom.',
    50,
    700000,
    700000,
    'processed',
    '{"policy_name": "Hủy trước 12 - 24 giờ (Hoàn 50%)", "refund_percent": 50, "rule_type": "HOURS_BEFORE_START", "hours_before": 16}'::jsonb,
    now() - interval '2 days',
    now() - interval '2 days',
    now() - interval '2 days'
),
(
    'bc300000-0000-0000-0000-000000000003',
    '155bd5f7-5e94-4c2e-a527-0e23de2e339e', -- WH-NUYQUX (600,000 VND)
    '70d2971d-575a-4d7a-a032-51346c176abc',
    'Bận việc cá nhân gấp không kịp đến nhận phòng.',
    0,
    0,
    600000,
    'processed',
    '{"policy_name": "Hủy dưới 12 giờ (Không hoàn tiền)", "refund_percent": 0, "rule_type": "HOURS_BEFORE_START", "hours_before": 4}'::jsonb,
    now() - interval '1 day',
    now() - interval '1 day',
    now() - interval '1 day'
)
ON CONFLICT (booking_id) DO NOTHING;

-- 5. Seed Realistic Customer Notifications
INSERT INTO notifications (id, user_id, title, content, type, is_read, reference_id, reference_type, created_at)
VALUES
(
    gen_random_uuid(),
    '70d2971d-575a-4d7a-a032-51346c176abc',
    'Đặt chỗ thành công',
    'Bạn đã đặt thành công không gian làm việc tại CoSpace Nguyễn Huệ. Mã đặt chỗ: WH-4NV3ET. Vui lòng mở mã QR Pass khi đến check-in.',
    'BOOKING_CONFIRMED',
    false,
    '198153ea-4629-4e76-95b6-c6eacf68af57',
    'booking',
    now() - interval '10 minutes'
),
(
    gen_random_uuid(),
    '70d2971d-575a-4d7a-a032-51346c176abc',
    'Nhắc nhở lịch đặt chỗ sắp đến',
    'Đơn đặt chỗ WH-SUNSQY của bạn sẽ bắt đầu trong 1 giờ tới. Bạn có thể check-in sớm tối đa 15 phút tại quầy lễ tân.',
    'BOOKING_REMINDER',
    false,
    '94cdd7e2-858e-4a33-9482-e94e5e2c83eb',
    'booking',
    now() - interval '45 minutes'
),
(
    gen_random_uuid(),
    '70d2971d-575a-4d7a-a032-51346c176abc',
    'Hoàn tiền hủy đơn thành công',
    'Đơn đặt chỗ WH-TSPSV7 đã được hủy thành công theo chính sách Hủy trước 12 - 24 giờ. Số tiền 700.000 VNĐ (50%) đã được chuyển hoàn.',
    'REFUND_PROCESSED',
    true,
    'c5618ed5-76fc-430f-b7e6-226b65961cc4',
    'cancellation',
    now() - interval '2 days'
),
(
    gen_random_uuid(),
    '70d2971d-575a-4d7a-a032-51346c176abc',
    'Gợi ý đối tác kết nối mới',
    'Có 3 thành viên mới có cùng chuyên môn AI / Machine Learning và Khởi nghiệp tại chi nhánh của bạn. Khám phá ngay để mở rộng mạng lưới!',
    'PARTNER_MATCH',
    false,
    NULL,
    'profile',
    now() - interval '3 hours'
),
(
    gen_random_uuid(),
    '70d2971d-575a-4d7a-a032-51346c176abc',
    'Bài viết cộng đồng mới',
    'Thành viên Đặng Quốc Bảo vừa đăng bài: "[Tìm Co-founder Tech] Dự án trợ lý tài chính thông minh". Xem ngay thảo luận!',
    'COMMUNITY_POST',
    false,
    'bb100000-0000-0000-0000-000000000001',
    'post',
    now() - interval '2 hours'
);

-- Also seed notifications for Toàn Vương Song (user 08ed1074-d800-4f47-b291-a200c1ab1b7f)
INSERT INTO notifications (id, user_id, title, content, type, is_read, created_at)
VALUES
(
    gen_random_uuid(),
    '08ed1074-d800-4f47-b291-a200c1ab1b7f',
    'Chào mừng đến với CoSpace Network',
    'Hồ sơ của bạn đã sẵn sàng! Hãy ghé thăm mục Cộng đồng để kết nối với các đồng nghiệp và đối tác tiềm năng.',
    'SYSTEM',
    false,
    now() - interval '1 hour'
);
