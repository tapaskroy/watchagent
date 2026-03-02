import Foundation

struct User: Codable, Identifiable, Sendable {
    let id: String
    let username: String
    let email: String
    var fullName: String?
    var bio: String?
    var avatarUrl: String?
}

struct UserProfile: Decodable {
    let user: User
    let preferences: UserPreferences
    let stats: UserStats
    let likedContent: [LikedContent]
}

struct UserStats: Decodable {
    let totalRatings: Int
    let totalWatchlistItems: Int
    let averageRating: Double
}

struct LikedContent: Decodable, Identifiable {
    let id: String
    let tmdbId: String
    let type: ContentType
    let title: String
    let posterPath: String?
    let releaseDate: String?
    let rating: Double
    let userRating: Double
    let ratedAt: String
}

struct JWTPayload {
    let id: String
    let username: String
    let email: String

    static func decode(from token: String) -> JWTPayload? {
        let parts = token.split(separator: ".")
        guard parts.count == 3 else { return nil }

        var base64 = String(parts[1])
        // Pad to multiple of 4
        let remainder = base64.count % 4
        if remainder > 0 {
            base64 += String(repeating: "=", count: 4 - remainder)
        }

        guard let data = Data(base64Encoded: base64) else { return nil }
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }

        guard let id = json["id"] as? String,
              let username = json["username"] as? String,
              let email = json["email"] as? String else { return nil }

        return JWTPayload(id: id, username: username, email: email)
    }
}
