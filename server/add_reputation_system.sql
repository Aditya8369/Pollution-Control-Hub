-- Issue #926: Community Reputation System Database Updates

-- Step 1, 5, & 7: Add reputation score, trust levels, and badges to the existing users table
ALTER TABLE users 
ADD COLUMN reputation_score INTEGER DEFAULT 0,
ADD COLUMN trust_level VARCHAR(50) DEFAULT 'Novice',
ADD COLUMN badges TEXT[] DEFAULT '{}';

-- Step 2, 3, & 4: Create a log table to track point changes securely
-- This keeps a history of why points were added (valid reports) or subtracted (spam)
CREATE TABLE IF NOT EXISTS reputation_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    points_changed INTEGER NOT NULL, -- Can be positive (+10) or negative (-20)
    reason VARCHAR(255) NOT NULL,    -- e.g., 'Valid report submitted', 'Spam penalty'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 6: Add an index to make loading the Contributor Leaderboard super fast
CREATE INDEX idx_users_reputation_score ON users(reputation_score DESC);
