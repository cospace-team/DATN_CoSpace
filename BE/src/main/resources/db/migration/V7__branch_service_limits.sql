-- =============================================================================
-- V7 — Giới hạn số lượng dịch vụ thêm theo cơ sở
-- =============================================================================
-- Một số dịch vụ là thiết bị có hạn (máy chiếu, bảng trắng di động, loa…): cơ sở chỉ
-- có N cái nên cùng một lúc tối đa N lượt được dùng. Giới hạn đặt theo (chi nhánh,
-- mã dịch vụ) nên áp được cho cả dịch vụ chung toàn hệ thống lẫn dịch vụ riêng của
-- chi nhánh. Không có dòng nào = không giới hạn (đồ uống, in ấn…).
-- Số đang dùng = tổng số lượng trên các đơn còn hiệu lực có thời gian chồng lấn.
-- Mọi lệnh đều idempotent.
-- =============================================================================

CREATE TABLE IF NOT EXISTS branch_service_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL,
  service_code varchar(64) NOT NULL,
  max_concurrent int NOT NULL,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_branch_service_limits_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT uq_branch_service_limits UNIQUE (branch_id, service_code),
  CONSTRAINT check_branch_service_limits_max CHECK (max_concurrent >= 0)
);
