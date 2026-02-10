import React, { useState } from 'react';
import type { ContentCard as ContentCardType } from '@watchagent/shared';

export interface ContentCardFeedbackProps {
  content: ContentCardType;
  onSelect?: (content: ContentCardType) => void;
  showRating?: boolean;
  recommendationReason?: string;
  onRemove?: (content: ContentCardType, reason: 'not_relevant' | 'watched', rating?: number) => void;
  onKeep?: (content: ContentCardType, action: 'keep' | 'watchlist') => void;
}

type FeedbackModal = 'remove' | 'keep' | null;

export const ContentCardWithFeedback: React.FC<ContentCardFeedbackProps> = ({
  content,
  onSelect,
  showRating = true,
  recommendationReason,
  onRemove,
  onKeep,
}) => {
  const [showModal, setShowModal] = useState<FeedbackModal>(null);
  const [showRatingInput, setShowRatingInput] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);

  const imageUrl = content.posterPath
    ? `https://image.tmdb.org/t/p/w500${content.posterPath}`
    : '/placeholder-poster.png';

  const releaseYear = content.releaseDate
    ? new Date(content.releaseDate).getFullYear()
    : 'TBA';

  const handleRemove = (reason: 'not_relevant' | 'watched') => {
    if (reason === 'watched') {
      setShowRatingInput(true);
    } else {
      onRemove?.(content, reason);
      setShowModal(null);
    }
  };

  const handleKeep = (action: 'keep' | 'watchlist') => {
    onKeep?.(content, action);
    setShowModal(null);
  };

  const handleRatingSubmit = () => {
    if (selectedRating > 0) {
      onRemove?.(content, 'watched', selectedRating);
      setShowModal(null);
      setShowRatingInput(false);
      setSelectedRating(0);
    }
  };

  const renderStarRating = () => (
    <div className="mt-4 pt-4 border-t border-gray-700">
      <p className="text-sm text-text-secondary mb-3">Rate this content (1-5 stars)</p>
      <div className="flex gap-2 justify-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setSelectedRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="transition-transform hover:scale-110"
          >
            <svg
              className={`w-8 h-8 ${
                star <= (hoveredRating || selectedRating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'fill-gray-600 text-gray-600'
              }`}
              viewBox="0 0 20 20"
            >
              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
            </svg>
          </button>
        ))}
      </div>
      {selectedRating > 0 && (
        <p className="text-center text-sm text-primary mt-2 font-medium">
          {selectedRating}/5
        </p>
      )}
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => {
            setShowRatingInput(false);
            setSelectedRating(0);
          }}
          className="flex-1 px-3 py-2 bg-gray-700 text-white text-sm rounded-md hover:bg-gray-600 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleRatingSubmit}
          disabled={selectedRating === 0}
          className="flex-1 px-3 py-2 bg-primary text-white text-sm rounded-md hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit
        </button>
      </div>
    </div>
  );

  const renderRemoveModal = () => (
    <div className="absolute top-0 left-0 right-0 bottom-0 bg-background-dark/95 backdrop-blur-sm rounded-lg p-4 z-20 flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <h4 className="text-sm font-semibold text-text-primary">Remove from recommendations</h4>
        <button
          onClick={() => {
            setShowModal(null);
            setShowRatingInput(false);
            setSelectedRating(0);
          }}
          className="text-text-secondary hover:text-text-primary"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {!showRatingInput ? (
        <div className="space-y-2 flex-1">
          <button
            onClick={() => handleRemove('not_relevant')}
            className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 text-text-primary text-sm rounded-md transition-colors text-left"
          >
            <div className="font-medium">Not Relevant</div>
            <div className="text-xs text-text-secondary mt-1">Not interested in this type of content</div>
          </button>
          <button
            onClick={() => handleRemove('watched')}
            className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 text-text-primary text-sm rounded-md transition-colors text-left"
          >
            <div className="font-medium">Already Watched It</div>
            <div className="text-xs text-text-secondary mt-1">I've seen this already</div>
          </button>
        </div>
      ) : (
        <div className="flex-1">
          {renderStarRating()}
        </div>
      )}
    </div>
  );

  const renderKeepModal = () => (
    <div className="absolute top-0 left-0 right-0 bottom-0 bg-background-dark/95 backdrop-blur-sm rounded-lg p-4 z-20 flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <h4 className="text-sm font-semibold text-text-primary">What would you like to do?</h4>
        <button
          onClick={() => {
            setShowModal(null);
          }}
          className="text-text-secondary hover:text-text-primary"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-2 flex-1">
        <button
          onClick={() => handleKeep('keep')}
          className="w-full px-4 py-3 bg-green-900/30 hover:bg-green-900/50 text-text-primary text-sm rounded-md transition-colors text-left border border-green-700"
        >
          <div className="font-medium">Keep in Recommendations</div>
          <div className="text-xs text-text-secondary mt-1">This looks interesting</div>
        </button>
        <button
          onClick={() => handleKeep('watchlist')}
          className="w-full px-4 py-3 bg-primary/20 hover:bg-primary/30 text-text-primary text-sm rounded-md transition-colors text-left border border-primary"
        >
          <div className="font-medium">Add to Watchlist</div>
          <div className="text-xs text-text-secondary mt-1">I want to watch this soon</div>
        </button>
      </div>
    </div>
  );

  return (
    <div className="group cursor-pointer transition-transform hover:scale-105 relative">
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-background-card">
        {/* Feedback action buttons - appear on hover */}
        <div className="absolute top-2 left-2 right-2 flex justify-between items-start z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowModal('remove');
            }}
            className="bg-red-600 hover:bg-red-700 text-white rounded-full p-2 shadow-lg transition-colors"
            title="Remove"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowModal('keep');
            }}
            className="bg-green-600 hover:bg-green-700 text-white rounded-full p-2 shadow-lg transition-colors"
            title="Keep/Action"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </div>

        <img
          src={imageUrl}
          alt={content.title}
          className="w-full h-full object-cover"
          loading="lazy"
          onClick={() => !showModal && onSelect?.(content)}
        />

        {content.inWatchlist && (
          <div className="absolute top-2 right-2 bg-primary text-white px-2 py-1 rounded text-xs font-semibold z-10">
            In Watchlist
          </div>
        )}

        {/* Hover overlay with info */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent ${
            showModal ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'
          } transition-opacity`}
          onClick={() => !showModal && onSelect?.(content)}
        >
          <div className="absolute bottom-0 left-0 right-0 p-4">
            {showRating && content.tmdbRating && (
              <div className="flex items-center gap-1 text-yellow-400 mb-2">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
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

        {/* Feedback modals */}
        {showModal === 'remove' && renderRemoveModal()}
        {showModal === 'keep' && renderKeepModal()}
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
      </div>
    </div>
  );
};
