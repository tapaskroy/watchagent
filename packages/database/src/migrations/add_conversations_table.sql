-- Create conversations table for storing chat history
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]', -- Array of {role: 'user'|'assistant', content: string, timestamp: string}
  context JSONB NOT NULL DEFAULT '{}', -- Store learned preferences, current topic, etc.
  is_onboarding BOOLEAN NOT NULL DEFAULT false, -- Track if this is the initial onboarding conversation
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX conversations_user_id_idx ON conversations(user_id);
CREATE INDEX conversations_created_at_idx ON conversations(created_at);
CREATE INDEX conversations_onboarding_idx ON conversations(user_id, is_onboarding);
