import Anthropic from '@anthropic-ai/sdk';
import { db } from '@watchagent/database';
import { conversations, ratings, watchlistItems, content } from '@watchagent/database';
import { eq, and, desc } from 'drizzle-orm';
import { CLAUDE_MODEL } from '@watchagent/shared';
import { logError, logDebug, logInfo } from '../../config/logger';
import { TMDBService } from '../external-apis/tmdb.service';
import { PreferencesService } from '../preferences/preferences.service';
import { LLMRecommendationService } from '../recommendation/llm-recommendation.service';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ConversationContext {
  favoriteMovies?: string[];
  favoriteGenres?: string[];
  favoriteActors?: string[];
  dislikes?: string[];
  moodPreferences?: string[];
}

interface SearchQuery {
  isSearch: boolean;
  genres?: string[];
  type?: 'movie' | 'tv' | 'both';
  mood?: string;
  language?: string;
  yearFrom?: number;
  yearTo?: number;
  keywords?: string[];
}

interface ChatResponse {
  message: string;
  searchResults?: any[];
  isSearch: boolean;
}

export class ChatService {
  private anthropic: Anthropic;
  private tmdb: TMDBService;
  private preferencesService: PreferencesService;
  private recommendationService: LLMRecommendationService;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.tmdb = new TMDBService();
    this.preferencesService = new PreferencesService();
    this.recommendationService = new LLMRecommendationService();
  }

  /**
   * Get or create a conversation for a user
   */
  async getOrCreateConversation(userId: string) {
    try {
      // Check if user has an active onboarding conversation
      const existingConversation = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.userId, userId),
          eq(conversations.isOnboarding, true),
          eq(conversations.onboardingCompleted, false)
        ),
      });

      if (existingConversation) {
        return existingConversation;
      }

      // Check if user has completed onboarding
      const completedOnboarding = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.userId, userId),
          eq(conversations.onboardingCompleted, true)
        ),
      });

      if (completedOnboarding) {
        // User has completed onboarding, get their latest conversation or create new one
        const latestConversation = await db.query.conversations.findFirst({
          where: eq(conversations.userId, userId),
          orderBy: [desc(conversations.updatedAt)],
        });

        if (latestConversation && !latestConversation.isOnboarding) {
          return latestConversation;
        }

        // Create a new regular conversation
        const [newConversation] = await db
          .insert(conversations)
          .values({
            userId,
            messages: [],
            context: completedOnboarding.context || {},
            isOnboarding: false,
            onboardingCompleted: true,
          })
          .returning();

        return newConversation;
      }

      // Create initial onboarding conversation
      const [newConversation] = await db
        .insert(conversations)
        .values({
          userId,
          messages: [],
          context: {},
          isOnboarding: true,
          onboardingCompleted: false,
        })
        .returning();

      return newConversation;
    } catch (error) {
      logError(error as Error, { userId, service: 'ChatService' });
      throw error;
    }
  }

  /**
   * Generate initial onboarding questions using LLM
   */
  async generateOnboardingQuestions(userId: string): Promise<string> {
    try {
      const systemPrompt = `You are a friendly AI assistant for WatchAgent, a personalized movie and TV show recommendation platform.

Your goal is to learn about the user's viewing preferences to provide better recommendations. This is the user's first interaction with the platform.

Generate exactly 3 questions to learn about their viewing preferences. The questions should be:
1. About their favorite movies or TV shows
2. About genres they enjoy
3. About what they're typically in the mood to watch

Keep the tone friendly and conversational. Ask open-ended questions that encourage detailed responses. Format your response as a natural greeting followed by the 3 questions.`;

      const response = await this.anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 500,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: 'Generate the initial onboarding questions for a new user.',
          },
        ],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return content.text;
      }

      throw new Error('Unexpected response format from Claude');
    } catch (error) {
      logError(error as Error, { userId, service: 'ChatService.generateOnboardingQuestions' });
      throw error;
    }
  }

  /**
   * Process user message and get LLM response
   */
  async processMessage(
    userId: string,
    userMessage: string,
    conversationId: string
  ): Promise<ChatResponse> {
    try {
      // Get conversation from database
      const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId),
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Detect if this is a search query (only for post-onboarding conversations)
      if (!conversation.isOnboarding || conversation.onboardingCompleted) {
        const searchQuery = await this.detectSearchQuery(userMessage, conversation.context);

        if (searchQuery.isSearch) {
          logInfo('Detected search query', { userId, searchQuery });
          const searchResults = await this.performSearch(searchQuery, userMessage, conversation.context);

          // Update conversation with user message
          const conversationMessages = conversation.messages as ChatMessage[];
          const updatedMessages: ChatMessage[] = [
            ...conversationMessages,
            {
              role: 'user',
              content: userMessage,
              timestamp: new Date().toISOString(),
            },
          ];

          await db
            .update(conversations)
            .set({
              messages: updatedMessages,
              updatedAt: new Date(),
            })
            .where(eq(conversations.id, conversationId));

          return {
            message: this.formatSearchResponse(searchQuery, searchResults.length),
            searchResults: searchResults,
            isSearch: true,
          };
        }
      }

      // Get user's watch history and ratings for context
      const userRatings = await db.query.ratings.findMany({
        where: eq(ratings.userId, userId),
        with: { content: true },
        limit: 10,
        orderBy: [desc(ratings.createdAt)],
      });

      const userWatchlist = await db.query.watchlistItems.findMany({
        where: eq(watchlistItems.userId, userId),
        with: { content: true },
        limit: 10,
        orderBy: [desc(watchlistItems.addedAt)],
      });

      // Build context for LLM
      const contextStr = this.buildContextString(userRatings, userWatchlist, conversation.context);

      const systemPrompt = conversation.isOnboarding
        ? this.getOnboardingSystemPrompt(contextStr)
        : this.getRegularChatSystemPrompt(contextStr);

      // Build message history for Claude
      const messages: Anthropic.MessageParam[] = [];
      const conversationMessages = conversation.messages as ChatMessage[];

      // Add previous messages
      conversationMessages.forEach((msg) => {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      });

      // Add current user message
      messages.push({
        role: 'user',
        content: userMessage,
      });

      // Get LLM response
      const response = await this.anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 1000,
        system: systemPrompt,
        messages,
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response format from Claude');
      }

      const assistantMessage = content.text;

      // Update conversation in database
      const updatedMessages: ChatMessage[] = [
        ...conversationMessages,
        {
          role: 'user',
          content: userMessage,
          timestamp: new Date().toISOString(),
        },
        {
          role: 'assistant',
          content: assistantMessage,
          timestamp: new Date().toISOString(),
        },
      ];

      // Extract learned preferences from the conversation
      const updatedContext = await this.extractPreferences(
        conversationMessages,
        userMessage,
        assistantMessage,
        conversation.context as ConversationContext
      );

      // Check if onboarding should be completed (after 3 rounds of Q&A)
      const userMessageCount = updatedMessages.filter((m) => m.role === 'user').length;
      const shouldCompleteOnboarding = conversation.isOnboarding && userMessageCount >= 3;

      await db
        .update(conversations)
        .set({
          messages: updatedMessages,
          context: updatedContext,
          onboardingCompleted: shouldCompleteOnboarding ? true : conversation.onboardingCompleted,
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, conversationId));

      // Sync conversation preferences to user preferences immediately after onboarding completes
      if (shouldCompleteOnboarding) {
        try {
          // Sync preferences from conversation to user preferences table
          await this.preferencesService.syncConversationPreferences(userId);
          logInfo('Synced conversation preferences to user preferences after onboarding', { userId });

          // Generate fresh personalized recommendations based on learned preferences
          await this.recommendationService.generateRecommendations(userId, true);
          logInfo('Generated fresh recommendations after onboarding', { userId });
        } catch (error) {
          logError(error as Error, { userId, service: 'ChatService.syncAfterOnboarding' });
          // Don't fail the whole request if sync fails
        }
      }

      return {
        message: assistantMessage,
        isSearch: false,
      };
    } catch (error) {
      logError(error as Error, { userId, conversationId, service: 'ChatService.processMessage' });
      throw error;
    }
  }

  /**
   * Build context string from user's history
   */
  private buildContextString(userRatings: any[], userWatchlist: any[], context: any): string {
    const parts: string[] = [];

    if (userRatings.length > 0) {
      const ratedMovies = userRatings
        .map((r) => `${r.content.title} (${r.rating}/10)`)
        .join(', ');
      parts.push(`Previously rated: ${ratedMovies}`);
    }

    if (userWatchlist.length > 0) {
      const watchlistTitles = userWatchlist.map((w) => w.content.title).join(', ');
      parts.push(`In watchlist: ${watchlistTitles}`);
    }

    if (context.favoriteMovies && context.favoriteMovies.length > 0) {
      parts.push(`Favorite movies: ${context.favoriteMovies.join(', ')}`);
    }

    if (context.favoriteGenres && context.favoriteGenres.length > 0) {
      parts.push(`Favorite genres: ${context.favoriteGenres.join(', ')}`);
    }

    if (context.favoriteActors && context.favoriteActors.length > 0) {
      parts.push(`Favorite actors: ${context.favoriteActors.join(', ')}`);
    }

    return parts.length > 0 ? parts.join('\n') : 'No viewing history yet';
  }

  /**
   * System prompt for onboarding conversation
   */
  private getOnboardingSystemPrompt(context: string): string {
    return `You are a friendly AI assistant for WatchAgent, a personalized movie and TV show recommendation platform.

You are currently onboarding a new user. Your goal is to learn about their viewing preferences through natural conversation.

Guidelines:
- Ask follow-up questions based on their responses
- Be enthusiastic and engaging
- After gathering preferences from about 3 exchanges, thank them and let them know you can now provide personalized recommendations
- Extract specific movie/show titles, genres, actors, and moods they mention

User Context:
${context}

Keep responses concise (2-3 sentences) and natural.`;
  }

  /**
   * System prompt for regular chat
   */
  private getRegularChatSystemPrompt(context: string): string {
    return `You are a friendly AI assistant for WatchAgent, a personalized movie and TV show recommendation platform.

Help users discover movies and TV shows based on their mood, preferences, and viewing history.

Guidelines:
- Provide specific movie/TV recommendations when asked
- Ask clarifying questions about their mood or preferences
- Reference their viewing history when relevant
- Keep responses concise and conversational

User Context:
${context}`;
  }

  /**
   * Extract preferences from conversation using LLM
   */
  private async extractPreferences(
    _previousMessages: ChatMessage[],
    userMessage: string,
    assistantMessage: string,
    currentContext: ConversationContext
  ): Promise<ConversationContext> {
    try {
      const extractionPrompt = `Based on this conversation, extract any mentioned preferences:

Previous context: ${JSON.stringify(currentContext)}

Latest exchange:
User: ${userMessage}
Assistant: ${assistantMessage}

Extract:
- Favorite movies/shows (specific titles)
- Favorite genres
- Favorite actors/directors
- Dislikes
- Mood preferences

Respond ONLY with a JSON object in this format:
{
  "favoriteMovies": [],
  "favoriteGenres": [],
  "favoriteActors": [],
  "dislikes": [],
  "moodPreferences": []
}`;

      const response = await this.anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: extractionPrompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        const extracted = JSON.parse(content.text);

        // Helper function to merge and deduplicate arrays
        const mergeUnique = (existing: string[] = [], newItems: string[] = []): string[] => {
          return Array.from(new Set([...existing, ...newItems]));
        };

        // Merge with existing context and remove duplicates
        return {
          favoriteMovies: mergeUnique(currentContext.favoriteMovies, extracted.favoriteMovies),
          favoriteGenres: mergeUnique(currentContext.favoriteGenres, extracted.favoriteGenres),
          favoriteActors: mergeUnique(currentContext.favoriteActors, extracted.favoriteActors),
          dislikes: mergeUnique(currentContext.dislikes, extracted.dislikes),
          moodPreferences: mergeUnique(currentContext.moodPreferences, extracted.moodPreferences),
        };
      }

      return currentContext;
    } catch (error) {
      logDebug('Failed to extract preferences, returning current context', { error });
      return currentContext;
    }
  }

  /**
   * Detect if user message is a content search query
   */
  private async detectSearchQuery(userMessage: string, _context: any): Promise<SearchQuery> {
    try {
      const detectionPrompt = `Analyze this user message and determine if they are asking for specific content recommendations/search vs. just having a conversation.

User message: "${userMessage}"

If this is a SEARCH REQUEST (e.g., "show me funny movies", "I want to watch a thriller", "find me French films"), extract:
- genres (array of genre names like "comedy", "thriller", "drama", "action", "romance", "horror", "sci-fi", "documentary")
- type ("movie", "tv", or "both")
- mood (if mentioned, like "funny", "scary", "uplifting", "dark")
- language (if mentioned, like "French", "Spanish", "Korean")
- yearFrom/yearTo (if they mention a decade or year range)
- keywords (other descriptive terms)

If this is just CONVERSATION (asking how I am, thanking, general chat, telling me about themselves without asking for recommendations), return isSearch: false.

IMPORTANT: Only consider it a search if they're explicitly asking to FIND, SEE, WATCH, or GET RECOMMENDATIONS for content.

Respond ONLY with a JSON object in this format:
{
  "isSearch": true/false,
  "genres": ["genre1", "genre2"],
  "type": "movie" | "tv" | "both",
  "mood": "string or null",
  "language": "string or null",
  "yearFrom": number or null,
  "yearTo": number or null,
  "keywords": ["keyword1", "keyword2"]
}`;

      logInfo('Detection prompt sent to Haiku', { prompt: detectionPrompt.substring(0, 500) });

      const response = await this.anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: detectionPrompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        logInfo('Haiku detection response', { response: content.text });
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          logInfo('Parsed search query', { parsed });
          return parsed as SearchQuery;
        }
      }

      return { isSearch: false };
    } catch (error) {
      logError(error as Error, { service: 'detectSearchQuery' });
      return { isSearch: false };
    }
  }

  /**
   * Ask Haiku for movie/show recommendations based on search query
   */
  private async getRecommendationsFromHaiku(query: SearchQuery, userMessage: string, userContext: any): Promise<string[]> {
    try {
      const genreStr = query.genres && query.genres.length > 0 ? query.genres.join(', ') : '';
      const typeStr = query.type === 'both' ? 'movies or TV shows' : query.type === 'movie' ? 'movies' : 'TV shows';
      const languageStr = query.language ? ` in ${query.language}` : '';
      const moodStr = query.mood ? ` that are ${query.mood}` : '';
      const yearStr = query.yearFrom || query.yearTo
        ? ` from ${query.yearFrom || 'any time'} to ${query.yearTo || 'present'}`
        : '';

      const recommendationPrompt = `You are a movie and TV show expert. The user asked: "${userMessage}"

User's viewing preferences: ${JSON.stringify(userContext)}

Based on the user's request and their preferences, recommend exactly 10 specific ${typeStr}${languageStr}${moodStr}${yearStr}.

Requirements:
- Focus on ${genreStr || 'popular'} genre(s)
- Consider the user's favorite actors, genres, and dislikes
- Only recommend well-known, real titles that exist
- Prioritize critically acclaimed and popular titles
- Return exact titles as they appear in TMDB/IMDB

Respond ONLY with a JSON array of movie/show titles, nothing else:
["Title 1", "Title 2", "Title 3", ...]

Return exactly 10 titles.`;

      logInfo('Asking Haiku for recommendations', { prompt: recommendationPrompt.substring(0, 300) });

      const response = await this.anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: recommendationPrompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        logInfo('Haiku recommendation response', { response: content.text });

        // Extract JSON array from response
        const jsonMatch = content.text.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
          const titles = JSON.parse(jsonMatch[0]) as string[];
          logInfo('Parsed movie titles from Haiku', { count: titles.length, titles });
          return titles;
        }
      }

      return [];
    } catch (error) {
      logError(error as Error, { service: 'getRecommendationsFromHaiku' });
      return [];
    }
  }

  /**
   * Perform content search based on extracted parameters
   */
  private async performSearch(query: SearchQuery, userMessage: string, userContext: any = {}): Promise<any[]> {
    try {
      const results: any[] = [];

      // Get movie/show recommendations from Haiku
      const recommendedTitles = await this.getRecommendationsFromHaiku(query, userMessage, userContext);

      if (recommendedTitles.length === 0) {
        logInfo('No recommendations from Haiku, returning empty results');
        return [];
      }

      // Search TMDB for each recommended title
      const type = query.type === 'both' ? undefined : query.type;

      for (const title of recommendedTitles) {
        try {
          logInfo('Searching TMDB for title', { title, type });

          // Search TMDB for this title
          const searchResults = await this.tmdb.search(title, type, 1);

          if (searchResults.results && searchResults.results.length > 0) {
            // Take the first (best) match
            const item = searchResults.results[0];
            const itemType = item.media_type || type || (item.title ? 'movie' : 'tv');

            // Check if content exists in our database
            let contentData = await db.query.content.findFirst({
              where: eq(content.tmdbId, item.id.toString()),
            });

            // If not in database, fetch details and cache it
            if (!contentData) {
              const tmdbDetails =
                itemType === 'movie'
                  ? await this.tmdb.getMovieDetails(item.id.toString())
                  : await this.tmdb.getTVDetails(item.id.toString());

              const insertedData = await db
                .insert(content)
                .values({
                  tmdbId: item.id.toString(),
                  type: itemType as 'movie' | 'tv',
                  title: item.title || item.name,
                  originalTitle: item.original_title || item.original_name || undefined,
                  overview: item.overview || undefined,
                  releaseDate: item.release_date || item.first_air_date || undefined,
                  runtime: tmdbDetails.runtime || tmdbDetails.episode_run_time?.[0] || null,
                  genres: tmdbDetails.genres || [],
                  posterPath: item.poster_path || null,
                  backdropPath: item.backdrop_path || null,
                  tmdbRating: item.vote_average?.toString() || null,
                  tmdbVoteCount: item.vote_count || null,
                  popularity: item.popularity?.toString() || null,
                  language: item.original_language || null,
                  cast: tmdbDetails.credits?.cast?.slice(0, 20) || [],
                  crew: tmdbDetails.credits?.crew?.slice(0, 10) || [],
                  productionCompanies: tmdbDetails.production_companies || [],
                  keywords: tmdbDetails.keywords?.keywords || tmdbDetails.keywords?.results || [],
                  trailerUrl:
                    tmdbDetails.videos?.results?.find(
                      (v: any) => v.type === 'Trailer' && v.site === 'YouTube'
                    )
                      ? `https://www.youtube.com/watch?v=${
                          tmdbDetails.videos.results.find(
                            (v: any) => v.type === 'Trailer' && v.site === 'YouTube'
                          ).key
                        }`
                      : null,
                  status: tmdbDetails.status || null,
                  budget: itemType === 'movie' ? tmdbDetails.budget || null : null,
                  revenue: itemType === 'movie' ? tmdbDetails.revenue || null : null,
                  numberOfSeasons: itemType === 'tv' ? tmdbDetails.number_of_seasons || null : null,
                  numberOfEpisodes: itemType === 'tv' ? tmdbDetails.number_of_episodes || null : null,
                })
                .returning()
                .catch((err) => {
                  logError(err, { tmdbId: item.id, type: itemType });
                  return [];
                });

              contentData = insertedData[0] || undefined;
            }

            if (contentData) {
              // Transform to ContentCard format
              results.push({
                id: contentData.id,
                tmdbId: contentData.tmdbId,
                type: contentData.type,
                title: contentData.title,
                releaseDate: contentData.releaseDate,
                posterPath: contentData.posterPath,
                tmdbRating: contentData.tmdbRating ? parseFloat(contentData.tmdbRating) : undefined,
                genres: contentData.genres as any[],
                inWatchlist: false,
              });

              logInfo('Successfully added search result', { title: contentData.title });
            }
          } else {
            logInfo('No TMDB results found for title', { title });
          }
        } catch (error) {
          logError(error as Error, { title, service: 'performSearch' });
        }
      }

      logInfo('Search completed', { resultCount: results.length, query });

      // Log sample result to debug
      if (results.length > 0) {
        logInfo('Sample search result', {
          id: results[0].id,
          tmdbId: results[0].tmdbId,
          title: results[0].title,
          hasId: !!results[0].id
        });
      }

      return results;
    } catch (error) {
      logError(error as Error, { service: 'performSearch' });
      return [];
    }
  }

  /**
   * Format a friendly response message for search results
   */
  private formatSearchResponse(query: SearchQuery, resultCount: number): string {
    const genreStr = query.genres && query.genres.length > 0 ? query.genres.join(', ') : '';
    const typeStr = query.type === 'both' ? 'movies and shows' : query.type === 'movie' ? 'movies' : 'shows';

    if (resultCount === 0) {
      return `I couldn't find any ${typeStr}${genreStr ? ` in the ${genreStr} genre(s)` : ''} matching your criteria. Try adjusting your search or ask me something else!`;
    }

    return `I found ${resultCount} ${typeStr}${genreStr ? ` in the ${genreStr} genre(s)` : ''} that might interest you. Check them out below!`;
  }
}
