import { db } from '@watchagent/database';
import { watchlistItems, content } from '@watchagent/database';
import { eq, and, desc, asc } from 'drizzle-orm';
import {
  WatchlistItem,
  AddToWatchlistRequest,
  UpdateWatchlistRequest,
  GetWatchlistRequest,
  ApiErrorCode,
  HttpStatus,
  WatchlistStatus,
} from '@watchagent/shared';
import { AppError } from '../../middleware/error-handler';
import { CacheService, cacheKeys } from '../../config/redis';

export class WatchlistService {
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

    // Apply sorting
    const sortOrder = filters.sortOrder === 'asc' ? asc : desc;
    const sortField =
      filters.sortBy === 'priority'
        ? watchlistItems.priority
        : filters.sortBy === 'title'
        ? watchlistItems.addedAt // We'll sort by title in memory
        : watchlistItems.addedAt;

    const items = (await query) as WatchlistItem[];

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

    return itemWithContent as WatchlistItem;
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

    return updated as WatchlistItem;
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
}
