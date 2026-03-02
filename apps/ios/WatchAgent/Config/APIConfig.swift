import Foundation

enum APIConfig {
    #if DEBUG
    static let baseURL = "https://api.watchagent.tapaskroy.me/api/v1"
    #else
    static let baseURL = "https://api.watchagent.tapaskroy.me/api/v1"
    #endif

    static let imageBaseURL = "https://image.tmdb.org/t/p"

    enum ImageSize {
        static let posterSmall = "w185"
        static let posterMedium = "w342"
        static let posterLarge = "w500"
        static let backdropSmall = "w300"
        static let backdropMedium = "w780"
        static let backdropLarge = "w1280"
        static let profileSmall = "w45"
        static let profileMedium = "w185"
        static let profileLarge = "h632"
        static let original = "original"
    }

    static func posterURL(_ path: String?, size: String = ImageSize.posterLarge) -> URL? {
        guard let path else { return nil }
        return URL(string: "\(imageBaseURL)/\(size)\(path)")
    }

    static func backdropURL(_ path: String?, size: String = ImageSize.backdropLarge) -> URL? {
        guard let path else { return nil }
        return URL(string: "\(imageBaseURL)/\(size)\(path)")
    }

    static func profileURL(_ path: String?, size: String = ImageSize.profileMedium) -> URL? {
        guard let path else { return nil }
        return URL(string: "\(imageBaseURL)/\(size)\(path)")
    }
}
