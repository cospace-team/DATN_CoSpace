-- =============================================================================
-- V6 — Đặt nhiều chỗ cùng lúc (đơn nhóm)
-- =============================================================================
-- 1. booking_groups: một lần đặt nhiều chỗ cùng khung giờ, cùng chi nhánh. Mỗi chỗ
--    vẫn là một đơn (bookings) riêng để check-in, hủy, hoàn tiền từng chỗ như cũ;
--    bookings.group_id gắn các đơn đó vào nhóm.
-- 2. Thanh toán gộp: một mã VietQR cho cả nhóm nhưng vẫn ghi một dòng payments cho
--    mỗi đơn (số tiền của đơn đó). Các dòng chung một group_order_id (= order_id của
--    dòng đầu, chính là mã gửi sang PayOS), nên webhook xác nhận được tất cả.
-- Mọi lệnh đều idempotent.
-- =============================================================================

CREATE TABLE IF NOT EXISTS booking_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_code varchar(32) UNIQUE NOT NULL,
  user_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_booking_groups_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_booking_groups_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT check_booking_groups_time CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_booking_groups_user ON booking_groups (user_id, created_at DESC);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS group_id uuid;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_bookings_group') THEN
        ALTER TABLE bookings ADD CONSTRAINT fk_bookings_group
            FOREIGN KEY (group_id) REFERENCES booking_groups(id) ON DELETE SET NULL;
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_bookings_group ON bookings (group_id) WHERE group_id IS NOT NULL;

ALTER TABLE payments ADD COLUMN IF NOT EXISTS booking_group_id uuid;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS group_order_id varchar(64);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payments_booking_group') THEN
        ALTER TABLE payments ADD CONSTRAINT fk_payments_booking_group
            FOREIGN KEY (booking_group_id) REFERENCES booking_groups(id) ON DELETE SET NULL;
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_payments_group_order ON payments (group_order_id) WHERE group_order_id IS NOT NULL;
