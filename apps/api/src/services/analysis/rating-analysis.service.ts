import { db } from '@watchagent/database';
import { ratings, userPreferences } from '@watchagent/database';
import { eq } from 'drizzle-orm';
import { RatingPatterns } from '@watchagent/shared';
import { logError, logInfo } from '../../config/logger';

export class RatingAnalysisService {
  /**
   * Analyze user's rating patterns and update database
   */
  async analyzeAndUpdateRatingPatterns(userId: string): Promise<RatingPatterns | null> {
    try {
      const patterns = await this.analyzeRatingPatterns(userId);

      if (!patterns) {
        return null;
      }

      // Update user preferences with rating patterns
      await db
        .update(userPreferences)
        .set({
          ratingPatterns: patterns as any,
          updatedAt: new Date(),
        })
        .where(eq(userPreferences.userId, userId));

      logInfo('Rating patterns updated', { userId, totalRatings: patterns.totalRatings });

      return patterns;
    } catch (error) {
      logError(error as Error, { userId, service: 'RatingAnalysisService.analyzeAndUpdateRatingPatterns' });
      return null;
    }
  }

  /**
   * Analyze user's rating patterns
   */
  async analyzeRatingPatterns(userId: string): Promise<RatingPatterns | null> {
    try {
      // Get all user ratings with content details
      const userRatings = await db.query.ratings.findMany({
        where: eq(ratings.userId, userId),
        with: {
          content: true,
        },
      });

      if (userRatings.length === 0) {
        return null;
      }

      // Calculate genre averages
      const genreAverages = this.calculateGenreAverages(userRatings);

      // Calculate rating distribution
      const ratingDistribution = this.calculateRatingDistribution(userRatings);

      // Calculate favorite actors/directors average ratings
      const favoriteActorsAvgRating = this.calculateActorAverages(userRatings);

      // Calculate overall average
      const totalRating = userRatings.reduce((sum, r) => sum + parseFloat(r.rating), 0);
      const averageRating = totalRating / userRatings.length;

      // Identify quality threshold (what the user considers "good")
      const qualityThreshold = this.identifyQualityThreshold(userRatings, averageRating);

      return {
        genreAverages,
        ratingDistribution,
        favoriteActorsAvgRating,
        averageRating: Math.round(averageRating * 10) / 10,
        qualityThreshold,
        totalRatings: userRatings.length,
        analyzedAt: new Date().toISOString(),
      };
    } catch (error) {
      logError(error as Error, { userId, service: 'RatingAnalysisService.analyzeRatingPatterns' });
      return null;
    }
  }

  /**
   * Calculate average rating per genre
   */
  private calculateGenreAverages(userRatings: any[]): Record<number, number> {
    const genreData: Record<number, { total: number; count: number }> = {};

    for (const rating of userRatings) {
      const ratingValue = parseFloat(rating.rating);
      const genres = rating.content.genres as any[];

      if (!genres || genres.length === 0) continue;

      for (const genre of genres) {
        const genreId = typeof genre === 'object' ? genre.id : genre;

        if (!genreData[genreId]) {
          genreData[genreId] = { total: 0, count: 0 };
        }

        genreData[genreId].total += ratingValue;
        genreData[genreId].count += 1;
      }
    }

    // Calculate averages
    const averages: Record<number, number> = {};
    for (const [genreId, data] of Object.entries(genreData)) {
      averages[parseInt(genreId)] = Math.round((data.total / data.count) * 10) / 10;
    }

    return averages;
  }

  /**
   * Calculate rating distribution
   */
  private calculateRatingDistribution(userRatings: any[]): Record<string, number> {
    const distribution: Record<string, number> = {
      '9-10': 0,
      '7-8': 0,
      '5-6': 0,
      '3-4': 0,
      '0-2': 0,
    };

    for (const rating of userRatings) {
      const ratingValue = parseFloat(rating.rating);

      if (ratingValue >= 9) {
        distribution['9-10']++;
      } else if (ratingValue >= 7) {
        distribution['7-8']++;
      } else if (ratingValue >= 5) {
        distribution['5-6']++;
      } else if (ratingValue >= 3) {
        distribution['3-4']++;
      } else {
        distribution['0-2']++;
      }
    }

    return distribution;
  }

  /**
   * Calculate average ratings for actors/directors
   */
  private calculateActorAverages(userRatings: any[]): Record<string, number> {
    const actorData: Record<string, { total: number; count: number }> = {};

    for (const rating of userRatings) {
      const ratingValue = parseFloat(rating.rating);
      const cast = rating.content.cast as any[];

      if (!cast || cast.length === 0) continue;

      // Consider top 5 cast members
      for (const member of cast.slice(0, 5)) {
        const name = typeof member === 'object' ? member.name : member;

        if (!name) continue;

        if (!actorData[name]) {
          actorData[name] = { total: 0, count: 0 };
        }

        actorData[name].total += ratingValue;
        actorData[name].count += 1;
      }
    }

    // Calculate averages and filter to actors with at least 2 ratings
    const averages: Record<string, number> = {};
    for (const [actor, data] of Object.entries(actorData)) {
      if (data.count >= 2) {
        averages[actor] = Math.round((data.total / data.count) * 10) / 10;
      }
    }

    return averages;
  }

  /**
   * Identify user's quality threshold
   */
  private identifyQualityThreshold(userRatings: any[], averageRating: number): number {
    // Find the rating value that represents "good" for this user
    // Use median of ratings >= average as the threshold

    const ratingsAboveAverage = userRatings
      .map(r => parseFloat(r.rating))
      .filter(r => r >= averageRating)
      .sort((a, b) => a - b);

    if (ratingsAboveAverage.length === 0) {
      return averageRating;
    }

    // Get median
    const midIndex = Math.floor(ratingsAboveAverage.length / 2);
    const threshold =
      ratingsAboveAverage.length % 2 === 0
        ? (ratingsAboveAverage[midIndex - 1] + ratingsAboveAverage[midIndex]) / 2
        : ratingsAboveAverage[midIndex];

    return Math.round(threshold * 10) / 10;
  }

  /**
   * Check if rating patterns need refresh
   */
  async shouldRefreshPatterns(userId: string): Promise<boolean> {
    try {
      const prefs = await db.query.userPreferences.findFirst({
        where: eq(userPreferences.userId, userId),
      });

      if (!prefs || !prefs.ratingPatterns) {
        return true;
      }

      const patterns = prefs.ratingPatterns as any;
      if (!patterns.analyzedAt) {
        return true;
      }

      // Get current rating count
      const currentRatings = await db.query.ratings.findMany({
        where: eq(ratings.userId, userId),
      });

      // Refresh if 10+ new ratings since last analysis
      const ratingsSinceAnalysis = currentRatings.length - (patterns.totalRatings || 0);
      return ratingsSinceAnalysis >= 10;
    } catch (error) {
      logError(error as Error, { userId, service: 'RatingAnalysisService.shouldRefreshPatterns' });
      return false;
    }
  }
}
