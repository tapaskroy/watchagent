import { db } from '@watchagent/database';
import { sql } from 'drizzle-orm';
import { logger } from '../config/logger';

/**
 * Run pending database migrations on startup
 * This ensures the database schema is up-to-date before the API starts
 */
export async function runMigrations(): Promise<void> {
  try {
    logger.info('Checking for pending migrations...');

    // Migration 0004: Add conversation_summary and rating_patterns columns
    await runMigration0004();

    // Migration 0005: Add watch_providers column
    await runMigration0005();

    logger.info('✓ All migrations completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
}

async function runMigration0004(): Promise<void> {
  try {
    // Check if columns already exist
    const result = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'user_preferences'
      AND column_name IN ('conversation_summary', 'rating_patterns')
    `);

    if (result.rows && result.rows.length === 2) {
      logger.info('Migration 0004: Already applied, skipping');
      return;
    }

    logger.info('Migration 0004: Adding conversation_summary and rating_patterns columns...');

    // Add conversation_summary column
    await db.execute(sql`
      ALTER TABLE user_preferences
      ADD COLUMN IF NOT EXISTS conversation_summary JSONB DEFAULT '{}'
    `);

    // Add rating_patterns column
    await db.execute(sql`
      ALTER TABLE user_preferences
      ADD COLUMN IF NOT EXISTS rating_patterns JSONB DEFAULT '{}'
    `);

    // Create indexes
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_user_preferences_conversation_summary
      ON user_preferences USING GIN (conversation_summary)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_user_preferences_rating_patterns
      ON user_preferences USING GIN (rating_patterns)
    `);

    // Add comments
    await db.execute(sql`
      COMMENT ON COLUMN user_preferences.conversation_summary IS 'Stores conversation summaries including onboarding and recent chats for recommendation context'
    `);

    await db.execute(sql`
      COMMENT ON COLUMN user_preferences.rating_patterns IS 'Stores analyzed rating patterns including genre averages and quality thresholds'
    `);

    logger.info('✓ Migration 0004: Completed successfully');
  } catch (error: any) {
    // If error is about column already existing, ignore it
    if (error.message && error.message.includes('already exists')) {
      logger.info('Migration 0004: Columns already exist, skipping');
      return;
    }
    throw error;
  }
}

async function runMigration0005(): Promise<void> {
  try {
    // Check if column already exists
    const result = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'content'
      AND column_name = 'watch_providers'
    `);

    if (result.rows && result.rows.length > 0) {
      logger.info('Migration 0005: Already applied, skipping');
      return;
    }

    logger.info('Migration 0005: Adding watch_providers column...');

    // Add watch_providers column
    await db.execute(sql`
      ALTER TABLE content
      ADD COLUMN IF NOT EXISTS watch_providers JSONB
    `);

    // Add comment
    await db.execute(sql`
      COMMENT ON COLUMN content.watch_providers IS 'Stores where to watch information (streaming, rent, buy options) from TMDB'
    `);

    logger.info('✓ Migration 0005: Completed successfully');
  } catch (error: any) {
    // If error is about column already existing, ignore it
    if (error.message && error.message.includes('already exists')) {
      logger.info('Migration 0005: Column already exists, skipping');
      return;
    }
    throw error;
  }
}
