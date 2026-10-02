-- =============================================================================
-- V5 — Điểm uy tín của khách hàng
-- =============================================================================
-- 1. users.reputation_score: điểm uy tín (0..100), mọi tài khoản bắt đầu ở 100.
-- 2. reputation_events: nhật ký cộng/trừ điểm. Mỗi đơn chỉ bị phạt một lần cho
--    mỗi lý do (UNIQUE booking_id + reason), nên job định kỳ chạy lại không phạt trùng.
-- Mọi lệnh đều idempotent.
-- =============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS reputation_score INT NOT NULL DEFAULT 100;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_users_reputation_score') THEN
        ALTER TABLE users ADD CONSTRAINT check_users_reputation_score
            CHECK (reputation_score BETWEEN 0 AND 100);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS reputation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  booking_id uuid,
  reason varchar(32) NOT NULL,
  delta int NOT NULL,
  score_after int NOT NULL,
  note varchar(255),
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_reputation_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_reputation_events_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT uq_reputation_events_booking_reason UNIQUE (booking_id, reason)
);

CREATE INDEX IF NOT EXISTS idx_reputation_events_user ON reputation_events (user_id, created_at DESC);
