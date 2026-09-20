-- =============================================================================
-- V1 — Baseline schema (CoSpace)
-- =============================================================================
-- Đây là schema mà ứng dụng đang chạy trên thật, gộp từ hai nguồn cũ:
--   1. database/full_schema_complete.sql  (bảng lõi: users, bookings, payments...)
--   2. BE/src/main/resources/schema.sql   (bổ sung: promotions, refunds,
--      membership_tiers, posts, profiles... và các cột thêm về sau)
--
-- Quy ước từ 20/09/2026 (quyết định Q15 trong report/LOGIC_AUDIT.md):
--   - File này là NGUỒN SỰ THẬT DUY NHẤT của schema. Bộ script cũ trong
--     database/archive/ chỉ còn giá trị tham khảo lịch sử.
--   - Mọi thay đổi schema về sau là một file V<n>__<mô tả>.sql mới, không sửa file này.
--   - Với database đã có dữ liệu (Supabase production), Flyway chạy ở chế độ
--     baseline-on-migrate nên V1 được đánh dấu là đã áp dụng mà KHÔNG chạy lại;
--     chỉ V2 trở đi mới thực thi. Với database trống (CI, máy dev mới) thì V1 tạo
--     toàn bộ schema từ đầu.
--
-- Toàn bộ lệnh đều idempotent (IF NOT EXISTS / ON CONFLICT) nên chạy lại vô hại.
-- BEGIN/COMMIT đã được gỡ bỏ: Flyway tự bọc mỗi migration trong một transaction.
-- =============================================================================


-- =============================================================================
-- PHẦN 1 — từ database/full_schema_complete.sql
-- =============================================================================
-- =============================================================================
-- CoSpace Project - Full Database Schema Script (100% Compatible with Spring Boot Backend)
-- Database Target: PostgreSQL 13+ / Supabase PostgreSQL
-- Date: 2026-08-03
-- =============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 2. IDENTITY & ACCESS TABLES
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext UNIQUE NOT NULL,
  password_hash varchar(255),
  full_name varchar(150) NOT NULL,
  phone varchar(20),
  avatar_url varchar(2048),
  status varchar(32) NOT NULL DEFAULT 'active',
  role varchar(32) NOT NULL DEFAULT 'customer',
  branch_id uuid,
  membership_tier varchar(32) NOT NULL DEFAULT 'standard',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_role_branch ON users (role, branch_id);

CREATE TABLE IF NOT EXISTS auth_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider varchar(20) NOT NULL,
  provider_user_id varchar(120) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_auth_accounts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT uq_provider_user UNIQUE (provider, provider_user_id)
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id uuid PRIMARY KEY,
  bio text,
  profession varchar(120),
  company varchar(120),
  contact_email varchar(255),
  contact_phone varchar(20),
  contact_link varchar(2048),
  contact_public boolean NOT NULL DEFAULT false,
  primary_branch_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. SPACE MANAGEMENT TABLES
CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(20) UNIQUE NOT NULL,
  name varchar(150) NOT NULL,
  address text NOT NULL,
  city varchar(80),
  timezone varchar(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  open_time time,
  close_time time,
  status varchar(32) NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_branches_code ON branches (code);
CREATE INDEX IF NOT EXISTS idx_branches_status ON branches (status);

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS fk_profiles_branch,
  ADD CONSTRAINT fk_profiles_branch FOREIGN KEY (primary_branch_id) REFERENCES branches(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(80) UNIQUE NOT NULL,
  category varchar(32) NOT NULL DEFAULT 'skill',
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS profile_skills (
  profile_user_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  level smallint NOT NULL DEFAULT 3,
  
  PRIMARY KEY (profile_user_id, tag_id),
  CONSTRAINT fk_profile_skills_user FOREIGN KEY (profile_user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_profile_skills_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
  CONSTRAINT check_skill_level CHECK (level >= 1 AND level <= 5)
);

CREATE TABLE IF NOT EXISTS profile_interests (
  profile_user_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  priority smallint NOT NULL DEFAULT 3,
  
  PRIMARY KEY (profile_user_id, tag_id),
  CONSTRAINT fk_profile_interests_user FOREIGN KEY (profile_user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_profile_interests_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
  CONSTRAINT check_interest_priority CHECK (priority >= 1 AND priority <= 5)
);

CREATE TABLE IF NOT EXISTS profile_match_scores (
  profile_user_id uuid NOT NULL,
  matched_user_id uuid NOT NULL,
  score numeric(6,4) NOT NULL,
  reasons_json jsonb,
  computed_at timestamptz NOT NULL DEFAULT now(),
  
  PRIMARY KEY (profile_user_id, matched_user_id),
  CONSTRAINT fk_match_scores_user FOREIGN KEY (profile_user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_match_scores_matched FOREIGN KEY (matched_user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_match_scores_ranking ON profile_match_scores (profile_user_id, score DESC);

CREATE TABLE IF NOT EXISTS floors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL,
  floor_no int NOT NULL,
  name varchar(100) NOT NULL,
  svg_url varchar(2048) NOT NULL,
  map_version int NOT NULL DEFAULT 1,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_floors_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT uq_branch_floor UNIQUE (branch_id, floor_no)
);

CREATE TABLE IF NOT EXISTS workspace_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(30) UNIQUE NOT NULL,
  name varchar(100) NOT NULL,
  capacity_default int NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS amenities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) UNIQUE NOT NULL,
  icon_name varchar(50),
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS workspace_type_amenities (
  workspace_type_id uuid NOT NULL,
  amenity_id uuid NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  
  PRIMARY KEY (workspace_type_id, amenity_id),
  CONSTRAINT fk_wta_type FOREIGN KEY (workspace_type_id) REFERENCES workspace_types(id) ON DELETE CASCADE,
  CONSTRAINT fk_wta_amenity FOREIGN KEY (amenity_id) REFERENCES amenities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id uuid NOT NULL,
  workspace_type_id uuid NOT NULL,
  code varchar(30) NOT NULL,
  name varchar(120) NOT NULL,
  capacity int NOT NULL DEFAULT 1,
  svg_element_id varchar(100) NOT NULL,
  status varchar(32) NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_workspaces_floor FOREIGN KEY (floor_id) REFERENCES floors(id) ON DELETE RESTRICT,
  CONSTRAINT fk_workspaces_type FOREIGN KEY (workspace_type_id) REFERENCES workspace_types(id),
  CONSTRAINT uq_floor_code UNIQUE (floor_id, code),
  CONSTRAINT uq_floor_svg_element UNIQUE (floor_id, svg_element_id)
);

CREATE TABLE IF NOT EXISTS workspace_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  reason varchar(255),
  status varchar(32) NOT NULL DEFAULT 'scheduled',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_maintenance_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_maintenance_creator FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT check_maintenance_time CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_maintenance_workspace_time ON workspace_maintenance (workspace_id, start_at, end_at);

-- 4. BOOKING & PRICING TABLES
CREATE TABLE IF NOT EXISTS price_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid,
  workspace_type_id uuid NOT NULL,
  duration_unit varchar(32) NOT NULL,
  price numeric(12,2) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_price_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT fk_price_workspace_type FOREIGN KEY (workspace_type_id) REFERENCES workspace_types(id),
  CONSTRAINT fk_price_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT check_price CHECK (price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_price_lookup ON price_policies (workspace_type_id, duration_unit, branch_id, is_active);

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code varchar(32) UNIQUE NOT NULL,
  user_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  workspace_type_id varchar(64) NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  unit varchar(32) NOT NULL,
  unit_count int NOT NULL DEFAULT 1,
  is_contract boolean NOT NULL DEFAULT false,
  status varchar(32) NOT NULL DEFAULT 'PENDING_PAYMENT',
  price_per_unit numeric(19,2) NOT NULL DEFAULT 0,
  subtotal_amount numeric(19,2) NOT NULL DEFAULT 0,
  discount_amount numeric(19,2) NOT NULL DEFAULT 0,
  addon_amount numeric(19,2) NOT NULL DEFAULT 0,
  tax_amount numeric(19,2) NOT NULL DEFAULT 0,
  service_fee_amount numeric(19,2) NOT NULL DEFAULT 0,
  total_amount numeric(19,2) NOT NULL DEFAULT 0,
  payment_deadline_at timestamptz,
  source varchar(32) NOT NULL DEFAULT 'web',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_bookings_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  CONSTRAINT fk_bookings_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT check_booking_time CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_bookings_workspace_time ON bookings (workspace_id, start_at, end_at, status);
CREATE INDEX IF NOT EXISTS idx_bookings_user_status ON bookings (user_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_branch_time ON bookings (branch_id, start_at DESC);

-- Add exclusion constraint to prevent double bookings (active statuses only)
DO $$
BEGIN
    ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_workspace_id_start_at_end_at_excl;
    ALTER TABLE bookings
    ADD CONSTRAINT bookings_workspace_id_start_at_end_at_excl EXCLUDE USING gist (
        workspace_id WITH =,
        tstzrange(start_at, end_at) WITH &&
    )
    WHERE (status IN ('PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN', 'pending_payment', 'confirmed', 'checked_in'));
END $$;

CREATE TABLE IF NOT EXISTS checkin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  staff_user_id uuid NOT NULL,
  checkin_at timestamptz NOT NULL,
  checkout_at timestamptz,
  note varchar(255),
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_checkin_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_checkin_staff FOREIGN KEY (staff_user_id) REFERENCES users(id),
  CONSTRAINT check_checkout_time CHECK (checkout_at IS NULL OR checkout_at >= checkin_at)
);

-- 5. PAYMENT TABLES
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  user_id uuid NOT NULL,
  provider varchar(16) NOT NULL,
  method varchar(16) NOT NULL,
  order_id varchar(64) UNIQUE NOT NULL,
  request_id varchar(64),
  amount numeric(19,2) NOT NULL,
  status varchar(32) NOT NULL DEFAULT 'INITIATED',
  pay_url varchar(2048),
  gateway_transaction_id varchar(64),
  paid_at timestamptz,
  refunded_at timestamptz,
  raw_callback text,
  created_by_staff_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_staff FOREIGN KEY (created_by_staff_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT check_payment_amount CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments (booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments (order_id);

CREATE TABLE IF NOT EXISTS payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL,
  event_type varchar(50) NOT NULL,
  idempotency_key varchar(120) UNIQUE NOT NULL,
  provider_event_id varchar(120),
  signature varchar(500),
  signature_valid boolean,
  payload_json jsonb NOT NULL,
  processed boolean NOT NULL DEFAULT false,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_payment_events FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
);

-- 6. CANCELLATION POLICIES TABLE
CREATE TABLE IF NOT EXISTS cancellation_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(120) NOT NULL,
  rule_type varchar(32) NOT NULL,
  min_value int NOT NULL,
  max_value int NOT NULL,
  refund_percent numeric(5,2) NOT NULL,
  priority int NOT NULL DEFAULT 100,
  branch_id uuid,
  workspace_type_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  effective_from timestamptz NOT NULL,
  effective_to timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_cancel_policy_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

-- 7. SEED BASE DATA
INSERT INTO workspace_types (id, code, name, capacity_default) 
VALUES 
  ('a1000000-0000-0000-0000-000000000001'::uuid, 'desk', 'Bàn làm việc', 1),
  ('a1000000-0000-0000-0000-000000000002'::uuid, 'meeting_room', 'Phòng họp', 8),
  ('a1000000-0000-0000-0000-000000000003'::uuid, 'private_office', 'Văn phòng riêng', 4)
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  capacity_default = EXCLUDED.capacity_default;

-- =============================================================================
-- PHẦN 2 — từ BE/src/main/resources/schema.sql
-- =============================================================================
-- Spring Boot Auto-Initialization Schema (Robust & Fail-safe)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 0. Ensure 'users' table has password column for self-hosted auth
ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);
UPDATE users SET password = password_hash WHERE password IS NULL AND password_hash IS NOT NULL;

-- 1. Ensure 'bookings' table status and price snapshot columns exist
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'PENDING_PAYMENT';
ALTER TABLE bookings ALTER COLUMN status TYPE VARCHAR(32);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS price_per_unit NUMERIC(19, 2) NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS subtotal_amount NUMERIC(19, 2) NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(19, 2) NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS addon_amount NUMERIC(19, 2) NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(19, 2) NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_fee_amount NUMERIC(19, 2) NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_amount NUMERIC(19, 2) NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_deadline_at TIMESTAMPTZ;

-- 2. Ensure 'payments' table status and transaction columns exist
ALTER TABLE payments ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'INITIATED';
ALTER TABLE payments ALTER COLUMN status TYPE VARCHAR(32);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_transaction_id VARCHAR(64);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- 4. Ensure is_contract column exists
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_contract BOOLEAN NOT NULL DEFAULT false;

-- 5-6. (removed) This file used to close check-ins, complete bookings and rewrite end_at on
-- every application start. Business data is never changed here any more: overdue guests and
-- ended bookings are closed by BookingLifecycleScheduler, with notifications and an audit trail.

-- 7. Fix exclusion constraint for bookings to only consider active occupying statuses
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_workspace_id_start_at_end_at_excl;

ALTER TABLE bookings
ADD CONSTRAINT bookings_workspace_id_start_at_end_at_excl EXCLUDE USING gist (
    workspace_id WITH =,
    tstzrange(start_at, end_at) WITH &&
)
WHERE (status IN ('PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN', 'pending_payment', 'confirmed', 'checked_in'));

-- 8. Fix exclusion constraint for workspace_maintenance to only consider active/scheduled
ALTER TABLE workspace_maintenance DROP CONSTRAINT IF EXISTS no_overlapping_maintenance;

ALTER TABLE workspace_maintenance
ADD CONSTRAINT no_overlapping_maintenance EXCLUDE USING gist (
    workspace_id WITH =,
    tstzrange(start_at, end_at) WITH &&
)
WHERE (status IN ('active', 'scheduled'));

-- 9. Table 'extra_services' (Dịch vụ gia tăng / tiện ích bổ sung)
CREATE TABLE IF NOT EXISTS extra_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    price BIGINT NOT NULL DEFAULT 0,
    unit VARCHAR(30) NOT NULL DEFAULT 'item',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_extra_services_branch ON extra_services(branch_id);

-- 9b. Extra services also need a short SKU-like code and a category used to pick a display
-- icon on the branch-admin UI; these were missing from the table above (an older, superseded
-- migration in database/migrations/ declared them as NOT NULL, but this file is what actually
-- runs against the app's DB, so add them here instead).
ALTER TABLE extra_services ADD COLUMN IF NOT EXISTS code VARCHAR(40) NOT NULL DEFAULT '';
ALTER TABLE extra_services ADD COLUMN IF NOT EXISTS service_type VARCHAR(20) NOT NULL DEFAULT 'other';

-- 10. Table 'booking_services' (Dịch vụ gọi thêm trong thời gian đặt chỗ - Running Tab)
CREATE TABLE IF NOT EXISTS booking_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES extra_services(id) ON DELETE RESTRICT,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price BIGINT NOT NULL DEFAULT 0,
    subtotal BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_booking_services_booking ON booking_services(booking_id);

-- 11. Table 'booking_cancellations' (Lịch sử hủy đơn & tính toán hoàn tiền)
CREATE TABLE IF NOT EXISTS booking_cancellations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    refund_percent INT NOT NULL DEFAULT 0 CHECK (refund_percent >= 0 AND refund_percent <= 100),
    refund_amount BIGINT NOT NULL DEFAULT 0,
    penalty_amount BIGINT NOT NULL DEFAULT 0,
    refund_status VARCHAR(32) NOT NULL DEFAULT 'pending',
    applied_rule_json JSONB,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_booking_cancellations_user ON booking_cancellations(user_id);

-- 12. Table 'notifications' (Hệ thống thông báo in-app)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    is_read BOOLEAN NOT NULL DEFAULT false,
    reference_id UUID,
    reference_type VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);

-- 13. Table 'audit_logs' (Nhật ký kiểm toán hệ thống)
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
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_name, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
-- 14. Table 'profiles' (Hồ sơ mở rộng & networking)
CREATE TABLE IF NOT EXISTS profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    profession VARCHAR(120),
    company VARCHAR(120),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    contact_link VARCHAR(2048),
    contact_public BOOLEAN NOT NULL DEFAULT false,
    primary_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. Table 'tags' (Kỹ năng, sở thích & lĩnh vực định nghĩa trước)
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(80) UNIQUE NOT NULL,
    category VARCHAR(32) NOT NULL DEFAULT 'skill',
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Seed basic tags if not exist
INSERT INTO tags (id, name, category, is_active) VALUES
    ('11111111-1111-1111-1111-111111111001', 'Frontend Dev', 'skill', true),
    ('11111111-1111-1111-1111-111111111002', 'Backend Dev', 'skill', true),
    ('11111111-1111-1111-1111-111111111003', 'Fullstack Dev', 'skill', true),
    ('11111111-1111-1111-1111-111111111004', 'UI/UX Design', 'skill', true),
    ('11111111-1111-1111-1111-111111111005', 'AI / Machine Learning', 'skill', true),
    ('11111111-1111-1111-1111-111111111006', 'Mobile App', 'skill', true),
    ('11111111-1111-1111-1111-111111111007', 'DevOps & Cloud', 'skill', true),
    ('11111111-1111-1111-1111-111111111008', 'Data Science', 'skill', true),
    ('11111111-1111-1111-1111-111111111009', 'Khởi nghiệp', 'interest', true),
    ('11111111-1111-1111-1111-111111111010', 'Đầu tư', 'interest', true),
    ('11111111-1111-1111-1111-111111111011', 'Fintech', 'interest', true),
    ('11111111-1111-1111-1111-111111111012', 'EdTech', 'interest', true),
    ('11111111-1111-1111-1111-111111111013', 'Networking', 'interest', true),
    ('11111111-1111-1111-1111-111111111014', 'Công nghệ', 'industry', true),
    ('11111111-1111-1111-1111-111111111015', 'Tài chính - Ngân hàng', 'industry', true),
    ('11111111-1111-1111-1111-111111111016', 'Thương mại điện tử', 'industry', true)
ON CONFLICT (name) DO NOTHING;

-- 16. Table 'profile_skills'
CREATE TABLE IF NOT EXISTS profile_skills (
    profile_user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    level SMALLINT NOT NULL DEFAULT 3 CHECK (level >= 1 AND level <= 5),
    PRIMARY KEY (profile_user_id, tag_id)
);

-- 17. Table 'profile_interests'
CREATE TABLE IF NOT EXISTS profile_interests (
    profile_user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    priority SMALLINT NOT NULL DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
    PRIMARY KEY (profile_user_id, tag_id)
);

-- 18. Table 'profile_match_scores'
CREATE TABLE IF NOT EXISTS profile_match_scores (
    profile_user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    matched_user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    score NUMERIC(6,4) NOT NULL,
    reasons_json JSONB,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (profile_user_id, matched_user_id)
);
CREATE INDEX IF NOT EXISTS idx_match_scores_ranking ON profile_match_scores (profile_user_id, score DESC);

-- 19. Table 'posts'
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    post_type VARCHAR(32) NOT NULL DEFAULT 'sharing',
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'published',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posts_feed ON posts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts (author_user_id, created_at DESC);

-- 20. Table 'post_tags'
CREATE TABLE IF NOT EXISTS post_tags (
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    source VARCHAR(16) NOT NULL DEFAULT 'ai',
    PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_post_tags_tag ON post_tags (tag_id);

-- 21. Table 'amenities' (Tiện ích) & 'workspace_type_amenities' (Tiện ích gắn theo loại không gian)
-- Both already exist in the core migration, re-declared here so a fresh DB gets them too.
CREATE TABLE IF NOT EXISTS amenities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    icon_name VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true
);
ALTER TABLE amenities ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE amenities ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS workspace_type_amenities (
    workspace_type_id UUID NOT NULL REFERENCES workspace_types(id) ON DELETE CASCADE,
    amenity_id UUID NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 1,
    PRIMARY KEY (workspace_type_id, amenity_id)
);

-- Seed only into an empty table, so amenities an admin later deletes are not re-created on restart.
INSERT INTO amenities (name, icon_name, description)
SELECT v.name, v.icon_name, v.description
FROM (VALUES
    ('Wi-Fi tốc độ cao', 'wifi', 'Internet cáp quang tốc độ cao'),
    ('Điều hòa', 'wind', 'Điều hòa nhiệt độ trung tâm'),
    ('Ổ cắm điện', 'zap', 'Ổ cắm điện tại chỗ ngồi'),
    ('Màn hình / TV', 'monitor', 'Màn hình trình chiếu hoặc TV'),
    ('Bảng trắng', 'edit-3', 'Bảng trắng và bút viết'),
    ('Thiết bị hội nghị', 'video', 'Webcam, loa và micro hội nghị'),
    ('Tủ khóa cá nhân', 'lock', 'Tủ khóa cất đồ cá nhân'),
    ('Nước uống miễn phí', 'coffee', 'Trà, cà phê và nước lọc'),
    ('Cách âm', 'volume-x', 'Không gian cách âm yên tĩnh'),
    ('Máy in', 'printer', 'Máy in dùng chung')
) AS v(name, icon_name, description)
WHERE NOT EXISTS (SELECT 1 FROM amenities);

INSERT INTO workspace_type_amenities (workspace_type_id, amenity_id, quantity)
SELECT wt.id, a.id, 1
FROM (VALUES
    ('desk', 'Wi-Fi tốc độ cao'), ('desk', 'Điều hòa'), ('desk', 'Ổ cắm điện'), ('desk', 'Nước uống miễn phí'),
    ('standing_desk', 'Wi-Fi tốc độ cao'), ('standing_desk', 'Điều hòa'), ('standing_desk', 'Ổ cắm điện'),
    ('meeting_room', 'Wi-Fi tốc độ cao'), ('meeting_room', 'Điều hòa'), ('meeting_room', 'Màn hình / TV'),
    ('meeting_room', 'Bảng trắng'), ('meeting_room', 'Thiết bị hội nghị'),
    ('private_office', 'Wi-Fi tốc độ cao'), ('private_office', 'Điều hòa'), ('private_office', 'Ổ cắm điện'),
    ('private_office', 'Tủ khóa cá nhân'), ('private_office', 'Máy in'),
    ('phone_booth', 'Wi-Fi tốc độ cao'), ('phone_booth', 'Cách âm'),
    ('event_space', 'Wi-Fi tốc độ cao'), ('event_space', 'Điều hòa'), ('event_space', 'Màn hình / TV')
) AS v(type_code, amenity_name)
JOIN workspace_types wt ON wt.code = v.type_code
JOIN amenities a ON a.name = v.amenity_name
WHERE NOT EXISTS (SELECT 1 FROM workspace_type_amenities)
ON CONFLICT DO NOTHING;

-- 22. Table 'membership_tiers' (Hạng thành viên)
-- A customer reaches a tier when total paid spend >= min_total_spent OR paid booking count >=
-- min_bookings (a threshold of 0 is ignored), and the highest qualifying tier by sort_order wins.
CREATE TABLE IF NOT EXISTS membership_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32) UNIQUE NOT NULL,
    name VARCHAR(80) NOT NULL,
    description TEXT,
    min_total_spent BIGINT NOT NULL DEFAULT 0 CHECK (min_total_spent >= 0),
    min_bookings INT NOT NULL DEFAULT 0 CHECK (min_bookings >= 0),
    discount_percent INT NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
    benefits TEXT,
    color VARCHAR(20) NOT NULL DEFAULT '#94a3b8',
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO membership_tiers (code, name, description, min_total_spent, min_bookings, discount_percent, benefits, color, sort_order)
SELECT v.code, v.name, v.description, v.min_total_spent, v.min_bookings, v.discount_percent, v.benefits, v.color, v.sort_order
FROM (VALUES
    ('bronze', 'Bronze', 'Hạng mặc định cho mọi thành viên', 0::bigint, 0, 0, 'Tích lũy chi tiêu để lên hạng', '#b45309', 0),
    ('silver', 'Silver', 'Thành viên thân thiết', 2000000::bigint, 3, 3, 'Giảm 3% mọi đơn đặt chỗ', '#64748b', 1),
    ('gold', 'Gold', 'Thành viên vàng', 5000000::bigint, 10, 5, 'Giảm 5% mọi đơn đặt chỗ', '#ca8a04', 2),
    ('platinum', 'Platinum', 'Thành viên bạch kim', 15000000::bigint, 20, 10, 'Giảm 10% mọi đơn đặt chỗ', '#7c3aed', 3)
) AS v(code, name, description, min_total_spent, min_bookings, discount_percent, benefits, color, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM membership_tiers);

-- users.membership_tier holds a membership_tiers.code (was a 'standard'/'premium' enum in the core migration).
ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_tier VARCHAR(32) NOT NULL DEFAULT 'standard';
ALTER TABLE users ALTER COLUMN membership_tier TYPE VARCHAR(32) USING membership_tier::text;

-- 23. Table 'promotions' (Khuyến mãi / mã giảm giá)
CREATE TABLE IF NOT EXISTS promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(40) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    discount_type VARCHAR(16) NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent', 'fixed')),
    discount_value BIGINT NOT NULL CHECK (discount_value > 0),
    max_discount_amount BIGINT CHECK (max_discount_amount IS NULL OR max_discount_amount > 0),
    min_order_amount BIGINT NOT NULL DEFAULT 0 CHECK (min_order_amount >= 0),
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    usage_limit INT CHECK (usage_limit IS NULL OR usage_limit > 0),
    per_user_limit INT CHECK (per_user_limit IS NULL OR per_user_limit > 0),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    workspace_type_id UUID REFERENCES workspace_types(id) ON DELETE CASCADE,
    min_tier_code VARCHAR(32),
    is_public BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT check_promotion_time CHECK (end_at > start_at),
    CONSTRAINT check_promotion_percent CHECK (discount_type <> 'percent' OR discount_value <= 100)
);
CREATE INDEX IF NOT EXISTS idx_promotions_active_window ON promotions (is_active, start_at, end_at);

-- 24. Booking discount breakdown: discount_amount = membership_discount_amount + promotion_discount_amount
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS membership_tier_code VARCHAR(32);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS membership_discount_amount BIGINT NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS promotion_id UUID REFERENCES promotions(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS promotion_code VARCHAR(40);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS promotion_discount_amount BIGINT NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_bookings_promotion_user ON bookings (promotion_id, user_id) WHERE promotion_id IS NOT NULL;

-- 25. Table 'refunds' (Khoản hoàn tiền cần xử lý: hủy đơn, bảo trì, thanh toán muộn, thanh toán trùng)
CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    amount BIGINT NOT NULL CHECK (amount > 0),
    reason_type VARCHAR(32) NOT NULL CHECK (reason_type IN ('CANCELLATION', 'MAINTENANCE', 'LATE_PAYMENT', 'DUPLICATE_PAYMENT')),
    reason TEXT,
    status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'rejected')),
    resolution_note TEXT,
    processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_refunds_queue ON refunds (status, branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_refunds_booking ON refunds (booking_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_refunds_payment_reason ON refunds (payment_id, reason_type) WHERE payment_id IS NOT NULL;

-- Cancellations recorded before this table existed promised a refund nobody could act on:
-- queue them once so they show up in the refund list.
INSERT INTO refunds (booking_id, user_id, branch_id, amount, reason_type, reason, status, created_at, updated_at)
SELECT c.booking_id, c.user_id, b.branch_id, c.refund_amount, 'CANCELLATION',
       COALESCE('Hủy đơn: ' || c.reason, 'Hủy đơn'), 'pending', c.created_at, now()
FROM booking_cancellations c
JOIN bookings b ON b.id = c.booking_id
WHERE c.refund_status = 'pending'
  AND c.refund_amount > 0
  AND NOT EXISTS (SELECT 1 FROM refunds r WHERE r.booking_id = c.booking_id AND r.reason_type IN ('CANCELLATION', 'MAINTENANCE'));

-- 26. Running tab: every add-on line is either still owed (unpaid), settled (paid) or cancelled (void),
-- and a payment says whether it paid for the booking itself or for add-ons collected at the counter.
ALTER TABLE booking_services ADD COLUMN IF NOT EXISTS status VARCHAR(16) NOT NULL DEFAULT 'unpaid'
    CHECK (status IN ('unpaid', 'paid', 'void'));
ALTER TABLE booking_services ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id) ON DELETE SET NULL;
ALTER TABLE booking_services ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE booking_services ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;
ALTER TABLE booking_services ADD COLUMN IF NOT EXISTS voided_by UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_booking_services_booking_status ON booking_services (booking_id, status);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS purpose VARCHAR(16) NOT NULL DEFAULT 'booking'
    CHECK (purpose IN ('booking', 'addon'));
