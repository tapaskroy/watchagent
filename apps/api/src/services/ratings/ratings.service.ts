import { db } from '@watchagent/database';
import { ratings, content, users } from '@watchagent/database';
import { eq, and, desc, asc, gte, lte } from 'drizzle-orm';
import {
  Rating,
  CreateRatingRequest,
  UpdateRatingRequest,
  GetRatingsRequest,
  ApiErrorCode,
  HttpStatus,
} from '@watchagent/shared';
import { AppError } from '../../middleware/error-handler';
import { CacheService, cacheKeys } from '../../config/redis';

export class RatingsService {
  /**
   * Get ratings with filters
   */
  async getRatings(
    filters: GetRatingsRequest
  ): Promise<{ items: Rating[]; total: number }> {
    // Build where conditions
    const conditions: any[] = [];

    if (filters.userId) {
      conditions.push(eq(ratings.userId, filters.userId));
    }
    if (filters.contentId) {
      conditions.push(eq(ratings.contentId, filters.contentId));
    }
    if (filters.minRating) {
      conditions.push(gte(ratings.rating, filters.minRating.toString()));
    }
    if (filters.maxRating) {
      conditions.push(lte(ratings.rating, filters.maxRating.toString()));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Build query
    const query = db.query.ratings.findMany({
      where: whereClause,
      with: {
        content: true,
        user: {
          columns: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
      limit: filters.limit || 20,
      offset: ((filters.page || 1) - 1) * (filters.limit || 20),
      orderBy:
        filters.sortBy === 'rating'
          ? filters.sortOrder === 'asc'
            ? [asc(ratings.rating)]
            : [desc(ratings.rating)]
          : filters.sortOrder === 'asc'
          ? [asc(ratings.createdAt)]
          : [desc(ratings.createdAt)],
    });

    const items = (await query) as Rating[];

    // Count total
    const countQuery = await db.query.ratings.findMany({
      where: whereClause,
    });

    return {
      items,
      total: countQuery.length,
    };
  }

  /**
   * Create or update a rating
   */
  async createRating(userId: string, data: CreateRatingRequest): Promise<Rating> {
    // Check if rating already exists
    const existing = await db.query.ratings.findFirst({
      where: and(eq(ratings.userId, userId), eq(ratings.contentId, data.contentId)),
    });

    if (existing) {
      throw new AppError(
        ApiErrorCode.ALREADY_EXISTS,
        'Rating already exists. Use PUT to update.',
        HttpStatus.CONFLICT
      );
    }

    // Create rating
    const [rating] = await db
      .insert(ratings)
      .values({
        userId,
        contentId: data.contentId,
        rating: data.rating.toString(),
        review: data.review,
        isPublic: data.isPublic !== undefined ? data.isPublic : true,
      })
      .returning();

    // Clear cache
    await CacheService.delPattern(`ratings:${userId}:*`);

    // Fetch with content and user details
    const ratingWithDetails = await db.query.ratings.findFirst({
      where: eq(ratings.id, rating.id),
      with: {
        content: true,
        user: {
          columns: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    return ratingWithDetails as Rating;
  }

  /**
   * Update a rating
   */
  async updateRating(
    userId: string,
    ratingId: string,
    data: UpdateRatingRequest
  ): Promise<Rating> {
    // Check if rating exists and belongs to user
    const existing = await db.query.ratings.findFirst({
      where: and(eq(ratings.id, ratingId), eq(ratings.userId, userId)),
    });

    if (!existing) {
      throw new AppError(ApiErrorCode.NOT_FOUND, 'Rating not found', HttpStatus.NOT_FOUND);
    }

    // Update rating
    const updateData: any = { updatedAt: new Date() };
    if (data.rating !== undefined) updateData.rating = data.rating.toString();
    if (data.review !== undefined) updateData.review = data.review;
    if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;

    await db.update(ratings).set(updateData).where(eq(ratings.id, ratingId));

    // Clear cache
    await CacheService.delPattern(`ratings:${userId}:*`);

    // Fetch updated rating with details
    const updated = await db.query.ratings.findFirst({
      where: eq(ratings.id, ratingId),
      with: {
        content: true,
        user: {
          columns: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    return updated as Rating;
  }

  /**
   * Delete a rating
   */
  async deleteRating(userId: string, ratingId: string): Promise<void> {
    // Check if rating exists and belongs to user
    const existing = await db.query.ratings.findFirst({
      where: and(eq(ratings.id, ratingId), eq(ratings.userId, userId)),
    });

    if (!existing) {
      throw new AppError(ApiErrorCode.NOT_FOUND, 'Rating not found', HttpStatus.NOT_FOUND);
    }

    // Delete rating
    await db.delete(ratings).where(eq(ratings.id, ratingId));

    // Clear cache
    await CacheService.delPattern(`ratings:${userId}:*`);
  }

  /**
   * Get user's rating for specific content
   */
  async getUserRating(userId: string, contentId: string): Promise<Rating | null> {
    const rating = await db.query.ratings.findFirst({
      where: and(eq(ratings.userId, userId), eq(ratings.contentId, contentId)),
      with: {
        content: true,
        user: {
          columns: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    return rating as Rating | null;
  }
}
