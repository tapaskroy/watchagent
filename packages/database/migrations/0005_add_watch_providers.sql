-- Migration: Add watch_providers column to content table
-- This stores where users can watch content (streaming, rent, buy)

ALTER TABLE content ADD COLUMN IF NOT EXISTS watch_providers JSONB;
