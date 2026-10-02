-- =============================================================================
-- V8 — Lý do hoàn tiền "nhân viên kết thúc sớm"
-- =============================================================================
-- Nhân viên/admin có thể kết thúc sớm một đơn đang sử dụng (sự cố, mất điện, khách
-- vi phạm nội quy…) và hoàn lại tiền. Khoản hoàn đó cần loại lý do riêng để báo cáo
-- tách khỏi hủy đơn và bảo trì. Ràng buộc CHECK trong baseline không đặt tên nên
-- Postgres tự đặt là refunds_reason_type_check.
-- =============================================================================

ALTER TABLE refunds DROP CONSTRAINT IF EXISTS refunds_reason_type_check;
ALTER TABLE refunds ADD CONSTRAINT refunds_reason_type_check
    CHECK (reason_type IN ('CANCELLATION', 'MAINTENANCE', 'LATE_PAYMENT', 'DUPLICATE_PAYMENT', 'STAFF_ENDED'));
