import Foundation

enum PreferencesService {
    static func getProfile() async throws -> UserProfile {
        let response: APIResponse<UserProfile> = try await APIClient.shared.request(
            .GET, path: "/preferences/profile"
        )
        guard let data = response.data else {
            throw response.error ?? APIError(code: "UNKNOWN", message: "Failed to load profile")
        }
        return data
    }

    static func updatePreferences(_ request: UpdatePreferencesRequest) async throws -> UserPreferences {
        let response: APIResponse<UserPreferences> = try await APIClient.shared.request(
            .PUT, path: "/preferences", body: request
        )
        guard let data = response.data else {
            throw response.error ?? APIError(code: "UNKNOWN", message: "Failed to update preferences")
        }
        return data
    }
}

// Genre constants for the UI
enum TMDBGenres {
    static let movie: [(id: Int, name: String)] = [
        (28, "Action"), (12, "Adventure"), (16, "Animation"),
        (35, "Comedy"), (80, "Crime"), (99, "Documentary"),
        (18, "Drama"), (10751, "Family"), (14, "Fantasy"),
        (36, "History"), (27, "Horror"), (10402, "Music"),
        (9648, "Mystery"), (10749, "Romance"), (878, "Sci-Fi"),
        (10770, "TV Movie"), (53, "Thriller"), (10752, "War"),
        (37, "Western")
    ]

    static let tv: [(id: Int, name: String)] = [
        (10759, "Action & Adventure"), (16, "Animation"), (35, "Comedy"),
        (80, "Crime"), (99, "Documentary"), (18, "Drama"),
        (10751, "Family"), (10762, "Kids"), (9648, "Mystery"),
        (10763, "News"), (10764, "Reality"), (10765, "Sci-Fi & Fantasy"),
        (10766, "Soap"), (10767, "Talk"), (10768, "War & Politics"),
        (37, "Western")
    ]

    static let all: [(id: Int, name: String)] = {
        var seen = Set<Int>()
        var result: [(id: Int, name: String)] = []
        for g in (movie + tv) {
            if seen.insert(g.id).inserted {
                result.append(g)
            }
        }
        return result.sorted { $0.name < $1.name }
    }()

    static func name(for id: Int) -> String {
        all.first(where: { $0.id == id })?.name ?? "Unknown"
    }
}
