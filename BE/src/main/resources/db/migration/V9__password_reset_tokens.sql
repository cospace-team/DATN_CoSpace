-- =============================================================================
-- V9 — Đặt lại mật khẩu qua email
-- =============================================================================
-- password_reset_tokens: mỗi yêu cầu "Quên mật khẩu" tạo một token dùng một lần,
-- hết hạn sau 30 phút. Chỉ lưu SHA-256 của token, link trong email mới chứa token gốc,
-- nên người đọc được database cũng không dùng được token.
-- Mọi lệnh đều idempotent.
-- =============================================================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token_hash varchar(64) NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT uq_password_reset_tokens_hash UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens (user_id, created_at DESC);
