-- ============================================
-- Migration V2: Add Notifications Table
-- ============================================
-- Ngày: 2026-06-30
-- Mục tiêu: Thêm bảng notifications cho in-app notification
-- Quyết định: L5 trong GOAL Analysis

BEGIN;

-- ============================================
-- Notification Types Enum
-- ============================================

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

-- Index: lấy notifications chưa đọc của user, sắp xếp theo thời gian
CREATE INDEX idx_notifications_user_unread ON notifications (user_id, is_read, created_at DESC);

-- Index: cleanup notifications cũ (optional retention policy)
CREATE INDEX idx_notifications_created ON notifications (created_at);

COMMIT;
