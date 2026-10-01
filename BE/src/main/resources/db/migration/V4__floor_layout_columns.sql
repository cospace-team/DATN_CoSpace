-- =============================================================================
-- V4 — Cột sơ đồ tầng còn thiếu trong baseline
-- =============================================================================
-- Entity Floor ánh xạ floors.layout_json (sơ đồ kéo-thả) và floors.svg_content,
-- nhưng V1 baseline không tạo hai cột này (chúng nằm trong migration cũ
-- database/archive/migrations-legacy/20260701000000_floor_layout_json.sql).
-- Database Supabase đã có sẵn nên lệnh dưới đây không đổi gì ở đó; còn database
-- mới (máy demo, CI) thì thiếu cột và mọi truy vấn floors đều lỗi.
-- Mọi lệnh đều idempotent.
-- =============================================================================

ALTER TABLE floors ADD COLUMN IF NOT EXISTS layout_json JSONB;
ALTER TABLE floors ADD COLUMN IF NOT EXISTS svg_content TEXT;
