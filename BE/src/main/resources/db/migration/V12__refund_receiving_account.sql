-- =============================================================================
-- V12 — Tài khoản nhận tiền hoàn
-- =============================================================================
-- Khách hủy đơn đã thanh toán online chỉ thấy "Đang xử lý" mà không biết tiền về đâu,
-- còn chi nhánh muốn chuyển khoản lại thì không có số tài khoản. Khách giờ tự nhập
-- tài khoản nhận tiền cho khoản hoàn đang chờ; nhân viên thấy nó trên trang Hoàn tiền.
-- Mọi lệnh đều idempotent.
-- =============================================================================

ALTER TABLE refunds ADD COLUMN IF NOT EXISTS receiving_bank_name varchar(100);
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS receiving_account_number varchar(30);
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS receiving_account_name varchar(100);
