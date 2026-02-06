import React from 'react';
import type { ContentCard as ContentCardType } from '@watchagent/shared';

export interface ContentCardProps {
  content: ContentCardType;
  onSelect?: (content: ContentCardType) => void;
  showRating?: boolean;
  recommendationReason?: string;
  showActions?: boolean;
  onWatchlist?: (content: ContentCardType) => void;
  onLove?: (content: ContentCardType) => void;
  onHate?: (content: ContentCardType) => void;
}

export const ContentCard: React.FC<ContentCardProps> = ({
  content,
  onSelect,
  showRating = true,
  recommendationReason,
  showActions = false,
  onWatchlist,
  onLove,
  onHate,
}) => {
  const imageUrl = content.posterPath
    ? `https://image.tmdb.org/t/p/w500${content.posterPath}`
    : '/placeholder-poster.png';

  const releaseYear = content.releaseDate
    ? new Date(content.releaseDate).getFullYear()
    : 'TBA';

  return (
    <div
      className="group cursor-pointer transition-transform hover:scale-105"
      onClick={() => onSelect?.(content)}
    >
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-background-card">
        <img
          src={imageUrl}
          alt={content.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {content.inWatchlist && (
          <div className="absolute top-2 right-2 bg-primary text-white px-2 py-1 rounded text-xs font-semibold">
            In Watchlist
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute bottom-0 left-0 right-0 p-4">
            {showRating && content.tmdbRating && (
              <div className="flex items-center gap-1 text-yellow-400 mb-2">
                <svg
                  className="w-4 h-4 fill-current"
                  viewBox="0 0 20 20"
                >
                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                </svg>
                <span className="text-sm font-medium">
                  {Number(content.tmdbRating).toFixed(1)}
                </span>
              </div>
            )}
            {recommendationReason && (
              <p className="text-xs text-gray-300 line-clamp-2">
                {recommendationReason}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="mt-2">
        <h3 className="text-sm font-medium text-text-primary line-clamp-1 group-hover:text-primary transition-colors">
          {content.title}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-text-secondary">{releaseYear}</span>
          {content.genres && content.genres.length > 0 && (
            <>
              <span className="text-xs text-text-secondary">•</span>
              <span className="text-xs text-text-secondary capitalize">
                {content.genres[0].name}
              </span>
            </>
          )}
        </div>

        {/* Action buttons */}
        {showActions && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onWatchlist?.(content);
              }}
              className="flex-1 px-3 py-1.5 bg-primary text-white text-xs rounded-md hover:bg-red-600 transition-colors"
              title="Add to watchlist"
            >
              Watch
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLove?.(content);
              }}
              className="flex-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors"
              title="Love it"
            >
              ❤️ Love
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onHate?.(content);
              }}
              className="flex-1 px-3 py-1.5 bg-gray-700 text-white text-xs rounded-md hover:bg-gray-800 transition-colors"
              title="Not interested"
            >
              👎 Pass
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
