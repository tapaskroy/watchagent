import Foundation

enum RecommendationsService {
    static func getPersonalized(refresh: Bool = false, limit: Int = 20) async throws -> [Recommendation] {
        var params: [String: String] = ["limit": String(limit)]
        if refresh { params["refresh"] = "true" }
        let response: APIResponse<[Recommendation]> = try await APIClient.shared.request(
            .GET, path: "/recommendations/personalized", query: params
        )
        return response.data ?? []
    }

    static func refreshRecommendations() async throws -> [Recommendation] {
        let response: APIResponse<[Recommendation]> = try await APIClient.shared.request(
            .POST, path: "/recommendations/refresh", body: EmptyBody()
        )
        return response.data ?? []
    }

    static func getSimilar(tmdbId: String, type: ContentType, limit: Int = 10) async throws -> [ContentCard] {
        let params: [String: String] = ["type": type.rawValue, "limit": String(limit)]
        let response: APIResponse<[ContentCard]> = try await APIClient.shared.request(
            .GET, path: "/recommendations/similar/\(tmdbId)", query: params, authenticated: false
        )
        return response.data ?? []
    }

    static func sendFeedback(_ feedback: FeedbackRequest) async throws -> FeedbackResponse {
        let response: APIResponse<FeedbackResponse> = try await APIClient.shared.request(
            .POST, path: "/recommendations/feedback", body: feedback
        )
        // The feedback response has fields at the top level of the API response
        // Try parsing response.data first, fall back to raw decoding
        if let data = response.data {
            return data
        }
        return FeedbackResponse(
            success: response.success,
            message: nil,
            preferencesUpdated: nil,
            learnedInsightsUpdated: nil,
            shouldRemoveFromUI: nil
        )
    }
}
