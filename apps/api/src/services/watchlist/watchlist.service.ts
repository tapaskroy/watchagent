import { db } from '@watchagent/database';
import { watchlistItems, content } from '@watchagent/database';
import { eq, and } from 'drizzle-orm';
import {
  WatchlistItem,
  AddToWatchlistRequest,
  AddToWatchlistWithTMDBRequest,
  UpdateWatchlistRequest,
  GetWatchlistRequest,
  ApiErrorCode,
  HttpStatus,
  ContentCard,
} from '@watchagent/shared';
import { AppError } from '../../middleware/error-handler';
import { CacheService, cacheKeys } from '../../config/redis';

// Helper function to transform database content to ContentCard
function transformToContentCard(dbContent: any, inWatchlist: boolean = true): ContentCard {
  return {
    id: dbContent.id,
    tmdbId: dbContent.tmdbId,
    type: dbContent.type,
    title: dbContent.title,
    releaseDate: dbContent.releaseDate || undefined,
    posterPath: dbContent.posterPath || undefined,
    tmdbRating: dbContent.tmdbRating ? Number(dbContent.tmdbRating) : undefined,
    genres: Array.isArray(dbContent.genres) ? dbContent.genres : [],
    userRating: undefined,
    inWatchlist,
  };
}

export class WatchlistService {
  /**
   * Add item to watchlist using TMDB data
   * Finds or creates content record first, then adds to watchlist
   */
  async addToWatchlistWithTMDB(
    userId: string,
    data: AddToWatchlistWithTMDBRequest
  ): Promise<WatchlistItem> {
    try {
      console.log('[WatchlistService] Adding to watchlist with TMDB data:', {
        userId,
        tmdbId: data.tmdbId,
        title: data.title,
      });

      const tmdbId = String(data.tmdbId);

      // Find or create content record
      let contentRecord = await db.query.content.findFirst({
        where: eq(content.tmdbId, tmdbId),
      });

      if (!contentRecord) {
        console.log('[WatchlistService] Content not found, creating new record');
        // Create new content record from TMDB data
        const [newContent] = await db
          .insert(content)
          .values({
            tmdbId: tmdbId,
            type: data.type,
            title: data.title,
            overview: data.overview,
            posterPath: data.posterPath,
            backdropPath: data.backdropPath,
            releaseDate: data.releaseDate,
            genres: data.genres || [],
            tmdbRating: data.rating ? data.rating.toString() : undefined,
          })
          .returning();
        contentRecord = newContent;
        console.log('[WatchlistService] Created content record:', contentRecord.id);
      } else {
        console.log('[WatchlistService] Found existing content:', contentRecord.id);
      }

      // Add to watchlist using content UUID
      const result = await this.addToWatchlist(userId, {
        contentId: contentRecord.id,
        status: data.status,
        priority: data.priority,
        notes: data.notes,
      });

      console.log('[WatchlistService] Successfully added to watchlist');
      return result;
    } catch (error) {
      console.error('[WatchlistService] Error adding to watchlist:', error);
      throw error;
    }
  }
  /**
   * Get user's watchlist
   */
  async getUserWatchlist(
    userId: string,
    filters: GetWatchlistRequest
  ): Promise<{ items: WatchlistItem[]; total: number }> {
    // Build query
    let query = db.query.watchlistItems.findMany({
      where: filters.status
        ? and(eq(watchlistItems.userId, userId), eq(watchlistItems.status, filters.status))
        : eq(watchlistItems.userId, userId),
      with: {
        content: true,
      },
      limit: filters.limit || 20,
      offset: ((filters.page || 1) - 1) * (filters.limit || 20),
    });

    const dbItems = await query;

    // Transform database results to WatchlistItem with ContentCard
    const items: WatchlistItem[] = dbItems.map((item) => ({
      id: item.id,
      userId: item.userId,
      contentId: item.contentId,
      status: item.status,
      priority: item.priority || 0,
      notes: item.notes || undefined,
      addedAt: item.addedAt,
      updatedAt: item.updatedAt,
      watchedAt: item.watchedAt || undefined,
      content: transformToContentCard(item.content, true),
    }));

    // Count total
    const countQuery = await db.query.watchlistItems.findMany({
      where: filters.status
        ? and(eq(watchlistItems.userId, userId), eq(watchlistItems.status, filters.status))
        : eq(watchlistItems.userId, userId),
    });

    return {
      items,
      total: countQuery.length,
    };
  }

  /**
   * Add item to watchlist
   */
  async addToWatchlist(userId: string, data: AddToWatchlistRequest): Promise<WatchlistItem> {
    // Check if already in watchlist
    const existing = await db.query.watchlistItems.findFirst({
      where: and(
        eq(watchlistItems.userId, userId),
        eq(watchlistItems.contentId, data.contentId)
      ),
    });

    if (existing) {
      throw new AppError(
        ApiErrorCode.ALREADY_EXISTS,
        'Content already in watchlist',
        HttpStatus.CONFLICT
      );
    }

    // Add to watchlist
    const [item] = await db
      .insert(watchlistItems)
      .values({
        userId,
        contentId: data.contentId,
        status: data.status || 'to_watch',
        priority: data.priority || 0,
        notes: data.notes,
      })
      .returning();

    // Clear cache
    await CacheService.del(cacheKeys.watchlist(userId));

    // Fetch with content details
    const itemWithContent = await db.query.watchlistItems.findFirst({
      where: eq(watchlistItems.id, item.id),
      with: {
        content: true,
      },
    });

    if (!itemWithContent) {
      throw new AppError(
        ApiErrorCode.NOT_FOUND,
        'Watchlist item not found after creation',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    // Transform to WatchlistItem with ContentCard
    return {
      id: itemWithContent.id,
      userId: itemWithContent.userId,
      contentId: itemWithContent.contentId,
      status: itemWithContent.status,
      priority: itemWithContent.priority || 0,
      notes: itemWithContent.notes || undefined,
      addedAt: itemWithContent.addedAt,
      updatedAt: itemWithContent.updatedAt,
      watchedAt: itemWithContent.watchedAt || undefined,
      content: transformToContentCard(itemWithContent.content, true),
    };
  }

  /**
   * Update watchlist item
   */
  async updateWatchlistItem(
    userId: string,
    itemId: string,
    data: UpdateWatchlistRequest
  ): Promise<WatchlistItem> {
    // Check if item exists and belongs to user
    const existing = await db.query.watchlistItems.findFirst({
      where: and(eq(watchlistItems.id, itemId), eq(watchlistItems.userId, userId)),
    });

    if (!existing) {
      throw new AppError(
        ApiErrorCode.NOT_FOUND,
        'Watchlist item not found',
        HttpStatus.NOT_FOUND
      );
    }

    // Update item
    const updateData: any = {};
    if (data.status) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.watchedAt) updateData.watchedAt = data.watchedAt;
    updateData.updatedAt = new Date();

    await db.update(watchlistItems).set(updateData).where(eq(watchlistItems.id, itemId));

    // Clear cache
    await CacheService.del(cacheKeys.watchlist(userId));

    // Fetch updated item with content
    const updated = await db.query.watchlistItems.findFirst({
      where: eq(watchlistItems.id, itemId),
      with: {
        content: true,
      },
    });

    if (!updated) {
      throw new AppError(
        ApiErrorCode.NOT_FOUND,
        'Watchlist item not found after update',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    // Transform to WatchlistItem with ContentCard
    return {
      id: updated.id,
      userId: updated.userId,
      contentId: updated.contentId,
      status: updated.status,
      priority: updated.priority || 0,
      notes: updated.notes || undefined,
      addedAt: updated.addedAt,
      updatedAt: updated.updatedAt,
      watchedAt: updated.watchedAt || undefined,
      content: transformToContentCard(updated.content, true),
    };
  }

  /**
   * Remove item from watchlist
   */
  async removeFromWatchlist(userId: string, itemId: string): Promise<void> {
    // Check if item exists and belongs to user
    const existing = await db.query.watchlistItems.findFirst({
      where: and(eq(watchlistItems.id, itemId), eq(watchlistItems.userId, userId)),
    });

    if (!existing) {
      throw new AppError(
        ApiErrorCode.NOT_FOUND,
        'Watchlist item not found',
        HttpStatus.NOT_FOUND
      );
    }

    // Delete item
    await db.delete(watchlistItems).where(eq(watchlistItems.id, itemId));

    // Clear cache
    await CacheService.del(cacheKeys.watchlist(userId));
  }

  /**
   * Check if content is in user's watchlist
   */
  async isInWatchlist(userId: string, contentId: string): Promise<boolean> {
    const item = await db.query.watchlistItems.findFirst({
      where: and(eq(watchlistItems.userId, userId), eq(watchlistItems.contentId, contentId)),
    });

    return !!item;
  }

  /**
   * Check if content is in user's watchlist by TMDB ID
   */
  async isInWatchlistByTMDB(userId: string, tmdbId: string): Promise<{ inWatchlist: boolean; itemId?: string }> {
    // Find content by TMDB ID
    const contentRecord = await db.query.content.findFirst({
      where: eq(content.tmdbId, tmdbId),
    });

    if (!contentRecord) {
      return { inWatchlist: false };
    }

    // Check if in watchlist
    const item = await db.query.watchlistItems.findFirst({
      where: and(eq(watchlistItems.userId, userId), eq(watchlistItems.contentId, contentRecord.id)),
    });

    return {
      inWatchlist: !!item,
      itemId: item?.id,
    };
  }
}
