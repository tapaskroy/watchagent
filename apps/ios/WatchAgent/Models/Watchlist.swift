import Foundation

enum WatchlistStatus: String, Codable, CaseIterable {
    case toWatch = "to_watch"
    case watching
    case watched

    var displayName: String {
        switch self {
        case .toWatch: "To Watch"
        case .watching: "Watching"
        case .watched: "Watched"
        }
    }

    var icon: String {
        switch self {
        case .toWatch: "bookmark"
        case .watching: "play.circle"
        case .watched: "checkmark.circle"
        }
    }
}

struct WatchlistItem: Decodable, Identifiable, Sendable {
    let id: String
    let userId: String
    let contentId: String
    let status: WatchlistStatus
    let priority: Int
    let notes: String?
    let addedAt: String
    let updatedAt: String?
    let watchedAt: String?
    let content: ContentCard
}

struct WatchlistCheckResponse: Decodable, Sendable {
    let inWatchlist: Bool
    let itemId: String?
}

struct AddToWatchlistRequest: Encodable {
    let tmdbId: String
    let type: ContentType
    let title: String
    let overview: String?
    let posterPath: String?
    let backdropPath: String?
    let releaseDate: String?
    let genres: [Genre]?
    let rating: Double?
    let status: WatchlistStatus?
}
