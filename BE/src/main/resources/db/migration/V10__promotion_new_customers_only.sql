-- =============================================================================
-- V10 — Khuyến mãi chỉ dành cho khách đặt chỗ lần đầu
-- =============================================================================
-- new_customers_only = true: mã chỉ áp dụng khi khách chưa có đơn nào đã thanh toán
-- (CONFIRMED / CHECKED_IN / COMPLETED / NO_SHOW). Mặc định false nên các mã hiện có
-- giữ nguyên hành vi.
-- WELCOME2026 được quảng cáo là "cho đơn đặt chỗ đầu tiên" nhưng trước đây ai cũng
-- dùng được, nên bật cờ này cho nó.
-- Mọi lệnh đều idempotent.
-- =============================================================================

ALTER TABLE promotions ADD COLUMN IF NOT EXISTS new_customers_only boolean NOT NULL DEFAULT false;

UPDATE promotions SET new_customers_only = true WHERE code = 'WELCOME2026';
