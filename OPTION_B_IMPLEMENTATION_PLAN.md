# Option B: Enhanced Memory System - Implementation Plan

## Overview
Build a comprehensive memory and context management system that uses conversation history (especially the initial onboarding conversation) to provide highly personalized recommendations.

## Goals
1. ✅ Include initial onboarding conversation in recommendation context
2. ✅ Maintain conversation memory across sessions
3. ✅ Extract and use mood preferences, dislikes, and nuanced preferences
4. ✅ Analyze rating patterns to understand user taste
5. ✅ Build rich user preference profiles
6. ✅ Auto-refresh recommendations when context changes

---

## Architecture Changes

### 1. Database Schema Updates

#### A. Add `conversationSummary` to `userPreferences`
```sql
ALTER TABLE user_preferences
ADD COLUMN conversation_summary JSONB DEFAULT '{}';
```

Structure:
```typescript
{
  onboardingConversation: {
    summary: "User loves sci-fi and thriller movies...",
    keyPoints: ["Favorite director: Christopher Nolan", ...],
    extractedAt: "2026-02-06T..."
  },
  recentConversations: [
    {
      conversationId: "uuid",
      summary: "User asked for scary movies",
      timestamp: "2026-02-06T...",
      context: {...}
    }
  ],
  lastUpdated: "2026-02-06T..."
}
```

#### B. Add rating pattern tracking
```sql
ALTER TABLE user_preferences
ADD COLUMN rating_patterns JSONB DEFAULT '{}';
```

Structure:
```typescript
{
  genreAverages: {
    "28": 8.2,  // Action
    "35": 6.5,  // Comedy
    "18": 9.0   // Drama
  },
  ratingDistribution: {
    "9-10": 15,
    "7-8": 30,
    "5-6": 10,
    "0-4": 5
  },
  favoriteActorsAvgRating: {
    "Tom Hanks": 8.8,
    "Meryl Streep": 9.2
  },
  analyzedAt: "2026-02-06T..."
}
```

### 2. New Services

#### A. ConversationSummaryService
Location: `apps/api/src/services/conversation/conversation-summary.service.ts`

Methods:
- `summarizeOnboardingConversation(userId)` - Summarize initial onboarding
- `summarizeRecentConversations(userId, limit)` - Summarize recent chats
- `extractConversationInsights(messages)` - Extract key insights using Claude
- `updateConversationSummary(userId)` - Update user's conversation summary

#### B. RatingAnalysisService
Location: `apps/api/src/services/analysis/rating-analysis.service.ts`

Methods:
- `analyzeRatingPatterns(userId)` - Analyze user's rating patterns
- `getGenrePreferences(userId)` - Calculate genre preferences from ratings
- `identifyRatingThresholds(userId)` - Find user's quality thresholds
- `updateRatingPatterns(userId)` - Update rating pattern cache

#### C. Enhanced UserContextService
Location: `apps/api/src/services/recommendation/user-context.service.ts`

Methods:
- `buildRichUserContext(userId)` - Build comprehensive context
- `getConversationMemory(userId)` - Get conversation summaries
- `getRatingInsights(userId)` - Get rating pattern insights
- `formatContextForLLM(context)` - Format rich context for Claude

### 3. Enhanced Recommendation System

#### Modified Files:
1. `apps/api/src/services/recommendation/llm-recommendation.service.ts`
   - Update `buildUserContext()` to use new UserContextService
   - Enhance `buildRecommendationPrompt()` with rich context
   - Add auto-refresh triggers

2. `apps/api/src/services/chat/chat.service.ts`
   - Call conversation summary service after each conversation
   - Trigger recommendation refresh after meaningful conversations

3. `apps/api/src/services/preferences/preferences.service.ts`
   - Add methods to manage conversation summaries
   - Add methods to manage rating patterns

---

## Implementation Steps

### Phase 1: Database & Schema (30 min)

**Step 1.1: Create Migration**
```sql
-- Migration: Add conversation summary and rating patterns
ALTER TABLE user_preferences
ADD COLUMN conversation_summary JSONB DEFAULT '{}',
ADD COLUMN rating_patterns JSONB DEFAULT '{}';

CREATE INDEX idx_user_preferences_conversation_summary
ON user_preferences USING GIN (conversation_summary);

CREATE INDEX idx_user_preferences_rating_patterns
ON user_preferences USING GIN (rating_patterns);
```

**Step 1.2: Update TypeScript Schema**
Update `packages/database/src/schema/index.ts`:
- Add `conversationSummary` field to userPreferences table
- Add `ratingPatterns` field to userPreferences table

**Step 1.3: Update Shared Types**
Update `packages/shared/src/types/preferences.ts`:
- Add ConversationSummary interface
- Add RatingPatterns interface

---

### Phase 2: Conversation Summary Service (1.5 hours)

**Step 2.1: Create ConversationSummaryService**

File: `apps/api/src/services/conversation/conversation-summary.service.ts`

Key methods:
```typescript
async summarizeOnboardingConversation(userId: string): Promise<ConversationSummary> {
  // 1. Get onboarding conversation
  // 2. Extract all messages
  // 3. Use Claude to create summary
  // 4. Extract key points (favorites, dislikes, moods)
  // 5. Return structured summary
}

async extractConversationInsights(messages: ChatMessage[]): Promise<{
  summary: string;
  keyPoints: string[];
  moodPreferences: string[];
  dislikes: string[];
}> {
  // Use Claude to analyze conversation and extract:
  // - Overall summary (2-3 sentences)
  // - Key preference points
  // - Mood preferences mentioned
  // - Explicit dislikes
}

async updateUserConversationSummary(userId: string): Promise<void> {
  // 1. Get onboarding summary (if not exists)
  // 2. Get recent conversations (last 5)
  // 3. Summarize each
  // 4. Update userPreferences.conversationSummary
}
```

**Step 2.2: Implement LLM-based Summarization**

Prompt for summarization:
```typescript
const SUMMARIZATION_PROMPT = `
Analyze this conversation and extract the user's movie/TV preferences.

CONVERSATION:
${conversationText}

Extract and return JSON:
{
  "summary": "2-3 sentence summary of user's taste",
  "keyPoints": ["specific preferences mentioned"],
  "moodPreferences": ["moods they like: uplifting, scary, thought-provoking, etc."],
  "dislikes": ["genres/content they dislike"],
  "favoriteMovies": ["specific titles mentioned"],
  "favoriteGenres": ["genres mentioned"],
  "favoriteActors": ["actors/directors mentioned"]
}
`;
```

---

### Phase 3: Rating Analysis Service (1 hour)

**Step 3.1: Create RatingAnalysisService**

File: `apps/api/src/services/analysis/rating-analysis.service.ts`

```typescript
async analyzeRatingPatterns(userId: string): Promise<RatingPatterns> {
  // 1. Get all user ratings with content data
  // 2. Calculate genre averages
  // 3. Calculate rating distribution
  // 4. Identify favorite actors/directors from high ratings
  // 5. Return structured patterns
}

async getGenrePreferences(ratings: UserRating[]): Promise<Record<number, number>> {
  // Calculate average rating per genre
  // Return map of genreId -> avgRating
}

async identifyQualityThresholds(ratings: UserRating[]): Promise<{
  high: number;  // What rating means "loved it"
  medium: number;  // What rating means "liked it"
  low: number;  // What rating means "disliked it"
}> {
  // Analyze rating distribution
  // Identify user's personal thresholds
}
```

**Step 3.2: Cache Rating Patterns**

Update patterns every time user adds a rating:
- Trigger: After rating creation/update
- Cache in `userPreferences.ratingPatterns`
- TTL: Recalculate if > 50 new ratings since last analysis

---

### Phase 4: Enhanced User Context Builder (2 hours)

**Step 4.1: Create UserContextService**

File: `apps/api/src/services/recommendation/user-context.service.ts`

```typescript
async buildRichUserContext(userId: string): Promise<EnhancedUserContext> {
  // 1. Get base preferences
  // 2. Get conversation summary (INCLUDE ONBOARDING)
  // 3. Get rating patterns
  // 4. Get recent activity
  // 5. Get social context
  // 6. Get watchlist with notes
  // 7. Combine into rich context
}

interface EnhancedUserContext {
  userProfile: {
    preferredGenres: number[];
    favoriteActors: string[];
    preferredLanguages: string[];
    contentTypes: ('movie' | 'tv')[];
    moodPreferences: string[];  // NEW
    dislikes: string[];  // NEW
  };
  conversationMemory: {
    onboardingSummary: string;  // NEW - CRITICAL
    onboardingKeyPoints: string[];  // NEW
    recentConversationInsights: string[];  // NEW
  };
  ratingInsights: {
    genrePreferences: Record<number, number>;  // NEW
    averageRating: number;
    ratingDistribution: Record<string, number>;  // NEW
    qualityThreshold: number;  // NEW
  };
  recentActivity: {
    watched: Array<{ title: string; rating: number; review?: string }>;
    watchlist: Array<{ title: string; notes?: string; priority?: string }>;  // Enhanced
    watchlistCount: number;
  };
  socialContext: {
    friendsWatching: string[];
    trendingInNetwork: string[];
  };
}
```

**Step 4.2: Conversation Memory Retrieval**

```typescript
async getConversationMemory(userId: string): Promise<ConversationMemory> {
  // 1. Get userPreferences.conversationSummary
  // 2. If empty, generate from onboarding conversation
  // 3. Get last 5 conversations and summarize
  // 4. Return combined memory
}
```

---

### Phase 5: Enhanced Recommendation Prompt (1.5 hours)

**Step 5.1: Update LLMRecommendationService**

File: `apps/api/src/services/recommendation/llm-recommendation.service.ts`

Modify `buildRecommendationPrompt()`:

```typescript
private buildRecommendationPrompt(context: EnhancedUserContext, candidates: ContentCandidate[]): string {
  return `You are an expert movie and TV show recommendation system with deep knowledge of the user's preferences.

USER BACKGROUND (from initial conversations):
${context.conversationMemory.onboardingSummary}

Key preferences discovered:
${context.conversationMemory.onboardingKeyPoints.map(p => `- ${p}`).join('\n')}

CURRENT USER PROFILE:
Favorite Genres: ${context.userProfile.preferredGenres.map(id => GENRE_NAMES[id]).join(', ')}
Favorite Actors/Directors: ${context.userProfile.favoriteActors.join(', ')}
Preferred Languages: ${context.userProfile.preferredLanguages.join(', ')}
Content Types: ${context.userProfile.contentTypes.join(', ')}

MOOD PREFERENCES:
${context.userProfile.moodPreferences.length > 0
  ? context.userProfile.moodPreferences.map(m => `- ${m}`).join('\n')
  : 'No specific mood preferences mentioned'}

DISLIKES (avoid these):
${context.userProfile.dislikes.length > 0
  ? context.userProfile.dislikes.map(d => `- ${d}`).join('\n')
  : 'No specific dislikes mentioned'}

RATING PATTERNS (shows user's taste):
Average Rating: ${context.ratingInsights.averageRating.toFixed(1)}/10
Quality Threshold: User typically rates good content ${context.ratingInsights.qualityThreshold}+/10

Genre Preferences (by average rating):
${Object.entries(context.ratingInsights.genrePreferences)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([genreId, avgRating]) => `- ${GENRE_NAMES[parseInt(genreId)]}: ${avgRating.toFixed(1)}/10`)
  .join('\n')}

RECENTLY WATCHED & RATED:
${context.recentActivity.watched.map(w =>
  `- "${w.title}" - Rated ${w.rating}/10${w.review ? ` - "${w.review}"` : ''}`
).join('\n')}

CURRENT WATCHLIST (${context.recentActivity.watchlistCount} items):
${context.recentActivity.watchlist.slice(0, 10).map(w =>
  `- "${w.title}"${w.notes ? ` - Note: ${w.notes}` : ''}${w.priority ? ` [${w.priority} priority]` : ''}`
).join('\n')}

RECENT CONVERSATION INSIGHTS:
${context.conversationMemory.recentConversationInsights.length > 0
  ? context.conversationMemory.recentConversationInsights.map(i => `- ${i}`).join('\n')
  : 'No recent conversations'}

SOCIAL CONTEXT:
Friends are watching: ${context.socialContext.friendsWatching.join(', ')}

AVAILABLE CONTENT DATABASE:
Here are ${candidates.length} carefully selected titles:
${candidates.map(c =>
  `[${c.tmdb_id}] "${c.title}" - Genres: ${c.genres.map(g => GENRE_NAMES[parseInt(g)] || g).join(', ')} - Rating: ${c.rating}/10 - ${c.overview}`
).join('\n')}

INSTRUCTIONS:
1. Use the user's initial conversation insights as your PRIMARY guidance
2. Pay close attention to mood preferences and dislikes
3. Consider their rating patterns - they have high/low standards based on genre
4. Reference their watchlist notes to understand intent
5. Use recent conversation insights to adapt recommendations
6. Provide mix: 50% match their stated preferences, 30% similar-but-new, 20% pleasant surprises
7. Absolutely avoid content matching their dislikes
8. Each recommendation must have a personalized reason referencing their specific preferences

OUTPUT FORMAT:
Return valid JSON only:
{
  "recommendations": [
    {
      "tmdb_id": "12345",
      "title": "Movie Title",
      "confidence_score": 0.95,
      "reason": "Based on your love of Christopher Nolan's mind-bending narratives and high ratings for sci-fi (avg 9.2/10), this perfectly matches your taste for thought-provoking cinema."
    }
  ]
}

Generate exactly 20 recommendations. Focus on quality over variety.`;
}
```

---

### Phase 6: Auto-Refresh Triggers (1 hour)

**Step 6.1: Add Refresh Triggers**

Location: Various controllers and services

**Trigger 1: After Rating**
```typescript
// In ratings controller after successful rating
await recommendationService.queueRecommendationRefresh(userId, 'rating_added');
```

**Trigger 2: After Watchlist Update**
```typescript
// In watchlist controller after adding items
await recommendationService.queueRecommendationRefresh(userId, 'watchlist_updated');
```

**Trigger 3: After Conversation**
```typescript
// In chat service after meaningful conversation
if (conversationHasPreferenceUpdates) {
  await conversationSummaryService.updateUserConversationSummary(userId);
  await recommendationService.queueRecommendationRefresh(userId, 'conversation_updated');
}
```

**Step 6.2: Implement Smart Refresh Queue**

File: `apps/api/src/services/recommendation/refresh-queue.service.ts`

```typescript
async queueRecommendationRefresh(userId: string, reason: RefreshReason): Promise<void> {
  // 1. Check if refresh is needed (avoid spam)
  // 2. If last refresh < 5 minutes ago, skip
  // 3. Otherwise, queue refresh (async)
  // 4. Debounce multiple triggers
}

async processRefreshQueue(): Promise<void> {
  // Background worker
  // Process queued refreshes
  // Rate limit to avoid overwhelming LLM
}
```

---

### Phase 7: Testing & Validation (1 hour)

**Test Cases:**

1. **Onboarding Conversation Capture**
   - Create new user
   - Complete onboarding with specific preferences
   - Verify conversation summary is created
   - Verify summary is used in recommendations

2. **Rating Pattern Analysis**
   - Add 20+ ratings across different genres
   - Verify rating patterns are calculated
   - Verify genre averages are accurate
   - Verify recommendations reflect rating preferences

3. **Mood & Dislikes**
   - User says "I hate horror movies"
   - Verify horror movies are excluded
   - User says "I love uplifting films"
   - Verify recommendations include uplifting content

4. **Cross-Session Memory**
   - Login, have conversation
   - Logout, login again
   - Verify conversation context persists
   - Verify recommendations reflect past conversations

5. **Auto-Refresh**
   - Add new rating
   - Verify recommendations refresh
   - Check recommendations include similar content

---

## File Structure

```
apps/api/src/
├── services/
│   ├── conversation/
│   │   └── conversation-summary.service.ts (NEW)
│   ├── analysis/
│   │   └── rating-analysis.service.ts (NEW)
│   ├── recommendation/
│   │   ├── user-context.service.ts (NEW)
│   │   ├── refresh-queue.service.ts (NEW)
│   │   └── llm-recommendation.service.ts (MODIFIED)
│   ├── chat/
│   │   └── chat.service.ts (MODIFIED)
│   └── preferences/
│       └── preferences.service.ts (MODIFIED)

packages/
├── database/
│   ├── migrations/
│   │   └── 0002_add_conversation_summary_and_rating_patterns.sql (NEW)
│   └── src/
│       └── schema/index.ts (MODIFIED)
└── shared/
    └── src/
        └── types/
            ├── conversation.ts (NEW)
            └── preferences.ts (MODIFIED)
```

---

## Success Metrics

After implementation, we should see:

1. ✅ Recommendations include references to user's initial conversation
2. ✅ Mood preferences and dislikes are respected
3. ✅ Rating patterns influence recommendations
4. ✅ Recommendations auto-refresh after user actions
5. ✅ Conversation context persists across sessions
6. ✅ More personalized recommendation reasons

---

## Timeline Estimate

- Phase 1 (Database): 30 minutes
- Phase 2 (Conversation Summary): 1.5 hours
- Phase 3 (Rating Analysis): 1 hour
- Phase 4 (User Context): 2 hours
- Phase 5 (Enhanced Prompt): 1.5 hours
- Phase 6 (Auto-Refresh): 1 hour
- Phase 7 (Testing): 1 hour

**Total: ~8.5 hours (1 full day)**

---

## Next Steps

1. Review and approve this plan
2. Start with Phase 1 (Database schema)
3. Implement services incrementally
4. Test each phase before moving to next
5. Deploy to production
6. Monitor and iterate

---

## Notes

- This design ensures the initial onboarding conversation is ALWAYS included in recommendation context
- Conversation memory accumulates over time, making recommendations smarter
- Rating patterns provide objective data to complement stated preferences
- Auto-refresh ensures recommendations stay current
- All changes are backward compatible
