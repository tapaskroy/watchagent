-- Migration: Add conversation summary and rating patterns to user preferences
-- This enables rich memory and context for personalized recommendations

-- Add conversation_summary field to store conversation memory
ALTER TABLE user_preferences
ADD COLUMN conversation_summary JSONB DEFAULT '{}';

-- Add rating_patterns field to store analyzed rating patterns
ALTER TABLE user_preferences
ADD COLUMN rating_patterns JSONB DEFAULT '{}';

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_preferences_conversation_summary
ON user_preferences USING GIN (conversation_summary);

CREATE INDEX IF NOT EXISTS idx_user_preferences_rating_patterns
ON user_preferences USING GIN (rating_patterns);

-- Add comments for documentation
COMMENT ON COLUMN user_preferences.conversation_summary IS 'Stores conversation summaries including onboarding and recent chats for recommendation context';
COMMENT ON COLUMN user_preferences.rating_patterns IS 'Stores analyzed rating patterns including genre averages and quality thresholds';
