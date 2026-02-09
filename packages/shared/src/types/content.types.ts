import { z } from 'zod';

// Content types
export type ContentType = 'movie' | 'tv';

// Genre
export interface Genre {
  id: number;
  name: string;
}

// Cast member
export interface CastMember {
  id: number;
  name: string;
  character?: string;
  profilePath?: string;
  order?: number;
}

// Crew member
export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profilePath?: string;
}

// Production company
export interface ProductionCompany {
  id: number;
  name: string;
  logoPath?: string;
  originCountry?: string;
}

// Watch provider
export interface WatchProvider {
  providerId: number;
  providerName: string;
  logoPath: string;
  displayPriority: number;
}

// Watch providers data
export interface WatchProviders {
  link?: string;
  flatrate?: WatchProvider[];
  rent?: WatchProvider[];
  buy?: WatchProvider[];
}

// Content (movie or TV show)
export interface Content {
  id: string;
  tmdbId: string;
  imdbId?: string;
  type: ContentType;
  title: string;
  originalTitle?: string;
  overview?: string;
  releaseDate?: string;
  runtime?: number;
  genres: Genre[];
  posterPath?: string;
  backdropPath?: string;
  tmdbRating?: number;
  tmdbVoteCount?: number;
  imdbRating?: number;
  popularity?: number;
  language?: string;
  cast: CastMember[];
  crew: CrewMember[];
  productionCompanies: ProductionCompany[];
  keywords: string[];
  trailerUrl?: string;
  watchProviders?: WatchProviders;
  budget?: number;
  revenue?: number;
  status?: string;
  // TV-specific
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  episodeRuntime?: number[];
  createdAt: Date;
  updatedAt: Date;
}

// Simplified content card for lists
export interface ContentCard {
  id: string;
  tmdbId: string;
  type: ContentType;
  title: string;
  releaseDate?: string;
  posterPath?: string;
  tmdbRating?: number;
  genres: Genre[];
  userRating?: number;
  inWatchlist: boolean;
}

// Content search filters
export interface ContentSearchFilters {
  query?: string;
  type?: ContentType;
  genres?: number[];
  yearFrom?: number;
  yearTo?: number;
  ratingFrom?: number;
  ratingTo?: number;
  runtimeFrom?: number;
  runtimeTo?: number;
  language?: string;
  sortBy?: 'relevance' | 'popularity' | 'rating' | 'release_date' | 'title';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Content details request
export interface ContentDetailsRequest {
  tmdbId: string;
  type: ContentType;
}

// Trending content options
export interface TrendingContentRequest {
  type?: ContentType;
  timeWindow?: 'day' | 'week';
  page?: number;
  limit?: number;
}

// Popular content options
export interface PopularContentRequest {
  type?: ContentType;
  page?: number;
  limit?: number;
}

// Zod validators
export const contentSearchSchema = z.object({
  query: z.string().optional(),
  type: z.enum(['movie', 'tv']).optional(),
  genres: z.array(z.number()).optional(),
  yearFrom: z.number().min(1900).max(2100).optional(),
  yearTo: z.number().min(1900).max(2100).optional(),
  ratingFrom: z.number().min(0).max(10).optional(),
  ratingTo: z.number().min(0).max(10).optional(),
  runtimeFrom: z.number().min(0).optional(),
  runtimeTo: z.number().min(0).optional(),
  language: z.string().length(2).optional(),
  sortBy: z.enum(['relevance', 'popularity', 'rating', 'release_date', 'title']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.number().min(1).optional().default(1),
  limit: z.number().min(1).max(100).optional().default(20),
});

export const contentDetailsSchema = z.object({
  tmdbId: z.string().min(1),
  type: z.enum(['movie', 'tv']),
});
