'use client';

import { useState, useEffect, useRef } from 'react';
import { ContentCard, Loading } from '@watchagent/ui';
import { APP_VERSION } from '@/lib/version';
import { useChat } from '@/hooks/useChat';
import { useRouter } from 'next/navigation';
import type { ContentCard as ContentCardType } from '@watchagent/shared';

// ── Thread message types ──────────────────────────────────────────────────────
type TextMessage = {
  role: 'user' | 'assistant';
  kind: 'text';
  content: string;
};
type SearchMessage = {
  role: 'assistant';
  kind: 'search';
  content: string;
  cards: ContentCardType[];
};
type ThreadMessage = TextMessage | SearchMessage;

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar() {
  return (
    <div className="bg-primary w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0">
      <span className="text-white text-xs font-bold">W</span>
    </div>
  );
}

export default function ChatPage() {
  const router = useRouter();
  const {
    conversation,
    initOnboardingAsync,
    sendMessageAsync,
    isSending,
    isLoading: isLoadingConversation,
  } = useChat();

  const [chatMessage, setChatMessage] = useState('');
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [isInitializingOnboarding, setIsInitializingOnboarding] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const threadInitialized = useRef(false);

  // Lock body scroll — chat page is a full-viewport canvas
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // ── Init thread from DB conversation (runs once per mount) ───────────────
  useEffect(() => {
    if (!conversation || threadInitialized.current) return;
    threadInitialized.current = true;

    const isOnboarding = conversation.isOnboarding && !conversation.onboardingCompleted;

    if (isOnboarding) {
      if (conversation.messages.length === 0) {
        setIsInitializingOnboarding(true);
        initOnboardingAsync()
          .then((result) => {
            setThread([{ role: 'assistant', kind: 'text', content: result.message }]);
          })
          .catch((err) => console.error('Failed to init onboarding:', err))
          .finally(() => setIsInitializingOnboarding(false));
      } else {
        setThread(
          (conversation.messages as { role: string; content: string }[]).map((m) => ({
            role: m.role as 'user' | 'assistant',
            kind: 'text' as const,
            content: m.content,
          }))
        );
      }
      return;
    }

    // Post-onboarding: build thread from DB messages
    const textThread: ThreadMessage[] = (
      conversation.messages as { role: string; content: string }[]
    ).map((m) => ({
      role: m.role as 'user' | 'assistant',
      kind: 'text' as const,
      content: m.content,
    }));

    // Restore last search result cards from sessionStorage (survive navigation)
    try {
      const saved = sessionStorage.getItem('watchagent_last_search');
      if (saved) {
        const { content, cards } = JSON.parse(saved);
        let matchIdx = -1;
        for (let i = textThread.length - 1; i >= 0; i--) {
          if (textThread[i].role === 'assistant' && textThread[i].content === content) {
            matchIdx = i;
            break;
          }
        }
        if (matchIdx !== -1) {
          textThread[matchIdx] = { role: 'assistant', kind: 'search', content, cards };
        } else {
          sessionStorage.removeItem('watchagent_last_search');
        }
      }
    } catch {
      sessionStorage.removeItem('watchagent_last_search');
    }

    setThread(textThread);
  }, [conversation]); // eslint-disable-line

  // ── Auto-scroll thread to bottom ─────────────────────────────────────────
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [thread, isSending, isInitializingOnboarding]);

  // ── Auto-resize textarea ──────────────────────────────────────────────────
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [chatMessage]);

  const handleContentSelect = (content: ContentCardType) => {
    router.push(`/content/${content.tmdbId}?type=${content.type}`);
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !conversation) return;

    const userMessage = chatMessage.trim();
    setChatMessage('');

    setThread((prev) => [...prev, { role: 'user', kind: 'text', content: userMessage }]);

    try {
      const result = await sendMessageAsync({
        conversationId: conversation.conversationId,
        message: userMessage,
      });

      const searchResults = result.searchResults;
      if (result.isSearch && searchResults && searchResults.length > 0) {
        setThread((prev) => [
          ...prev,
          { role: 'assistant', kind: 'search', content: result.message, cards: searchResults },
        ]);
        sessionStorage.setItem('watchagent_last_search', JSON.stringify({
          content: result.message,
          cards: searchResults,
        }));
      } else {
        setThread((prev) => [
          ...prev,
          { role: 'assistant', kind: 'text', content: result.message },
        ]);
        sessionStorage.removeItem('watchagent_last_search');
      }

      // Onboarding just completed — flag Home page to poll, then navigate there
      if (result.onboardingCompleted && conversation?.isOnboarding && !conversation?.onboardingCompleted) {
        sessionStorage.setItem('watchagent_generating_recs', 'true');
        router.push('/');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setThread((prev) => prev.slice(0, -1));
    }
  };

  const isOnboarding = conversation?.isOnboarding && !conversation?.onboardingCompleted;
  const placeholder = isOnboarding
    ? 'Tell me about your favorite movies or shows...'
    : 'Search, get recommendations, or just chat...';

  // ── Render a single thread message ────────────────────────────────────────
  const renderMessage = (msg: ThreadMessage, idx: number) => {
    if (msg.kind === 'search') {
      return (
        <div key={idx} className="flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <Avatar />
            <div className="bg-background-card text-text-primary rounded-2xl rounded-bl-sm border border-gray-800 px-4 py-3 text-sm leading-relaxed max-w-[75%]">
              {msg.content}
            </div>
          </div>
          {/* Grid: 5 cols so all 10 results visible without scrolling */}
          <div className="pl-9 grid grid-cols-3 md:grid-cols-5 gap-3">
            {msg.cards.map((card: ContentCardType) => (
              <ContentCard key={card.id} content={card} onSelect={handleContentSelect} />
            ))}
          </div>
        </div>
      );
    }

    const isUser = msg.role === 'user';
    return (
      <div key={idx} className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
        {!isUser && <Avatar />}
        <div
          className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
            isUser
              ? 'bg-primary text-white rounded-br-sm'
              : 'bg-background-card text-text-primary rounded-bl-sm border border-gray-800'
          }`}
        >
          {msg.content}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 pt-16 flex flex-col bg-background-dark">

      {/* ── Thread (scrollable canvas) ── */}
      {isLoadingConversation ? (
        <div className="flex-1 flex items-center justify-center">
          <Loading size="lg" />
        </div>
      ) : (
        <div ref={threadRef} className="flex-1 overflow-y-auto px-4 py-6 max-w-4xl w-full mx-auto">
          <div className="space-y-5">

            {/* Onboarding welcome when thread is empty */}
            {isOnboarding && thread.length === 0 && !isInitializingOnboarding && (
              <div className="text-center py-16">
                <h1 className="text-5xl font-display font-bold text-primary mb-3">WatchAgent</h1>
                <p className="text-lg text-text-secondary">Let's get to know your taste</p>
              </div>
            )}

            {/* Chat messages */}
            {thread.map((msg, idx) => renderMessage(msg, idx))}

            {/* Thinking indicator */}
            {(isSending || isInitializingOnboarding) && (
              <div className="flex items-start gap-2">
                <Avatar />
                <div className="bg-background-card border border-gray-800 rounded-2xl rounded-bl-sm px-4 py-3">
                  <span className="text-text-secondary text-sm animate-pulse">Thinking...</span>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ── Chat bar ── */}
      <div className="flex-shrink-0 border-t border-gray-800 bg-background-dark/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <form onSubmit={handleChatSubmit} className="flex items-end gap-3">
            <textarea
              ref={textareaRef}
              value={chatMessage}
              onChange={(e) => {
                setChatMessage(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleChatSubmit(e as any);
                }
              }}
              placeholder={placeholder}
              disabled={isSending}
              rows={1}
              className="flex-1 px-5 py-3 bg-background-card text-text-primary border border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-text-secondary disabled:opacity-50 resize-none overflow-hidden min-h-[48px] max-h-[160px]"
              style={{ height: 'auto' }}
            />
            <button
              type="submit"
              disabled={!chatMessage.trim() || isSending}
              className="px-6 py-3 bg-primary text-white rounded-full font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              {isSending ? '...' : 'Send'}
            </button>
          </form>
          <p className="text-xs text-gray-600 mt-2 text-center">
            Enter to send · Shift+Enter for new line · version {APP_VERSION}
          </p>
        </div>
      </div>
    </div>
  );
}
