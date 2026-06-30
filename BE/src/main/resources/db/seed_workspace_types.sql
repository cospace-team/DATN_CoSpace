-- ═══════════════════════════════════════════════════════════
-- Seed: workspace_types + ensure svg_content column on floors
-- Run once against the Supabase PostgreSQL database
-- ═══════════════════════════════════════════════════════════

-- 1. Add svg_content column if not present
ALTER TABLE floors ADD COLUMN IF NOT EXISTS svg_content TEXT;

-- 2. Seed workspace_types (idempotent)
INSERT INTO workspace_types (id, code, name, capacity_default)
VALUES
  ('a1000000-0000-0000-0000-000000000001', 'desk', 'Bàn làm việc', 1),
  ('a1000000-0000-0000-0000-000000000002', 'meeting_room', 'Phòng họp', 8),
  ('a1000000-0000-0000-0000-000000000003', 'private_office', 'Văn phòng riêng', 4)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  capacity_default = EXCLUDED.capacity_default;
