# Feedback System Implementation

## Summary

Successfully implemented a comprehensive feedback system for recommendations with three distinct behaviors:

1. **Immediate UI Removal** - Content marked "not relevant" or "add to watchlist" disappears instantly
2. **Immediate Learned Insights** - ANY rating (1-5 stars) triggers instant AI learning update
3. **Batched Preferences** - Actions batched over 5 min inactivity, then updated using Claude Haiku

---

## What's New

### UI Components

**ContentCardWithFeedback** - New feedback-enabled content card component
- **X button (Remove):**
  - "Not Relevant" - Marks content as not interested
  - "Already Watched It" - Prompts for 1-5 star rating
- **✓ button (Keep/Action):**
  - "Keep in Recommendations" - Marks as interesting
  - "Add to Watchlist" - Adds to watchlist and removes from recommendations

### Backend Services

1. **Session Tracker Service** (`apps/api/src/services/feedback/session-tracker.service.ts`)
   - Tracks user feedback actions across a session
   - 5-minute inactivity timeout
   - EventEmitter pattern for loose coupling

2. **Batch Preferences Service** (`apps/api/src/services/feedback/batch-preferences.service.ts`)
   - Processes batched actions using Claude Haiku
   - Updates viewing preferences after session timeout
   - Cost-optimized with cheaper model

3. **Feedback Service** (`apps/api/src/modules/recommendations/feedback.service.ts`)
   - Handles immediate actions (ratings, watchlist, exclusions)
   - Updates learned insights immediately for ANY rating
   - Coordinates with session tracker for batch processing

4. **Feedback Controller** (`apps/api/src/modules/recommendations/feedback.controller.ts`)
   - REST API endpoint for submitting feedback
   - Validates and processes feedback data

### Backend Updates

- **LLM Recommendation Service** - Now filters excluded content from recommendations
- **Recommendations Routes** - Added POST `/api/v1/recommendations/feedback` endpoint

### Frontend Updates

1. **Home Page** (`apps/web/src/app/(main)/page.tsx`)
   - Top 4 recommendations now use ContentCardWithFeedback
   - Feedback handlers integrated

2. **Recommendations Page** (`apps/web/src/app/(main)/recommendations/page.tsx`)
   - All 20 recommendations displayed in grid with feedback buttons
   - Feedback handlers integrated

3. **API Client** (`packages/api-client`)
   - New `submitFeedback()` method
   - Returns `shouldRemoveFromUI` flag

---

## How It Works

### User Flow

**Scenario 1: User marks content as "Not Relevant"**
1. User clicks X button → "Not Relevant"
2. Item disappears from screen immediately
3. Backend adds content ID to excluded list
4. Backend tracks action for batch processing
5. After 5 min inactivity: Claude Haiku updates preferences

**Scenario 2: User rates content 3 stars**
1. User clicks X → "Already Watched It" → Rates 3 stars
2. Backend saves rating to database
3. Claude Sonnet updates learned insights immediately
4. Backend tracks action for batch processing
5. After 5 min inactivity: Claude Haiku updates preferences

**Scenario 3: User adds to watchlist**
1. User clicks ✓ → "Add to Watchlist"
2. Item disappears from screen immediately
3. Backend adds to watchlist table
4. Backend adds content ID to excluded list
5. Backend tracks action for batch processing
6. After 5 min inactivity: Claude Haiku updates preferences

### Architecture

```
User Action
    ↓
Frontend (ContentCardWithFeedback)
    ↓
API Client (submitFeedback)
    ↓
Feedback Controller
    ↓
Feedback Service
    ↓
┌─────────────────────────────────────────┐
│                                         │
│  Immediate Actions:                     │
│  • Save rating to DB                    │
│  • Add to watchlist                     │
│  • Add to excluded content              │
│  • Update learned insights (Sonnet)     │
│                                         │
│  Batched Actions:                       │
│  • Track in SessionTracker              │
│  • After 5 min → BatchPreferences       │
│  • Update viewing preferences (Haiku)   │
│                                         │
└─────────────────────────────────────────┘
    ↓
Return to Frontend
    ↓
Remove from UI if shouldRemoveFromUI = true
```

---

## Database Changes

**No schema migrations needed!**

Uses existing fields:
- `users.viewingPreferencesText` - Updated by batch process
- `conversations.context.learnedInsights` - Updated immediately on rating
- `userPreferences.learnedPreferences.excludedContent[]` - Stores excluded content IDs
- `ratings` table - Stores user ratings
- `watchlistItems` table - Stores watchlist additions

---

## API Endpoint

### POST `/api/v1/recommendations/feedback`

**Request Body:**
```json
{
  "contentId": "uuid",
  "contentTitle": "Movie Title",
  "action": "not_relevant" | "keep" | "watchlist" | "watched",
  "rating": 1-5 (optional)
}
```

**Response:**
```json
{
  "success": true,
  "preferencesUpdated": true,
  "learnedInsightsUpdated": true,
  "shouldRemoveFromUI": true
}
```

---

## Testing Instructions

### 1. Test Immediate UI Removal

```
1. Go to http://localhost:3001 and login
2. Open DevTools Console (F12 → Console tab)
3. Navigate to recommendations page
4. Hover over a recommendation card
5. Click X → "Not Relevant"
6. Expected: Card disappears immediately
7. Console: "✓ Removed from UI - refetching recommendations"
```

### 2. Test Immediate Insights (Any Rating)

```
1. Hover over a card
2. Click X → "Already Watched It"
3. Rate it 3 stars → Submit
4. Console: "✓ Learned insights updated immediately"
5. Database:
   SELECT context->'learnedInsights' FROM conversations
   WHERE user_id = 'your-user-id' AND is_onboarding = false;
```

### 3. Test Batch Preferences

```
1. Provide 3-5 different feedback actions
2. Wait 5 minutes (or check API logs)
3. API logs should show:
   [SessionTracker] Action tracked for user...
   [SessionTracker] Processing session for user...
   [BatchPreferences] Updating preferences for user...
```

### 4. Test Exclusion Persists

```
1. Mark a movie as "Not Relevant"
2. Click "Refresh Recommendations"
3. Expected: That movie does NOT reappear
```

---

## Cost Analysis

### Before (Per Action Updates):
- 1 Claude Sonnet call per feedback = ~$0.003 per action
- For 10 actions: 10 × $0.003 = **$0.03**

### After (Batched):
- Per rating: 1 Sonnet call (insights) = ~$0.003
- Per session: 1 Haiku call (batch preferences) = ~$0.0005
- For 10 actions (3 ratings, 7 others):
  - 3 × $0.003 = $0.009
  - 1 × $0.0005 = $0.0005
  - Total: **$0.0095**

**Savings: ~68% cost reduction!**

---

## Files Created

### Backend
- ✅ `apps/api/src/services/feedback/session-tracker.service.ts`
- ✅ `apps/api/src/services/feedback/batch-preferences.service.ts`
- ✅ `apps/api/src/modules/recommendations/feedback.service.ts`
- ✅ `apps/api/src/modules/recommendations/feedback.controller.ts`

### Frontend
- ✅ `packages/ui/src/components/cards/ContentCardWithFeedback.tsx`

### Modified Files
- ✅ `packages/ui/src/index.ts` - Export new component
- ✅ `apps/api/src/modules/recommendations/recommendations.routes.ts` - Add feedback endpoint
- ✅ `apps/api/src/services/recommendation/llm-recommendation.service.ts` - Filter excluded content
- ✅ `packages/api-client/src/config.ts` - Add feedback endpoint
- ✅ `packages/api-client/src/endpoints/recommendations.ts` - Add submitFeedback method
- ✅ `apps/web/src/app/(main)/page.tsx` - Use ContentCardWithFeedback
- ✅ `apps/web/src/app/(main)/recommendations/page.tsx` - Use ContentCardWithFeedback

---

## Deployment Status

✅ **Deployed Locally**
- API Server: http://localhost:3000
- Web Server: http://localhost:3001
- All changes are active and ready for testing

---

## Next Steps

Test the system by:
1. Opening http://localhost:3001
2. Navigating to recommendations
3. Trying different feedback actions
4. Checking console logs
5. Verifying database updates

Report any issues you encounter!
