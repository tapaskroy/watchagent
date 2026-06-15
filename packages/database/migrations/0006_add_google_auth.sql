-- Add Google OAuth support to users table
ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

CREATE INDEX users_google_id_idx ON users (google_id) WHERE google_id IS NOT NULL;
