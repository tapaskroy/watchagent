import Foundation

@Observable
@MainActor
final class RecommendationsViewModel {
    var recommendations: [Recommendation] = []
    var isLoading = true
    var isRefreshing = false
    var errorMessage: String?

    // Toast
    var showToast = false
    var toastMessage = ""
    var toastIsSuccess = true

    func loadRecommendations() async {
        isLoading = true
        errorMessage = nil

        do {
            recommendations = try await RecommendationsService.getPersonalized()
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func refreshRecommendations() async {
        isRefreshing = true

        do {
            recommendations = try await RecommendationsService.refreshRecommendations()
            showToastMessage("Recommendations refreshed!", success: true)
        } catch {
            showToastMessage("Failed to refresh", success: false)
        }

        isRefreshing = false
    }

    func sendFeedback(for recommendation: Recommendation, action: FeedbackAction) async {
        let request = FeedbackRequest(
            contentId: recommendation.contentId,
            tmdbId: recommendation.content.tmdbId,
            type: recommendation.content.type,
            contentTitle: recommendation.content.title,
            action: action,
            rating: nil
        )

        do {
            let response = try await RecommendationsService.sendFeedback(request)
            if response.shouldRemoveFromUI == true {
                withMutation(keyPath: \.recommendations) {
                    recommendations.removeAll { $0.id == recommendation.id }
                }
            }

            switch action {
            case .watchlist:
                showToastMessage("Added to watchlist!", success: true)
            case .notRelevant:
                showToastMessage("Removed", success: true)
            case .watched:
                showToastMessage("Marked as watched", success: true)
            case .keep:
                break
            }
        } catch {
            showToastMessage("Failed to send feedback", success: false)
        }
    }

    private func showToastMessage(_ message: String, success: Bool) {
        toastMessage = message
        toastIsSuccess = success
        showToast = true
    }
}
