-- Migration: Community Posts
-- Members write posts about what they are working on or looking for. Posts are tagged from the
-- SAME vocabulary as profile skills/interests (the tags table), which is what lets a post feed
-- people recommendations: shared tags connect an author to readers who care about that topic.

CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    post_type VARCHAR(32) NOT NULL DEFAULT 'sharing',
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'published',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posts_feed ON posts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts (author_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS post_tags (
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    -- 'ai' when Gemini extracted the tag from the post text, 'manual' when the author picked it.
    source VARCHAR(16) NOT NULL DEFAULT 'ai',
    PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_post_tags_tag ON post_tags (tag_id);
