import Foundation

@Observable
@MainActor
final class HomeViewModel {
    // State
    var isLoading = true
    var errorMessage: String?

    // Onboarding chat
    var isOnboarding = false
    var onboardingCompleted = false
    var conversationId: String?
    var chatMessages: [DisplayMessage] = []
    var isSendingMessage = false

    // Recommendations
    var recommendations: [Recommendation] = []
    var isRefreshingRecommendations = false

    // Chat-driven search results
    var searchResults: [ContentCard]?
    var chatInput = ""

    struct DisplayMessage: Identifiable {
        let id = UUID()
        let role: ChatRole
        let content: String
    }

    func loadInitialData() async {
        isLoading = true
        errorMessage = nil

        do {
            let conversation = try await ChatService.getConversation()
            conversationId = conversation.conversationId
            isOnboarding = conversation.isOnboarding && !conversation.onboardingCompleted
            onboardingCompleted = conversation.onboardingCompleted

            // Load existing messages
            chatMessages = conversation.messages.map {
                DisplayMessage(role: $0.role, content: $0.content)
            }

            if !isOnboarding || onboardingCompleted {
                // Load recommendations
                await loadRecommendations()
            } else if chatMessages.isEmpty {
                // Start onboarding
                await startOnboarding()
            }
        } catch {
            // New user — start onboarding
            await startOnboarding()
        }

        isLoading = false
    }

    private func startOnboarding() async {
        isOnboarding = true
        onboardingCompleted = false
        do {
            let response = try await ChatService.initOnboarding()
            conversationId = response.conversationId
            chatMessages.append(DisplayMessage(role: .assistant, content: response.message))
        } catch {
            errorMessage = "Failed to start onboarding: \(error.localizedDescription)"
        }
    }

    func sendMessage(_ text: String) async {
        let userMessage = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !userMessage.isEmpty else { return }

        chatMessages.append(DisplayMessage(role: .user, content: userMessage))
        chatInput = ""
        isSendingMessage = true

        // Try chat API (POST /chat/message — uses AI to detect search intent)
        if let conversationId {
            do {
                let response = try await ChatService.sendMessage(conversationId: conversationId, message: userMessage)

                if response.onboardingCompleted == true {
                    isOnboarding = false
                    onboardingCompleted = true
                    await loadRecommendations()
                }

                if response.isSearch == true, let results = response.searchResults, !results.isEmpty {
                    searchResults = results
                } else {
                    // AI responded but didn't return search results — show its message
                    chatMessages.append(DisplayMessage(role: .assistant, content: response.message))
                }
            } catch {
                // Chat failed — fall back to direct TMDB search
                await fallbackDirectSearch(query: userMessage)
            }
        } else {
            await fallbackDirectSearch(query: userMessage)
        }

        isSendingMessage = false
    }

    private func fallbackDirectSearch(query: String) async {
        do {
            let results = try await ContentService.search(query: query)
            if !results.isEmpty {
                searchResults = results.map { item in
                    ContentCard(
                        id: item.tmdbId,
                        tmdbId: item.tmdbId,
                        type: item.type,
                        title: item.title,
                        releaseDate: item.releaseDate,
                        posterPath: item.posterPath,
                        tmdbRating: item.tmdbRating,
                        genres: item.genres,
                        userRating: nil,
                        inWatchlist: nil
                    )
                }
            }
        } catch {
        }
    }

    func loadRecommendations() async {
        do {
            recommendations = try await RecommendationsService.getPersonalized()
        } catch {
            // Silently fail — show empty state
        }
    }

    func refreshRecommendations() async {
        isRefreshingRecommendations = true
        do {
            recommendations = try await RecommendationsService.refreshRecommendations()
        } catch {
            errorMessage = "Failed to refresh recommendations"
        }
        isRefreshingRecommendations = false
    }

    func clearSearchResults() {
        searchResults = nil
    }

    func removeRecommendation(id: String) {
        withMutation(keyPath: \.recommendations) {
            recommendations.removeAll { $0.id == id }
        }
    }
}
