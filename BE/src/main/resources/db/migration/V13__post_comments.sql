-- =============================================================================
-- V13 — Bình luận bài viết cộng đồng
-- =============================================================================
-- Bài "Tìm cộng sự" trước đây không có cách nào để người đọc trả lời. Mỗi bài giờ có
-- danh sách bình luận; xóa bài thì bình luận đi theo.
-- Mọi lệnh đều idempotent.
-- =============================================================================

CREATE TABLE IF NOT EXISTS post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments (post_id, created_at);
