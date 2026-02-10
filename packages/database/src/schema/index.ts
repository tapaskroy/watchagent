import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  decimal,
  jsonb,
  index,
  uniqueIndex,
  boolean,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const contentTypeEnum = pgEnum('content_type', ['movie', 'tv']);
export const watchlistStatusEnum = pgEnum('watchlist_status', [
  'to_watch',
  'watching',
  'watched',
]);
export const activityTypeEnum = pgEnum('activity_type', [
  'rating',
  'watchlist_add',
  'review',
  'follow',
]);

// Users table
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    username: varchar('username', { length: 50 }).notNull().unique(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    fullName: varchar('full_name', { length: 100 }),
    bio: text('bio'),
    avatarUrl: text('avatar_url'),
    coverPhotoUrl: text('cover_photo_url'),
    profileVisibility: varchar('profile_visibility', { length: 20 })
      .notNull()
      .default('public'), // public, friends_only, private
    showWatchlist: boolean('show_watchlist').notNull().default(true),
    showRatings: boolean('show_ratings').notNull().default(true),
    isActive: boolean('is_active').notNull().default(true),
    emailVerified: boolean('email_verified').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    usernameIdx: uniqueIndex('users_username_idx').on(table.username),
    emailIdx: uniqueIndex('users_email_idx').on(table.email),
    activeIdx: index('users_active_idx').on(table.isActive),
  })
);

// User preferences (stored as JSONB for flexibility)
export const userPreferences = pgTable('user_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  preferredGenres: jsonb('preferred_genres').notNull().default([]), // Array of genre IDs
  favoriteActors: jsonb('favorite_actors').notNull().default([]), // Array of actor names/IDs
  preferredLanguages: jsonb('preferred_languages').notNull().default(['en']),
  contentTypes: jsonb('content_types').notNull().default(['movie', 'tv']), // ['movie', 'tv']
  notificationSettings: jsonb('notification_settings').notNull().default({}),
  viewingPreferencesText: text('viewing_preferences_text'), // User's viewing preferences in natural language
  learnedPreferences: jsonb('learned_preferences').notNull().default('{}'), // Auto-learned from conversations
  conversationSummary: jsonb('conversation_summary').notNull().default('{}'), // Conversation memory for recommendations
  ratingPatterns: jsonb('rating_patterns').notNull().default('{}'), // Analyzed rating patterns and preferences
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Content table (cached from TMDB/OMDB)
export const content = pgTable(
  'content',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tmdbId: varchar('tmdb_id', { length: 50 }).notNull().unique(),
    imdbId: varchar('imdb_id', { length: 50 }),
    type: contentTypeEnum('type').notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    originalTitle: varchar('original_title', { length: 500 }),
    overview: text('overview'),
    releaseDate: varchar('release_date', { length: 20 }),
    runtime: integer('runtime'), // in minutes
    genres: jsonb('genres').notNull().default([]), // Array of genre objects
    posterPath: text('poster_path'),
    backdropPath: text('backdrop_path'),
    tmdbRating: decimal('tmdb_rating', { precision: 3, scale: 1 }),
    tmdbVoteCount: integer('tmdb_vote_count'),
    imdbRating: decimal('imdb_rating', { precision: 3, scale: 1 }),
    popularity: decimal('popularity', { precision: 10, scale: 2 }),
    language: varchar('language', { length: 10 }),
    cast: jsonb('cast').notNull().default([]), // Array of cast member objects
    crew: jsonb('crew').notNull().default([]), // Array of crew member objects
    productionCompanies: jsonb('production_companies').notNull().default([]),
    keywords: jsonb('keywords').notNull().default([]),
    trailerUrl: text('trailer_url'),
    watchProviders: jsonb('watch_providers'), // Watch provider data (streaming, rent, buy)
    budget: integer('budget'),
    revenue: integer('revenue'),
    status: varchar('status', { length: 50 }),
    // TV-specific fields
    numberOfSeasons: integer('number_of_seasons'),
    numberOfEpisodes: integer('number_of_episodes'),
    episodeRuntime: jsonb('episode_runtime'), // Array of runtimes
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    tmdbIdIdx: uniqueIndex('content_tmdb_id_idx').on(table.tmdbId),
    imdbIdIdx: index('content_imdb_id_idx').on(table.imdbId),
    typeIdx: index('content_type_idx').on(table.type),
    popularityIdx: index('content_popularity_idx').on(table.popularity),
    releaseDateIdx: index('content_release_date_idx').on(table.releaseDate),
  })
);

// Watchlist items
export const watchlistItems = pgTable(
  'watchlist_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    contentId: uuid('content_id')
      .notNull()
      .references(() => content.id, { onDelete: 'cascade' }),
    status: watchlistStatusEnum('status').notNull().default('to_watch'),
    priority: integer('priority').default(0), // For custom ordering
    notes: text('notes'),
    addedAt: timestamp('added_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    watchedAt: timestamp('watched_at'),
  },
  (table) => ({
    userContentIdx: uniqueIndex('watchlist_user_content_idx').on(table.userId, table.contentId),
    userStatusIdx: index('watchlist_user_status_idx').on(table.userId, table.status),
    addedAtIdx: index('watchlist_added_at_idx').on(table.addedAt),
  })
);

// Ratings and reviews
export const ratings = pgTable(
  'ratings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    contentId: uuid('content_id')
      .notNull()
      .references(() => content.id, { onDelete: 'cascade' }),
    rating: decimal('rating', { precision: 3, scale: 1 }).notNull(), // 1-5 scale
    review: text('review'),
    isPublic: boolean('is_public').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userContentIdx: uniqueIndex('ratings_user_content_idx').on(table.userId, table.contentId),
    userIdIdx: index('ratings_user_id_idx').on(table.userId),
    contentIdIdx: index('ratings_content_id_idx').on(table.contentId),
    ratingIdx: index('ratings_rating_idx').on(table.rating),
    createdAtIdx: index('ratings_created_at_idx').on(table.createdAt),
  })
);

// Social follows
export const follows = pgTable(
  'follows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    followerId: uuid('follower_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    followingId: uuid('following_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    followerFollowingIdx: uniqueIndex('follows_follower_following_idx').on(
      table.followerId,
      table.followingId
    ),
    followerIdx: index('follows_follower_idx').on(table.followerId),
    followingIdx: index('follows_following_idx').on(table.followingId),
  })
);

// Activity feed
export const activities = pgTable(
  'activities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: activityTypeEnum('type').notNull(),
    contentId: uuid('content_id').references(() => content.id, { onDelete: 'cascade' }),
    targetUserId: uuid('target_user_id').references(() => users.id, { onDelete: 'cascade' }), // For follow activities
    metadata: jsonb('metadata').notNull().default({}), // Additional data (rating value, review excerpt, etc.)
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('activities_user_id_idx').on(table.userId),
    createdAtIdx: index('activities_created_at_idx').on(table.createdAt),
    typeIdx: index('activities_type_idx').on(table.type),
  })
);

// Pre-computed recommendations
export const recommendations = pgTable(
  'recommendations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    contentId: uuid('content_id')
      .notNull()
      .references(() => content.id, { onDelete: 'cascade' }),
    score: decimal('score', { precision: 5, scale: 4 }).notNull(), // 0-1 confidence score
    reason: text('reason').notNull(), // LLM-generated explanation
    algorithm: varchar('algorithm', { length: 50 }).notNull().default('llm'), // 'llm', 'collaborative', 'content-based'
    metadata: jsonb('metadata').notNull().default({}), // Additional context
    createdAt: timestamp('created_at').notNull().defaultNow(),
    expiresAt: timestamp('expires_at').notNull(), // 24-48 hour TTL
  },
  (table) => ({
    userScoreIdx: index('recommendations_user_score_idx').on(table.userId, table.score),
    userIdIdx: index('recommendations_user_id_idx').on(table.userId),
    expiresAtIdx: index('recommendations_expires_at_idx').on(table.expiresAt),
  })
);

// Refresh token sessions
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    refreshToken: varchar('refresh_token', { length: 500 }).notNull().unique(),
    deviceInfo: jsonb('device_info').notNull().default({}), // Browser, OS, IP
    isRevoked: boolean('is_revoked').notNull().default(false),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    refreshTokenIdx: uniqueIndex('sessions_refresh_token_idx').on(table.refreshToken),
    userIdIdx: index('sessions_user_id_idx').on(table.userId),
    expiresAtIdx: index('sessions_expires_at_idx').on(table.expiresAt),
  })
);

// API cache for external API responses
export const apiCache = pgTable(
  'api_cache',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cacheKey: varchar('cache_key', { length: 500 }).notNull().unique(),
    source: varchar('source', { length: 50 }).notNull(), // 'tmdb', 'omdb'
    endpoint: varchar('endpoint', { length: 255 }).notNull(),
    response: jsonb('response').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    cacheKeyIdx: uniqueIndex('api_cache_key_idx').on(table.cacheKey),
    sourceIdx: index('api_cache_source_idx').on(table.source),
    expiresAtIdx: index('api_cache_expires_at_idx').on(table.expiresAt),
  })
);

// Conversations table for chat history
export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    messages: jsonb('messages').notNull().default([]), // Array of {role, content, timestamp}
    context: jsonb('context').notNull().default({}), // Learned preferences, current topic
    isOnboarding: boolean('is_onboarding').notNull().default(false),
    onboardingCompleted: boolean('onboarding_completed').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('conversations_user_id_idx').on(table.userId),
    createdAtIdx: index('conversations_created_at_idx').on(table.createdAt),
    onboardingIdx: index('conversations_onboarding_idx').on(table.userId, table.isOnboarding),
  })
);

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  preferences: one(userPreferences, {
    fields: [users.id],
    references: [userPreferences.userId],
  }),
  watchlistItems: many(watchlistItems),
  ratings: many(ratings),
  activities: many(activities),
  recommendations: many(recommendations),
  sessions: many(sessions),
  conversations: many(conversations),
  followers: many(follows, { relationName: 'following' }),
  following: many(follows, { relationName: 'follower' }),
}));

export const contentRelations = relations(content, ({ many }) => ({
  watchlistItems: many(watchlistItems),
  ratings: many(ratings),
  activities: many(activities),
  recommendations: many(recommendations),
}));

export const watchlistItemsRelations = relations(watchlistItems, ({ one }) => ({
  user: one(users, {
    fields: [watchlistItems.userId],
    references: [users.id],
  }),
  content: one(content, {
    fields: [watchlistItems.contentId],
    references: [content.id],
  }),
}));

export const ratingsRelations = relations(ratings, ({ one }) => ({
  user: one(users, {
    fields: [ratings.userId],
    references: [users.id],
  }),
  content: one(content, {
    fields: [ratings.contentId],
    references: [content.id],
  }),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    fields: [follows.followerId],
    references: [users.id],
    relationName: 'follower',
  }),
  following: one(users, {
    fields: [follows.followingId],
    references: [users.id],
    relationName: 'following',
  }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
  content: one(content, {
    fields: [activities.contentId],
    references: [content.id],
  }),
  targetUser: one(users, {
    fields: [activities.targetUserId],
    references: [users.id],
  }),
}));

export const recommendationsRelations = relations(recommendations, ({ one }) => ({
  user: one(users, {
    fields: [recommendations.userId],
    references: [users.id],
  }),
  content: one(content, {
    fields: [recommendations.contentId],
    references: [content.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
}));

// Export all types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type Content = typeof content.$inferSelect;
export type WatchlistItem = typeof watchlistItems.$inferSelect;
export type Rating = typeof ratings.$inferSelect;
export type Follow = typeof follows.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type Recommendation = typeof recommendations.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type ApiCache = typeof apiCache.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
