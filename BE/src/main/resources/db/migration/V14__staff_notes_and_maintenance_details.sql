-- =============================================================================
-- V14 — Sổ ghi chú của quầy + chi tiết bảo trì
-- =============================================================================
-- staff_notes: một sổ chung cho nhân viên chi nhánh. Mỗi dòng thuộc một loại:
--   handover   ghi chú giao ca (open = chưa có ai nhận ca, resolved = đã nhận)
--   incident   sự cố (open = đang xử lý, resolved = đã xử lý xong)
--   lost_found đồ thất lạc (open = đang giữ, resolved = đã trả khách)
--   customer   ghi chú theo khách (open = đang hiển thị khi check-in, resolved = đã gỡ)
-- workspace_maintenance: mức ưu tiên và ảnh hiện trường để quản lý chi nhánh nắm được.
-- Mọi lệnh đều idempotent.
-- =============================================================================

CREATE TABLE IF NOT EXISTS staff_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  kind varchar(16) NOT NULL CHECK (kind IN ('handover', 'incident', 'lost_found', 'customer')),
  title varchar(160) NOT NULL,
  body text,
  customer_id uuid REFERENCES users(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL,
  photo_url text,
  status varchar(12) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolution_note varchar(255)
);

CREATE INDEX IF NOT EXISTS idx_staff_notes_branch ON staff_notes (branch_id, kind, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_notes_customer ON staff_notes (customer_id) WHERE customer_id IS NOT NULL;

ALTER TABLE workspace_maintenance ADD COLUMN IF NOT EXISTS priority varchar(12) NOT NULL DEFAULT 'normal';
ALTER TABLE workspace_maintenance ADD COLUMN IF NOT EXISTS photo_url text;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_maintenance_priority') THEN
    ALTER TABLE workspace_maintenance
      ADD CONSTRAINT check_maintenance_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
  END IF;
END $$;
