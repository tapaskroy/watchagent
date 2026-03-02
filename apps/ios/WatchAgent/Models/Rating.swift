import Foundation

struct Rating: Decodable, Identifiable {
    let id: String
    let userId: String
    let contentId: String
    let rating: Double
    let review: String?
    let isPublic: Bool?
    let createdAt: String?
    let updatedAt: String?
    let content: ContentCard?
    let user: RatingUser?
}

struct RatingUser: Decodable {
    let id: String
    let username: String
    let avatarUrl: String?
}

struct CreateRatingRequest: Encodable {
    let contentId: String
    let rating: Double
    let review: String?
    let isPublic: Bool?
}

struct UpdateRatingRequest: Encodable {
    let rating: Double?
    let review: String?
    let isPublic: Bool?
}
