-- Spring Boot auto-runs data.sql on startup (spring.sql.init.mode=always)
-- Seed workspace_types with deterministic UUIDs

INSERT INTO workspace_types (id, code, name, capacity_default)
VALUES
  ('a1000000-0000-0000-0000-000000000001', 'desk', 'Bàn làm việc', 1),
  ('a1000000-0000-0000-0000-000000000002', 'meeting_room', 'Phòng họp', 8),
  ('a1000000-0000-0000-0000-000000000003', 'private_office', 'Văn phòng riêng', 4)
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  capacity_default = EXCLUDED.capacity_default;
