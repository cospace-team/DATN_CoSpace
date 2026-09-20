-- Migration: Partner Matching & Profiles Schema
-- Tables: profiles, tags, profile_skills, profile_interests, profile_match_scores

CREATE TABLE IF NOT EXISTS profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    profession VARCHAR(120),
    company VARCHAR(120),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    contact_link VARCHAR(2048),
    contact_public BOOLEAN NOT NULL DEFAULT false,
    primary_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(80) UNIQUE NOT NULL,
    category VARCHAR(32) NOT NULL DEFAULT 'skill',
    is_active BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO tags (id, name, category, is_active) VALUES
    ('11111111-1111-1111-1111-111111111001', 'Frontend Dev', 'skill', true),
    ('11111111-1111-1111-1111-111111111002', 'Backend Dev', 'skill', true),
    ('11111111-1111-1111-1111-111111111003', 'Fullstack Dev', 'skill', true),
    ('11111111-1111-1111-1111-111111111004', 'UI/UX Design', 'skill', true),
    ('11111111-1111-1111-1111-111111111005', 'AI / Machine Learning', 'skill', true),
    ('11111111-1111-1111-1111-111111111006', 'Mobile App', 'skill', true),
    ('11111111-1111-1111-1111-111111111007', 'DevOps & Cloud', 'skill', true),
    ('11111111-1111-1111-1111-111111111008', 'Data Science', 'skill', true),
    ('11111111-1111-1111-1111-111111111009', 'Khởi nghiệp', 'interest', true),
    ('11111111-1111-1111-1111-111111111010', 'Đầu tư', 'interest', true),
    ('11111111-1111-1111-1111-111111111011', 'Fintech', 'interest', true),
    ('11111111-1111-1111-1111-111111111012', 'EdTech', 'interest', true),
    ('11111111-1111-1111-1111-111111111013', 'Networking', 'interest', true),
    ('11111111-1111-1111-1111-111111111014', 'Công nghệ', 'industry', true),
    ('11111111-1111-1111-1111-111111111015', 'Tài chính - Ngân hàng', 'industry', true),
    ('11111111-1111-1111-1111-111111111016', 'Thương mại điện tử', 'industry', true)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS profile_skills (
    profile_user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    level SMALLINT NOT NULL DEFAULT 3 CHECK (level >= 1 AND level <= 5),
    PRIMARY KEY (profile_user_id, tag_id)
);

CREATE TABLE IF NOT EXISTS profile_interests (
    profile_user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    priority SMALLINT NOT NULL DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
    PRIMARY KEY (profile_user_id, tag_id)
);

CREATE TABLE IF NOT EXISTS profile_match_scores (
    profile_user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    matched_user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    score NUMERIC(6,4) NOT NULL,
    reasons_json JSONB,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (profile_user_id, matched_user_id)
);
CREATE INDEX IF NOT EXISTS idx_match_scores_ranking ON profile_match_scores (profile_user_id, score DESC);
