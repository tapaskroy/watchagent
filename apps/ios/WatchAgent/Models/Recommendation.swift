import Foundation

struct Recommendation: Decodable, Identifiable, Sendable {
    let id: String
    let userId: String?
    let contentId: String?
    let score: Double?
    let reason: String?
    let algorithm: String?
    let createdAt: String?
    let expiresAt: String?
    let content: ContentCard
}

struct FeedbackRequest: Encodable {
    let contentId: String?
    let tmdbId: String?
    let type: ContentType?
    let contentTitle: String
    let action: FeedbackAction
    let rating: Double?
}

enum FeedbackAction: String, Encodable {
    case notRelevant = "not_relevant"
    case keep
    case watchlist
    case watched
}

struct FeedbackResponse: Decodable, Sendable {
    let success: Bool?
    let message: String?
    let preferencesUpdated: Bool?
    let learnedInsightsUpdated: Bool?
    let shouldRemoveFromUI: Bool?
}
