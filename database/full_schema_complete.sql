-- =============================================================================
-- CoSpace Project - Full Database Schema Script (100% Compatible with Spring Boot Backend)
-- Database Target: PostgreSQL 13+ / Supabase PostgreSQL
-- Date: 2026-08-03
-- =============================================================================

BEGIN;

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

-- Add exclusion constraint to prevent double bookings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'bookings_workspace_id_start_at_end_at_excl'
    ) THEN
        ALTER TABLE bookings
        ADD CONSTRAINT bookings_workspace_id_start_at_end_at_excl EXCLUDE USING gist (
            workspace_id WITH =,
            tstzrange(start_at, end_at) WITH &&
        );
    END IF;
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

COMMIT;
