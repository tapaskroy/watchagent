-- Add viewing preferences text field to user_preferences table
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS viewing_preferences_text TEXT;
