'use client';

import { useState, useEffect } from 'react';
import { ContentCard, Loading } from '@watchagent/ui';
import { useRecommendations, useRefreshRecommendations } from '@/hooks/useRecommendations';
import { useChat } from '@/hooks/useChat';
import { useRouter } from 'next/navigation';
import type { ContentCard as ContentCardType } from '@watchagent/shared';

export default function HomePage() {
  const router = useRouter();
  // Request fresh recommendations if onboarding just completed
  const { data: recommendations, isLoading, refetch } = useRecommendations();
  const { mutate: refreshRecommendations, isPending: isRefreshing } = useRefreshRecommendations();
  const { conversation, initOnboardingAsync, sendMessageAsync, isSending } = useChat();
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [searchResults, setSearchResults] = useState<ContentCardType[]>([]);

  // Restore search results from sessionStorage on mount AND on browser navigation
  useEffect(() => {
    const restoreSearchResults = () => {
      const savedResults = sessionStorage.getItem('watchagent_search_results');
      if (savedResults) {
        try {
          const parsed = JSON.parse(savedResults);
          console.log('Restoring search results from sessionStorage:', parsed.length);
          setSearchResults(parsed);
        } catch (error) {
          console.error('Error parsing saved search results:', error);
          sessionStorage.removeItem('watchagent_search_results');
        }
      }
    };

    // Restore on mount
    restoreSearchResults();

    // Also restore when user navigates back (popstate event)
    window.addEventListener('popstate', restoreSearchResults);

    // Also restore on page show (handles browser back/forward cache)
    window.addEventListener('pageshow', restoreSearchResults);

    return () => {
      window.removeEventListener('popstate', restoreSearchResults);
      window.removeEventListener('pageshow', restoreSearchResults);
    };
  }, []);

  // Initialize onboarding if needed
  useEffect(() => {
    const initOnboarding = async () => {
      if (conversation && conversation.isOnboarding && !conversation.onboardingCompleted) {
        if (conversation.messages.length === 0) {
          // First time user - get LLM-generated onboarding questions
          try {
            const result = await initOnboardingAsync();
            setChatHistory([{ role: 'assistant', content: result.message }]);
          } catch (error) {
            console.error('Failed to initialize onboarding:', error);
          }
        } else {
          // Returning to existing onboarding conversation
          setChatHistory(conversation.messages as any[]);
        }
      } else if (conversation) {
        // Normal conversation
        setChatHistory(conversation.messages as any[]);
      }
    };

    initOnboarding();
  }, [conversation, initOnboardingAsync]);

  // Refetch recommendations after onboarding completes
  useEffect(() => {
    // If user has completed onboarding (not currently in onboarding), refetch recommendations
    if (conversation && !conversation.isOnboarding && conversation.onboardingCompleted) {
      console.log('Onboarding completed detected - refetching recommendations');
      refetch();
    }
  }, [conversation?.onboardingCompleted, conversation?.isOnboarding, refetch]);

  const handleContentSelect = (content: ContentCardType) => {
    router.push(`/content/${content.tmdbId}?type=${content.type}`);
  };

  const handleShowMore = () => {
    router.push('/recommendations');
  };

  const handleClearSearchResults = () => {
    setSearchResults([]);
    sessionStorage.removeItem('watchagent_search_results');
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !conversation) return;

    const userMessage = chatMessage.trim();
    setChatMessage('');

    // Optimistically add user message to chat
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const result = await sendMessageAsync({
        conversationId: conversation.conversationId,
        message: userMessage,
      });

      console.log('Chat response:', result);
      console.log('isSearch:', result.isSearch);
      console.log('searchResults:', result.searchResults);

      // Add assistant response
      setChatHistory(prev => [...prev, { role: 'assistant', content: result.message }]);

      // Handle search results
      if (result.isSearch && result.searchResults && result.searchResults.length > 0) {
        console.log('Setting search results:', result.searchResults);
        console.log('First result:', result.searchResults[0]);
        console.log('First result keys:', Object.keys(result.searchResults[0]));
        setSearchResults(result.searchResults);
        // Persist to sessionStorage so results survive navigation
        sessionStorage.setItem('watchagent_search_results', JSON.stringify(result.searchResults));
        console.log('Search results state updated and saved');
      } else {
        // Clear search results if this wasn't a search
        console.log('Clearing search results');
        setSearchResults([]);
        sessionStorage.removeItem('watchagent_search_results');
      }

      // If onboarding just completed (transitioned from false to true), refresh recommendations
      if (result.onboardingCompleted && conversation?.isOnboarding && !conversation?.onboardingCompleted) {
        console.log('Onboarding just completed! Refreshing recommendations...');
        // Trigger refresh of recommendations to get personalized results
        refreshRecommendations();
        // Give a moment for the backend to finish generating, then reload to update conversation state
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove optimistic user message on error
      setChatHistory(prev => prev.slice(0, -1));
    }
  };

  const topSuggestions = recommendations?.slice(0, 4) || [];
  const isOnboarding = conversation?.isOnboarding && !conversation?.onboardingCompleted;
  const placeholder = isOnboarding
    ? 'Tell me about your favorite movies or shows...'
    : 'Tell me what you\'re in the mood for...';

  return (
    <div className="min-h-screen flex flex-col">
      {/* Main content area - centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-32">
        {isLoading ? (
          <Loading size="lg" />
        ) : (
          <>
            {/* Logo/Title */}
            <div className="text-center mb-12">
              <h1 className="text-5xl md:text-6xl font-display font-bold text-primary mb-3">
                WatchAgent
              </h1>
              <p className="text-lg text-text-secondary mb-4">
                What do you want to watch?
              </p>
              {/* Only show refresh button when NOT showing search results */}
              {!isOnboarding && recommendations && recommendations.length > 0 && searchResults.length === 0 && (
                <button
                  onClick={() => refreshRecommendations()}
                  disabled={isRefreshing}
                  className="text-sm text-primary hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRefreshing ? '🔄 Refreshing...' : '🔄 Refresh Recommendations'}
                </button>
              )}
            </div>

            {/* Search Results Grid - Shown ONLY when we have search results */}
            {searchResults.length > 0 && (
              <div className="w-full max-w-5xl mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-text-primary">
                    Search Results ({searchResults.length} {searchResults.length === 1 ? 'result' : 'results'})
                  </h2>
                  <button
                    onClick={handleClearSearchResults}
                    className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                  >
                    ✕ Clear Results
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6 mb-6">
                  {searchResults.map((content) => (
                    <ContentCard
                      key={content.id}
                      content={content}
                      onSelect={handleContentSelect}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions Grid - Shown ONLY when we have NO search results */}
            {searchResults.length === 0 && topSuggestions.length > 0 && (
              <div className="w-full max-w-5xl mb-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6">
                  {topSuggestions.map((rec) => (
                    <ContentCard
                      key={rec.id}
                      content={rec.content}
                      onSelect={handleContentSelect}
                      recommendationReason={rec.reason}
                    />
                  ))}
                </div>

                {/* Show More Button */}
                <div className="text-center">
                  <button
                    onClick={handleShowMore}
                    className="text-primary hover:underline text-sm font-medium"
                  >
                    Show me more
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Fixed Chat Section at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-background-dark/95 backdrop-blur-sm border-t border-gray-800">
        <div className="max-w-3xl mx-auto px-4">
          {/* Chat History (only show if there's conversation and it's onboarding) */}
          {isOnboarding && chatHistory.length > 0 && (
            <div className="max-h-48 overflow-y-auto py-4 space-y-3">
              {chatHistory.slice(-4).map((msg, idx) => (
                <div
                  key={idx}
                  className={`text-sm ${
                    msg.role === 'assistant'
                      ? 'text-text-secondary'
                      : 'text-text-primary font-medium'
                  }`}
                >
                  {msg.role === 'assistant' ? '🤖 ' : '👤 '}
                  {msg.content}
                </div>
              ))}
            </div>
          )}

          {/* Chat Input */}
          <div className="py-4">
            <form onSubmit={handleChatSubmit} className="flex gap-3">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder={placeholder}
                disabled={isSending}
                className="flex-1 px-5 py-3 bg-background-card text-text-primary border border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-text-secondary disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!chatMessage.trim() || isSending}
                className="px-8 py-3 bg-primary text-white rounded-full font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? 'Sending...' : 'Send'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
