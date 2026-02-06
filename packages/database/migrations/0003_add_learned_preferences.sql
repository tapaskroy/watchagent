-- Add learned preferences column to user_preferences table
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS learned_preferences JSONB NOT NULL DEFAULT '{}'::jsonb;
