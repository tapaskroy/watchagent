import Foundation

@Observable
@MainActor
final class ChatViewModel {
    var isLoading = true
    var errorMessage: String?

    var isOnboarding = false
    var onboardingCompleted = false
    var conversationId: String?
    var chatMessages: [DisplayMessage] = []
    var isSendingMessage = false
    var chatInput = ""

    // Search results from chat
    var searchResults: [ContentCard]?

    struct DisplayMessage: Identifiable {
        let id = UUID()
        let role: ChatRole
        let content: String
    }

    func loadData() async {
        isLoading = true
        errorMessage = nil

        do {
            let conversation = try await ChatService.getConversation()
            conversationId = conversation.conversationId
            isOnboarding = conversation.isOnboarding && !conversation.onboardingCompleted
            onboardingCompleted = conversation.onboardingCompleted

            chatMessages = conversation.messages.map {
                DisplayMessage(role: $0.role, content: $0.content)
            }

            if isOnboarding && !onboardingCompleted && chatMessages.isEmpty {
                await startOnboarding()
            }
        } catch {
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

        if let conversationId {
            do {
                let response = try await ChatService.sendMessage(conversationId: conversationId, message: userMessage)

                if response.onboardingCompleted == true {
                    isOnboarding = false
                    onboardingCompleted = true
                }

                if response.isSearch == true, let results = response.searchResults, !results.isEmpty {
                    searchResults = results
                    chatMessages.append(DisplayMessage(role: .assistant, content: response.message))
                } else {
                    chatMessages.append(DisplayMessage(role: .assistant, content: response.message))
                }
            } catch {
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

    func clearSearchResults() {
        searchResults = nil
    }
}
