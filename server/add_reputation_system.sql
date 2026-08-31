-- Issue #926: Community Reputation System Database Updates
-- Tenant-scoped Eco-Challenge enhancements for team competitions and leaderboards.

-- Maintain compatibility for unaffiliated users by allowing nullable tenant/team context.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS tenant_id TEXT NULL,
    ADD COLUMN IF NOT EXISTS team_id TEXT NULL,
    ADD COLUMN IF NOT EXISTS reputation_score INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS trust_level VARCHAR(50) DEFAULT 'Novice',
    ADD COLUMN IF NOT EXISTS badges TEXT[] DEFAULT '{}';

-- Step 2, 3, & 4: Create a log table to track point changes securely.
-- This keeps a history of why points were added (valid reports) or subtracted (spam).
CREATE TABLE IF NOT EXISTS reputation_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    tenant_id TEXT NULL,
    team_id TEXT NULL,
    points_changed INTEGER NOT NULL,
    reason VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS challenge_teams (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS challenge_team_members (
    id SERIAL PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES challenge_teams(id) ON DELETE CASCADE,
    tenant_id TEXT NULL,
    user_id TEXT NOT NULL,
    role VARCHAR(50) DEFAULT 'member',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Challenge participation rows can remain personal/global when tenant_id is null.
ALTER TABLE user_challenge_progress
    ADD COLUMN IF NOT EXISTS tenant_id TEXT NULL,
    ADD COLUMN IF NOT EXISTS team_id TEXT NULL;

-- Leaderboard rows or challenge aggregates should also be tenant/team aware.
CREATE TABLE IF NOT EXISTS challenge_leaderboard_rows (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    tenant_id TEXT NULL,
    team_id TEXT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    challenge_id TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 6: Add an index to make loading the Contributor Leaderboard super fast.
CREATE INDEX IF NOT EXISTS idx_users_reputation_score ON users(reputation_score DESC);
CREATE INDEX IF NOT EXISTS idx_users_tenant_team ON users(tenant_id, team_id);
CREATE INDEX IF NOT EXISTS idx_reputation_logs_tenant_team ON reputation_logs(tenant_id, team_id);
CREATE INDEX IF NOT EXISTS idx_challenge_teams_tenant ON challenge_teams(tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_challenge_team_members_tenant_team ON challenge_team_members(tenant_id, team_id);
CREATE INDEX IF NOT EXISTS idx_challenge_leaderboard_scope ON challenge_leaderboard_rows(tenant_id, team_id, score DESC);
