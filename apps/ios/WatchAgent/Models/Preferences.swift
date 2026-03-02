import Foundation

struct UserPreferences: Decodable, Sendable {
    let id: String?
    let userId: String?
    let preferredGenres: [Int]?
    let favoriteActors: [String]?
    let preferredLanguages: [String]?
    let contentTypes: [ContentType]?
    let notificationSettings: NotificationSettings?
    let viewingPreferencesText: String?
    let learnedPreferences: LearnedPreferences?
    let createdAt: String?
    let updatedAt: String?

    enum CodingKeys: String, CodingKey {
        case id, userId, preferredGenres, favoriteActors, preferredLanguages
        case contentTypes, notificationSettings, viewingPreferencesText
        case learnedPreferences, createdAt, updatedAt
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decodeIfPresent(String.self, forKey: .id)
        userId = try container.decodeIfPresent(String.self, forKey: .userId)
        favoriteActors = try container.decodeIfPresent([String].self, forKey: .favoriteActors)
        preferredLanguages = try container.decodeIfPresent([String].self, forKey: .preferredLanguages)
        contentTypes = try container.decodeIfPresent([ContentType].self, forKey: .contentTypes)
        notificationSettings = try container.decodeIfPresent(NotificationSettings.self, forKey: .notificationSettings)
        viewingPreferencesText = try container.decodeIfPresent(String.self, forKey: .viewingPreferencesText)
        learnedPreferences = try container.decodeIfPresent(LearnedPreferences.self, forKey: .learnedPreferences)
        createdAt = try container.decodeIfPresent(String.self, forKey: .createdAt)
        updatedAt = try container.decodeIfPresent(String.self, forKey: .updatedAt)

        // preferredGenres can be [Int] or [{ id: Int, name: String }]
        if let intArray = try? container.decode([Int].self, forKey: .preferredGenres) {
            preferredGenres = intArray
        } else if let genreArray = try? container.decode([Genre].self, forKey: .preferredGenres) {
            preferredGenres = genreArray.map(\.id)
        } else {
            preferredGenres = nil
        }
    }
}

struct NotificationSettings: Decodable, Sendable {
    let emailNotifications: Bool?
    let pushNotifications: Bool?
    let newRecommendations: Bool?
    let friendActivity: Bool?
    let newFollowers: Bool?
    let watchlistUpdates: Bool?
}

struct LearnedPreferences: Decodable, Sendable {
    let favoriteMovies: [String]?
    let favoriteGenres: [String]?
    let favoriteActors: [String]?
    let dislikes: [String]?
    let moodPreferences: [String]?
}

struct UpdatePreferencesRequest: Encodable {
    var preferredGenres: [GenreInput]?
    var favoriteActors: [String]?
    var preferredLanguages: [String]?
    var contentTypes: [ContentType]?
    var viewingPreferencesText: String?
}

struct GenreInput: Encodable {
    let id: Int
    let name: String
}
