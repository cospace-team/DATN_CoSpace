-- ============================================
-- Migration V1: Co-Working Space MVP - Core Schema
-- ============================================
-- Ngày: 2026-04-16
-- Mục tiêu: Tạo schema cơ bản với constraint đầy đủ
-- Database: PostgreSQL 13+

BEGIN;

-- Khởi tạo extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "btree_gist"; -- Support EXCLUDE constraint on UUID

-- ============================================
-- ENUM Types
-- ============================================

CREATE TYPE user_status AS ENUM ('active', 'suspended');
CREATE TYPE user_role AS ENUM ('super_admin', 'branch_admin', 'staff', 'customer');
CREATE TYPE membership_tier AS ENUM ('standard', 'premium');
CREATE TYPE branch_status AS ENUM ('active', 'inactive');
CREATE TYPE workspace_status AS ENUM ('active', 'maintenance', 'inactive');
CREATE TYPE maintenance_status AS ENUM ('scheduled', 'active', 'done', 'canceled');
CREATE TYPE duration_unit AS ENUM ('hour', 'day', 'week', 'month');
CREATE TYPE booking_status AS ENUM ('pending_payment', 'confirmed', 'checked_in', 'completed', 'canceled', 'expired');
CREATE TYPE booking_source AS ENUM ('web', 'mobile', 'counter', 'admin');
CREATE TYPE payment_provider AS ENUM ('momo', 'cash');
CREATE TYPE payment_method AS ENUM ('ewallet', 'qr', 'cash');
CREATE TYPE payment_status AS ENUM ('initiated', 'pending', 'paid', 'failed', 'expired', 'canceled', 'refunded');
CREATE TYPE cancel_rule_type AS ENUM ('GRACE_HOURS', 'BEFORE_START_DAYS');
CREATE TYPE refund_status AS ENUM ('none', 'pending', 'confirmed', 'rejected');
CREATE TYPE tag_category AS ENUM ('skill', 'interest', 'industry');
CREATE TYPE service_type AS ENUM ('drink', 'meal', 'printing', 'other');
CREATE TYPE notification_type AS ENUM (
  'booking_confirmed',
  'booking_expired',
  'booking_canceled',
  'payment_timeout',
  'checkout_overdue',
  'refund_processed',
  'matching_update',
  'system_announcement'
);

-- ============================================
-- Identity & Access Tables
-- ============================================

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext UNIQUE NOT NULL,
  password_hash varchar(255),  -- KHÔNG DÙNG ở MVP: Supabase Auth quản lý password. Giữ cho tương thích self-hosted auth sau này.
  full_name varchar(150) NOT NULL,
  phone varchar(20),
  avatar_url varchar(2048),
  status user_status NOT NULL DEFAULT 'active',
  role user_role NOT NULL,
  branch_id uuid,
  membership_tier membership_tier NOT NULL DEFAULT 'standard',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT check_branch_by_role CHECK (
    (role IN ('super_admin', 'customer') AND branch_id IS NULL) OR
    (role IN ('branch_admin', 'staff') AND branch_id IS NOT NULL)
  )
);

-- L-1: idx_users_email_lower removed — redundant with citext UNIQUE constraint
CREATE INDEX idx_users_role_branch ON users (role, branch_id);

CREATE TABLE auth_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,  -- Bỏ UNIQUE: cho phép 1 user link nhiều provider (email + Google)
  provider varchar(20) NOT NULL,
  provider_user_id varchar(120) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_auth_accounts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT uq_provider_user UNIQUE (provider, provider_user_id)
);

CREATE TABLE profiles (
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

-- ============================================
-- Space Management Tables
-- ============================================

CREATE TABLE branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(20) UNIQUE NOT NULL,
  name varchar(150) NOT NULL,
  address text NOT NULL,
  city varchar(80),
  timezone varchar(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  open_time time,
  close_time time,
  status branch_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_branches_code ON branches (code);
CREATE INDEX idx_branches_status ON branches (status);

-- Thêm FK constraint cho profiles table (giải quyết dependency order issue)
ALTER TABLE profiles
ADD CONSTRAINT fk_profiles_branch FOREIGN KEY (primary_branch_id) REFERENCES branches(id) ON DELETE SET NULL;

CREATE TABLE tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(80) UNIQUE NOT NULL,
  category tag_category NOT NULL DEFAULT 'skill',
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE profile_skills (
  profile_user_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  level smallint NOT NULL DEFAULT 3,
  
  PRIMARY KEY (profile_user_id, tag_id),
  CONSTRAINT fk_profile_skills_user FOREIGN KEY (profile_user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_profile_skills_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
  CONSTRAINT check_skill_level CHECK (level >= 1 AND level <= 5)
);

CREATE TABLE profile_interests (
  profile_user_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  priority smallint NOT NULL DEFAULT 3,
  
  PRIMARY KEY (profile_user_id, tag_id),
  CONSTRAINT fk_profile_interests_user FOREIGN KEY (profile_user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_profile_interests_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
  CONSTRAINT check_interest_priority CHECK (priority >= 1 AND priority <= 5)
);

CREATE TABLE profile_match_scores (
  profile_user_id uuid NOT NULL,
  matched_user_id uuid NOT NULL,
  score numeric(6,4) NOT NULL,
  reasons_json jsonb,
  computed_at timestamptz NOT NULL DEFAULT now(),
  
  PRIMARY KEY (profile_user_id, matched_user_id),
  CONSTRAINT fk_match_scores_user FOREIGN KEY (profile_user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_match_scores_matched FOREIGN KEY (matched_user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
  CONSTRAINT check_match_direction CHECK (profile_user_id < matched_user_id),
  CONSTRAINT check_score_range CHECK (score >= 0 AND score <= 1.0)
);

CREATE INDEX idx_match_scores_ranking ON profile_match_scores (profile_user_id, score DESC);

CREATE TABLE floors (
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

CREATE TABLE workspace_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(30) UNIQUE NOT NULL,
  name varchar(100) NOT NULL,
  capacity_default int NOT NULL DEFAULT 1
);

-- Insert default workspace types
INSERT INTO workspace_types (code, name, capacity_default) 
VALUES 
  ('desk', 'Desk', 1),
  ('meeting_room', 'Meeting Room', 6),
  ('private_office', 'Private Office', 4)
ON CONFLICT DO NOTHING;

CREATE TABLE amenities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) UNIQUE NOT NULL,
  icon_name varchar(50),
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE workspace_type_amenities (
  workspace_type_id uuid NOT NULL,
  amenity_id uuid NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  
  PRIMARY KEY (workspace_type_id, amenity_id),
  CONSTRAINT fk_wta_type FOREIGN KEY (workspace_type_id) REFERENCES workspace_types(id) ON DELETE CASCADE,
  CONSTRAINT fk_wta_amenity FOREIGN KEY (amenity_id) REFERENCES amenities(id) ON DELETE CASCADE
);

CREATE TABLE workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id uuid NOT NULL,
  workspace_type_id uuid NOT NULL,
  code varchar(30) NOT NULL,
  name varchar(120) NOT NULL,
  capacity int NOT NULL DEFAULT 1,
  svg_element_id varchar(100) NOT NULL,
  status workspace_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_workspaces_floor FOREIGN KEY (floor_id) REFERENCES floors(id) ON DELETE RESTRICT,
  CONSTRAINT fk_workspaces_type FOREIGN KEY (workspace_type_id) REFERENCES workspace_types(id),
  CONSTRAINT uq_floor_code UNIQUE (floor_id, code),
  CONSTRAINT uq_floor_svg_element UNIQUE (floor_id, svg_element_id)
);

CREATE TABLE workspace_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  reason varchar(255),
  status maintenance_status NOT NULL DEFAULT 'scheduled',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_maintenance_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_maintenance_creator FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT check_maintenance_time CHECK (end_at > start_at),
  CONSTRAINT no_overlapping_maintenance EXCLUDE USING gist (workspace_id WITH =, tstzrange(start_at, end_at) WITH &&)
);

CREATE INDEX idx_maintenance_workspace_time ON workspace_maintenance (workspace_id, start_at, end_at);

-- ============================================
-- Booking & Pricing Tables
-- ============================================

CREATE TABLE price_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid,
  workspace_type_id uuid NOT NULL,
  duration_unit duration_unit NOT NULL,
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

CREATE INDEX idx_price_lookup ON price_policies (workspace_type_id, duration_unit, branch_id, is_active);
CREATE UNIQUE INDEX uq_price_active ON price_policies (COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), workspace_type_id, duration_unit) WHERE is_active = true;

CREATE TABLE bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code varchar(20) UNIQUE NOT NULL,
  user_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  unit duration_unit NOT NULL,
  unit_count int NOT NULL DEFAULT 1,
  is_contract boolean NOT NULL DEFAULT false,
  status booking_status NOT NULL,
  subtotal_amount numeric(12,2) NOT NULL DEFAULT 0,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  addon_amount numeric(12,2) NOT NULL DEFAULT 0,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_deadline_at timestamptz,
  source booking_source NOT NULL DEFAULT 'web',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_bookings_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  CONSTRAINT fk_bookings_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT check_booking_time CHECK (end_at > start_at),
  CONSTRAINT check_booking_amounts CHECK (
    subtotal_amount >= 0 AND discount_amount >= 0 AND addon_amount >= 0 AND
    total_amount = subtotal_amount - discount_amount + addon_amount
  ),
  CONSTRAINT check_payment_deadline CHECK (status != 'pending_payment' OR payment_deadline_at IS NOT NULL)
);

CREATE INDEX idx_bookings_workspace_time ON bookings (workspace_id, start_at, end_at, status);
CREATE INDEX idx_bookings_user_status ON bookings (user_id, status);
-- L-2: idx_bookings_code removed — redundant with UNIQUE constraint on booking_code
CREATE INDEX idx_bookings_branch_time ON bookings (branch_id, start_at DESC);

CREATE TABLE checkin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  staff_user_id uuid NOT NULL,
  checkin_at timestamptz NOT NULL,
  checkout_at timestamptz,
  note varchar(255),
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_checkin_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_checkin_staff FOREIGN KEY (staff_user_id) REFERENCES users(id),
  CONSTRAINT check_checkout_time CHECK (checkout_at >= checkin_at)
);

CREATE UNIQUE INDEX uq_checkin_open ON checkin_logs (booking_id) WHERE checkout_at IS NULL;
CREATE INDEX idx_checkin_logs_staff ON checkin_logs (staff_user_id);

-- ============================================
-- Payment Tables
-- ============================================

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  provider payment_provider NOT NULL,
  method payment_method NOT NULL,
  order_id varchar(100) UNIQUE,
  request_id varchar(100),
  amount numeric(12,2) NOT NULL,
  status payment_status NOT NULL,
  provider_trans_id varchar(120),
  pay_url varchar(2048),
  signature_valid boolean,
  raw_response jsonb,
  paid_at timestamptz,
  created_by_staff_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_staff FOREIGN KEY (created_by_staff_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT uq_provider_trans UNIQUE (provider, provider_trans_id),
  CONSTRAINT check_payment_amount CHECK (amount >= 0)
);

CREATE INDEX idx_payments_booking ON payments (booking_id);
CREATE INDEX idx_payments_status ON payments (status);

CREATE TABLE payment_events (
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

-- L-7: idx_payment_events_idempotency removed — redundant with UNIQUE constraint on idempotency_key
CREATE INDEX idx_payment_events_processed ON payment_events (processed);

-- ============================================
-- Cancellation Tables
-- ============================================

CREATE TABLE cancellation_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(120) NOT NULL,
  rule_type cancel_rule_type NOT NULL,
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
  
  CONSTRAINT fk_cancel_policy_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT fk_cancel_policy_type FOREIGN KEY (workspace_type_id) REFERENCES workspace_types(id),
  CONSTRAINT check_policy_percent CHECK (refund_percent >= 0 AND refund_percent <= 100),
  CONSTRAINT check_policy_range CHECK (min_value >= 0 AND max_value >= min_value)
);

CREATE INDEX idx_cancel_policy_lookup ON cancellation_policies (branch_id, workspace_type_id, is_active, effective_from, effective_to);

CREATE TABLE booking_cancellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE,
  policy_id uuid,
  refund_percent numeric(5,2) NOT NULL,
  refund_amount numeric(12,2) NOT NULL DEFAULT 0,
  penalty_amount numeric(12,2) NOT NULL DEFAULT 0,
  reason varchar(255),
  cancelled_by uuid NOT NULL,
  cancelled_at timestamptz NOT NULL,
  refund_status refund_status NOT NULL DEFAULT 'none',
  refund_confirmed_by uuid,
  refund_confirmed_at timestamptz,
  applied_rule_json jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_cancellation_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_cancellation_policy FOREIGN KEY (policy_id) REFERENCES cancellation_policies(id) ON DELETE SET NULL,
  CONSTRAINT fk_cancellation_by FOREIGN KEY (cancelled_by) REFERENCES users(id),
  CONSTRAINT fk_cancellation_confirmed FOREIGN KEY (refund_confirmed_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT check_refund_status_logic CHECK (
    (refund_amount = 0 AND refund_status = 'none') OR 
    (refund_amount > 0 AND refund_status != 'none')
  )
);

-- Bổ sung Trigger kiểm tra Invariant: refund_amount + penalty_amount = booking.total_amount
CREATE OR REPLACE FUNCTION check_cancellation_amounts_invariant()
RETURNS TRIGGER AS $$
DECLARE
    v_total_amount numeric(12,2);
BEGIN
    SELECT total_amount INTO v_total_amount FROM bookings WHERE id = NEW.booking_id;
    IF (NEW.refund_amount + NEW.penalty_amount != v_total_amount) THEN
        RAISE EXCEPTION 'Cancellation Invariant Violation: refund_amount (%) + penalty_amount (%) != booking.total_amount (%)', 
            NEW.refund_amount, NEW.penalty_amount, v_total_amount;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_cancellation_amounts_invariant
BEFORE INSERT OR UPDATE ON booking_cancellations
FOR EACH ROW EXECUTE FUNCTION check_cancellation_amounts_invariant();

-- ============================================
-- Add-on Service Tables
-- ============================================

CREATE TABLE extra_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid,
  code varchar(40) NOT NULL,
  name varchar(120) NOT NULL,
  service_type service_type NOT NULL,
  unit varchar(20) NOT NULL,
  price numeric(12,2) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_service_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT uq_service_branch_code UNIQUE (branch_id, code),
  CONSTRAINT check_service_price CHECK (price >= 0)
);

CREATE INDEX idx_service_lookup ON extra_services (branch_id, service_type, is_active);
CREATE UNIQUE INDEX uq_service_global_code ON extra_services (code) WHERE branch_id IS NULL;

CREATE TABLE booking_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  extra_service_id uuid NOT NULL,
  quantity numeric(10,2) NOT NULL,
  unit_price numeric(12,2) NOT NULL,
  line_total numeric(12,2) NOT NULL,
  note varchar(255),
  added_by_staff_id uuid,            -- H-3: Track staff who added the service (Running Tab model)
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_booking_services_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_booking_services_service FOREIGN KEY (extra_service_id) REFERENCES extra_services(id),
  CONSTRAINT fk_booking_services_staff FOREIGN KEY (added_by_staff_id) REFERENCES users(id) ON DELETE SET NULL,
  -- M-3/H-3: UNIQUE (booking_id, extra_service_id) REMOVED — Running Tab allows multiple rows per service
  CONSTRAINT check_service_qty CHECK (quantity > 0),
  CONSTRAINT check_service_price CHECK (unit_price >= 0 AND line_total >= 0)
);

CREATE INDEX idx_booking_services_staff ON booking_services (added_by_staff_id);

-- ============================================
-- DB Triggers cho tính toán Add-on tự động
-- ============================================

CREATE OR REPLACE FUNCTION update_booking_addon_amount()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE bookings 
        SET addon_amount = addon_amount + NEW.line_total,
            total_amount = total_amount + NEW.line_total,
            updated_at = now()
        WHERE id = NEW.booking_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE bookings 
        SET addon_amount = addon_amount - OLD.line_total,
            total_amount = total_amount - OLD.line_total,
            updated_at = now()
        WHERE id = OLD.booking_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        UPDATE bookings 
        SET addon_amount = addon_amount - OLD.line_total + NEW.line_total,
            total_amount = total_amount - OLD.line_total + NEW.line_total,
            updated_at = now()
        WHERE id = NEW.booking_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_booking_addon_amount
AFTER INSERT OR UPDATE OR DELETE ON booking_services
FOR EACH ROW EXECUTE FUNCTION update_booking_addon_amount();

-- ============================================
-- Audit Logging Table
-- ============================================

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  actor_role varchar(20),
  branch_id uuid,
  request_id varchar(100),
  action varchar(100) NOT NULL,
  action_result varchar(20),
  target_table varchar(60) NOT NULL,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_audit_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
);

CREATE INDEX idx_audit_branch_time ON audit_logs (branch_id, created_at DESC);
CREATE INDEX idx_audit_request ON audit_logs (request_id);
CREATE INDEX idx_audit_target ON audit_logs (target_table, target_id);

-- ============================================
-- Foreign Keys for users.branch_id
-- ============================================

ALTER TABLE users 
ADD CONSTRAINT fk_users_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT;

-- ============================================
-- Add Foreign Keys for profiles
-- ============================================

-- ALTER TABLE profiles 
-- ADD CONSTRAINT fk_profiles_branch FOREIGN KEY (primary_branch_id) REFERENCES branches(id) ON DELETE SET NULL;
-- (already done above)

-- ============================================
-- Notifications Table
-- ============================================

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type notification_type NOT NULL,
  title varchar(200) NOT NULL,
  message text NOT NULL,
  data_json jsonb,               -- Metadata liên quan (booking_id, amount, etc.)
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_user_unread ON notifications (user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_created ON notifications (created_at);

-- ============================================
-- Migration Complete
-- ============================================

COMMIT;
