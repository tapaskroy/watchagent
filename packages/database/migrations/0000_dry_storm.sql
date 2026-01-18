DO $$ BEGIN
 CREATE TYPE "activity_type" AS ENUM('rating', 'watchlist_add', 'review', 'follow');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "content_type" AS ENUM('movie', 'tv');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "watchlist_status" AS ENUM('to_watch', 'watching', 'watched');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "activity_type" NOT NULL,
	"content_id" uuid,
	"target_user_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cache_key" varchar(500) NOT NULL,
	"source" varchar(50) NOT NULL,
	"endpoint" varchar(255) NOT NULL,
	"response" jsonb NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_cache_cache_key_unique" UNIQUE("cache_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tmdb_id" varchar(50) NOT NULL,
	"imdb_id" varchar(50),
	"type" "content_type" NOT NULL,
	"title" varchar(500) NOT NULL,
	"original_title" varchar(500),
	"overview" text,
	"release_date" varchar(20),
	"runtime" integer,
	"genres" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"poster_path" text,
	"backdrop_path" text,
	"tmdb_rating" numeric(3, 1),
	"tmdb_vote_count" integer,
	"imdb_rating" numeric(3, 1),
	"popularity" numeric(10, 2),
	"language" varchar(10),
	"cast" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"crew" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"production_companies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"trailer_url" text,
	"budget" integer,
	"revenue" integer,
	"status" varchar(50),
	"number_of_seasons" integer,
	"number_of_episodes" integer,
	"episode_runtime" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "content_tmdb_id_unique" UNIQUE("tmdb_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "follows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"follower_id" uuid NOT NULL,
	"following_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"content_id" uuid NOT NULL,
	"rating" numeric(3, 1) NOT NULL,
	"review" text,
	"is_public" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"content_id" uuid NOT NULL,
	"score" numeric(5, 4) NOT NULL,
	"reason" text NOT NULL,
	"algorithm" varchar(50) DEFAULT 'llm' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"refresh_token" varchar(500) NOT NULL,
	"device_info" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_refresh_token_unique" UNIQUE("refresh_token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"preferred_genres" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"favorite_actors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"preferred_languages" jsonb DEFAULT '["en"]'::jsonb NOT NULL,
	"content_types" jsonb DEFAULT '["movie","tv"]'::jsonb NOT NULL,
	"notification_settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(50) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"full_name" varchar(100),
	"bio" text,
	"avatar_url" text,
	"cover_photo_url" text,
	"profile_visibility" varchar(20) DEFAULT 'public' NOT NULL,
	"show_watchlist" boolean DEFAULT true NOT NULL,
	"show_ratings" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "watchlist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"content_id" uuid NOT NULL,
	"status" "watchlist_status" DEFAULT 'to_watch' NOT NULL,
	"priority" integer DEFAULT 0,
	"notes" text,
	"added_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"watched_at" timestamp
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activities_user_id_idx" ON "activities" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activities_created_at_idx" ON "activities" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activities_type_idx" ON "activities" ("type");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "api_cache_key_idx" ON "api_cache" ("cache_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_cache_source_idx" ON "api_cache" ("source");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_cache_expires_at_idx" ON "api_cache" ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "content_tmdb_id_idx" ON "content" ("tmdb_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_imdb_id_idx" ON "content" ("imdb_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_type_idx" ON "content" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_popularity_idx" ON "content" ("popularity");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_release_date_idx" ON "content" ("release_date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "follows_follower_following_idx" ON "follows" ("follower_id","following_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "follows_follower_idx" ON "follows" ("follower_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "follows_following_idx" ON "follows" ("following_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ratings_user_content_idx" ON "ratings" ("user_id","content_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ratings_user_id_idx" ON "ratings" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ratings_content_id_idx" ON "ratings" ("content_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ratings_rating_idx" ON "ratings" ("rating");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ratings_created_at_idx" ON "ratings" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recommendations_user_score_idx" ON "recommendations" ("user_id","score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recommendations_user_id_idx" ON "recommendations" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recommendations_expires_at_idx" ON "recommendations" ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_refresh_token_idx" ON "sessions" ("refresh_token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_expires_at_idx" ON "sessions" ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_idx" ON "users" ("username");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_active_idx" ON "users" ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "watchlist_user_content_idx" ON "watchlist_items" ("user_id","content_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "watchlist_user_status_idx" ON "watchlist_items" ("user_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "watchlist_added_at_idx" ON "watchlist_items" ("added_at");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "activities" ADD CONSTRAINT "activities_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "activities" ADD CONSTRAINT "activities_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_users_id_fk" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ratings" ADD CONSTRAINT "ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ratings" ADD CONSTRAINT "ratings_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
