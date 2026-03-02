import Foundation

@Observable
@MainActor
final class HomeViewModel {
    var isLoading = true
    var errorMessage: String?

    var onboardingCompleted = false

    // Recommendations
    var recommendations: [Recommendation] = []
    var isRefreshingRecommendations = false

    func loadInitialData() async {
        isLoading = true
        errorMessage = nil

        do {
            let conversation = try await ChatService.getConversation()
            onboardingCompleted = conversation.onboardingCompleted
                || (!conversation.isOnboarding)

            if onboardingCompleted {
                await loadRecommendations()
            }
        } catch {
            // New user — onboarding not complete
            onboardingCompleted = false
        }

        isLoading = false
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

    func removeRecommendation(id: String) {
        withMutation(keyPath: \.recommendations) {
            recommendations.removeAll { $0.id == id }
        }
    }
}
