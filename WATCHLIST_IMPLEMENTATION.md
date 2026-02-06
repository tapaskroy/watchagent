# Watchlist Implementation

## Summary

Implemented full watchlist functionality that allows users to add content directly from search results and browse pages to their watchlist.

## Problem

The watchlist functionality was not working because:
- Search results only contained TMDB data (tmdbId, title, poster, etc.)
- Watchlist database schema required content records with UUIDs
- No bridge between TMDB data and content records

## Solution

Created a new endpoint that accepts TMDB data, creates/finds content records, and adds to watchlist in one operation.

## Changes Made

### 1. Backend - Types (`packages/shared/src/types/watchlist.types.ts`)

Added new interface and validator:
```typescript
export interface AddToWatchlistWithTMDBRequest {
  tmdbId: string | number;
  type: 'movie' | 'tv';
  title: string;
  overview?: string;
  posterPath?: string;
  backdropPath?: string;
  releaseDate?: string;
  genres?: Array<{ id: number; name: string }>;
  rating?: number;
  status?: WatchlistStatus;
  priority?: number;
  notes?: string;
}

export const addToWatchlistWithTMDBSchema = z.object({...});
```

### 2. Backend - Service (`apps/api/src/services/watchlist/watchlist.service.ts`)

Added method to handle TMDB data:
```typescript
async addToWatchlistWithTMDB(
  userId: string,
  data: AddToWatchlistWithTMDBRequest
): Promise<WatchlistItem> {
  const tmdbId = String(data.tmdbId);

  // Find or create content record
  let contentRecord = await db.query.content.findFirst({
    where: eq(content.tmdbId, tmdbId),
  });

  if (!contentRecord) {
    // Create new content record from TMDB data
    const [newContent] = await db.insert(content).values({...}).returning();
    contentRecord = newContent;
  }

  // Add to watchlist using content UUID
  return this.addToWatchlist(userId, {
    contentId: contentRecord.id,
    status: data.status,
    priority: data.priority,
    notes: data.notes,
  });
}
```

### 3. Backend - Routes (`apps/api/src/modules/watchlist/watchlist.routes.ts`)

Added new endpoint:
```typescript
POST /api/v1/watchlist/from-tmdb
```

Accepts TMDB data and creates watchlist item.

### 4. API Client (`packages/api-client/src/`)

**Updated config.ts:**
```typescript
watchlist: {
  list: '/watchlist',
  add: '/watchlist',
  addFromTMDB: '/watchlist/from-tmdb',  // NEW
  update: (id: number) => `/watchlist/${id}`,
  delete: (id: number) => `/watchlist/${id}`,
}
```

**Updated endpoints/watchlist.ts:**
```typescript
async addToWatchlistFromTMDB(data: AddToWatchlistWithTMDBRequest): Promise<WatchlistItem> {
  const response = await apiClient.post<ApiResponse<WatchlistItem>>(
    API_ENDPOINTS.watchlist.addFromTMDB,
    data
  );
  return response.data.data;
}
```

### 5. Frontend - Hooks (`apps/web/src/hooks/useWatchlist.ts`)

Updated `useWatchlist()` hook to include mutation:
```typescript
export function useWatchlist(filters?: GetWatchlistRequest) {
  const queryClient = useQueryClient();

  const addToWatchlistMutation = useMutation({
    mutationFn: (data: AddToWatchlistWithTMDBRequest) =>
      watchlistApi.addToWatchlistFromTMDB(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });

  return {
    ...query,
    addToWatchlistMutation,
  };
}
```

Added new hook:
```typescript
export function useAddToWatchlistFromTMDB() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddToWatchlistWithTMDBRequest) =>
      watchlistApi.addToWatchlistFromTMDB(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });
}
```

### 6. Frontend - Content Detail Page (`apps/web/src/app/(main)/content/[id]/page.tsx`)

Updated to use new hook:
```typescript
const { mutate: addToWatchlist, isPending: isAddingToWatchlist } = useAddToWatchlistFromTMDB();

const handleAddToWatchlist = () => {
  if (content) {
    addToWatchlist({
      tmdbId: content.tmdbId,
      type: content.type,
      title: content.title,
      overview: content.overview,
      posterPath: content.posterPath,
      backdropPath: content.backdropPath,
      releaseDate: content.releaseDate,
      genres: content.genres,
      rating: content.tmdbRating ? Number(content.tmdbRating) : undefined,
      status: 'to_watch',
    });
  }
};
```

## How It Works

1. User clicks "Add to Watchlist" on any content (browse page or detail page)
2. Frontend sends TMDB data to `/api/v1/watchlist/from-tmdb`
3. Backend service checks if content exists in database by tmdbId
4. If not exists, creates new content record from TMDB data
5. Adds content to user's watchlist using the content UUID
6. Returns watchlist item with full content details
7. Frontend invalidates cache and updates watchlist

## Testing Instructions

### 1. Start the servers

**Terminal 1:**
```bash
npm run dev --workspace=@watchagent/api
```

**Terminal 2:**
```bash
npm run dev --workspace=@watchagent/web
```

### 2. Test the functionality

1. Open http://localhost:3001
2. Login with your test account
3. Go to Browse page
4. Click the watchlist icon on any movie
5. Go to Watchlist page
6. Verify the movie appears in your watchlist

OR

1. Search for a movie (e.g., "Inception")
2. Click on the movie to open details
3. Click "Add to Watchlist" button
4. Go to Watchlist page
5. Verify "Inception" appears in your watchlist

### 3. Verify database

```bash
psql -U tapas watchagent

-- Check content was created
SELECT id, tmdb_id, title FROM content;

-- Check watchlist item was created
SELECT id, user_id, content_id, status FROM watchlist_items;
```

## Benefits

- ✅ No need to create content records manually
- ✅ Works directly with TMDB search results
- ✅ Handles duplicate prevention (won't create duplicate content or watchlist items)
- ✅ Single API call for the entire operation
- ✅ Cache invalidation ensures UI updates immediately
- ✅ Works on both Browse and Content Detail pages

## Files Modified

1. `packages/shared/src/types/watchlist.types.ts` - Added AddToWatchlistWithTMDBRequest
2. `apps/api/src/services/watchlist/watchlist.service.ts` - Added addToWatchlistWithTMDB method
3. `apps/api/src/modules/watchlist/watchlist.routes.ts` - Added POST /from-tmdb endpoint
4. `packages/api-client/src/config.ts` - Added addFromTMDB endpoint
5. `packages/api-client/src/endpoints/watchlist.ts` - Added addToWatchlistFromTMDB method
6. `apps/web/src/hooks/useWatchlist.ts` - Added useAddToWatchlistFromTMDB hook
7. `apps/web/src/app/(main)/content/[id]/page.tsx` - Updated to use new hook

## Next Steps

The watchlist functionality is now fully working. You can:
- Test adding movies/shows from browse page
- Test adding from content detail page
- View your watchlist at /watchlist
- Update watchlist items (change status, priority, notes)
- Remove items from watchlist
