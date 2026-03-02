import Foundation

enum ContentType: String, Codable, Sendable {
    case movie
    case tv
    case person
    case unknown

    static let allContent: [ContentType] = [.movie, .tv]

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let value = try container.decode(String.self)
        self = ContentType(rawValue: value) ?? .unknown
    }
}

struct Genre: Codable, Identifiable, Hashable, Sendable {
    let id: Int
    let name: String
}

struct ContentListItem: Decodable, Identifiable, Sendable {
    let id: Int
    let tmdbId: String
    let type: ContentType
    let title: String
    let originalTitle: String?
    let overview: String?
    let posterPath: String?
    let backdropPath: String?
    let releaseDate: String?
    let tmdbRating: Double?
    let popularity: Double?
    let genres: [Genre]?

    enum CodingKeys: String, CodingKey {
        case id, tmdbId, type, title, originalTitle, overview
        case posterPath, backdropPath, releaseDate, tmdbRating
        case popularity, genres
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        // id can be Int or String from API
        if let intId = try? container.decode(Int.self, forKey: .id) {
            id = intId
        } else if let strId = try? container.decode(String.self, forKey: .id),
                  let intId = Int(strId) {
            id = intId
        } else {
            id = 0
        }

        // tmdbId can also be Int or String
        if let strId = try? container.decode(String.self, forKey: .tmdbId) {
            tmdbId = strId
        } else if let intId = try? container.decode(Int.self, forKey: .tmdbId) {
            tmdbId = String(intId)
        } else {
            tmdbId = String(id)
        }

        type = try container.decode(ContentType.self, forKey: .type)
        title = try container.decode(String.self, forKey: .title)
        originalTitle = try container.decodeIfPresent(String.self, forKey: .originalTitle)
        overview = try container.decodeIfPresent(String.self, forKey: .overview)
        posterPath = try container.decodeIfPresent(String.self, forKey: .posterPath)
        backdropPath = try container.decodeIfPresent(String.self, forKey: .backdropPath)
        releaseDate = try container.decodeIfPresent(String.self, forKey: .releaseDate)
        tmdbRating = try container.decodeIfPresent(Double.self, forKey: .tmdbRating)
        popularity = try container.decodeIfPresent(Double.self, forKey: .popularity)
        genres = try container.decodeIfPresent([Genre].self, forKey: .genres)
    }
}

struct ContentDetail: Decodable, Identifiable, Sendable {
    let id: String
    let tmdbId: String
    let type: ContentType
    let title: String
    let originalTitle: String?
    let overview: String?
    let releaseDate: String?
    let runtime: Int?
    let genres: [Genre]?
    let posterPath: String?
    let backdropPath: String?
    let tmdbRating: Double?
    let tmdbVoteCount: Int?
    let imdbRating: Double?
    let popularity: Double?
    let language: String?
    let cast: [CastMember]?
    let crew: [CrewMember]?
    let productionCompanies: [ProductionCompany]?
    let keywords: [String]?
    let trailerUrl: String?
    let watchProviders: WatchProviders?
    let budget: Int?
    let revenue: Int?
    let status: String?
    let numberOfSeasons: Int?
    let numberOfEpisodes: Int?
    let episodeRuntime: [Int]?

    enum CodingKeys: String, CodingKey {
        case id, tmdbId, type, title, originalTitle, overview, releaseDate
        case runtime, genres, posterPath, backdropPath, tmdbRating, tmdbVoteCount
        case imdbRating, popularity, language, cast, crew, productionCompanies
        case keywords, trailerUrl, watchProviders, budget, revenue, status
        case numberOfSeasons, numberOfEpisodes, episodeRuntime
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        // id can be string UUID or missing
        if let strId = try? container.decode(String.self, forKey: .id) {
            id = strId
        } else {
            id = UUID().uuidString
        }
        tmdbId = try container.decode(String.self, forKey: .tmdbId)
        type = try container.decode(ContentType.self, forKey: .type)
        title = try container.decode(String.self, forKey: .title)
        originalTitle = try container.decodeIfPresent(String.self, forKey: .originalTitle)
        overview = try container.decodeIfPresent(String.self, forKey: .overview)
        releaseDate = try container.decodeIfPresent(String.self, forKey: .releaseDate)
        runtime = try container.decodeIfPresent(Int.self, forKey: .runtime)
        genres = try container.decodeIfPresent([Genre].self, forKey: .genres)
        posterPath = try container.decodeIfPresent(String.self, forKey: .posterPath)
        backdropPath = try container.decodeIfPresent(String.self, forKey: .backdropPath)
        tmdbRating = try container.decodeIfPresent(Double.self, forKey: .tmdbRating)
        tmdbVoteCount = try container.decodeIfPresent(Int.self, forKey: .tmdbVoteCount)
        imdbRating = try container.decodeIfPresent(Double.self, forKey: .imdbRating)
        popularity = try container.decodeIfPresent(Double.self, forKey: .popularity)
        language = try container.decodeIfPresent(String.self, forKey: .language)
        cast = try container.decodeIfPresent([CastMember].self, forKey: .cast)
        crew = try container.decodeIfPresent([CrewMember].self, forKey: .crew)
        productionCompanies = try container.decodeIfPresent([ProductionCompany].self, forKey: .productionCompanies)
        // keywords can be [String] or [{id, name}]
        if let stringKeywords = try? container.decodeIfPresent([String].self, forKey: .keywords) {
            keywords = stringKeywords
        } else if let objectKeywords = try? container.decodeIfPresent([KeywordObject].self, forKey: .keywords) {
            keywords = objectKeywords.map(\.name)
        } else {
            keywords = nil
        }
        trailerUrl = try container.decodeIfPresent(String.self, forKey: .trailerUrl)
        watchProviders = try container.decodeIfPresent(WatchProviders.self, forKey: .watchProviders)
        budget = try container.decodeIfPresent(Int.self, forKey: .budget)
        revenue = try container.decodeIfPresent(Int.self, forKey: .revenue)
        status = try container.decodeIfPresent(String.self, forKey: .status)
        numberOfSeasons = try container.decodeIfPresent(Int.self, forKey: .numberOfSeasons)
        numberOfEpisodes = try container.decodeIfPresent(Int.self, forKey: .numberOfEpisodes)
        episodeRuntime = try container.decodeIfPresent([Int].self, forKey: .episodeRuntime)
    }
}

private struct KeywordObject: Decodable {
    let id: Int
    let name: String
}

struct ContentCard: Decodable, Identifiable, Hashable, Sendable {
    let id: String
    let tmdbId: String
    let type: ContentType
    let title: String
    let releaseDate: String?
    let posterPath: String?
    let tmdbRating: Double?
    let genres: [Genre]?
    let userRating: Double?
    let inWatchlist: Bool?

    static func == (lhs: ContentCard, rhs: ContentCard) -> Bool {
        lhs.id == rhs.id
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}

struct CastMember: Decodable, Identifiable, Sendable {
    let id: Int
    let name: String
    let character: String?
    let profilePath: String?
    let order: Int?
}

struct CrewMember: Decodable, Identifiable, Sendable {
    let id: Int
    let name: String
    let job: String?
    let department: String?
    let profilePath: String?
}

struct ProductionCompany: Decodable, Identifiable, Sendable {
    let id: Int
    let name: String
    let logoPath: String?
    let originCountry: String?
}

struct WatchProviders: Decodable, Sendable {
    let link: String?
    let flatrate: [WatchProvider]?
    let rent: [WatchProvider]?
    let buy: [WatchProvider]?
}

struct WatchProvider: Decodable, Identifiable, Sendable {
    let providerId: Int
    let providerName: String
    let logoPath: String?
    let displayPriority: Int?

    var id: Int { providerId }
}

// Navigation destination
struct ContentDestination: Hashable {
    let tmdbId: String
    let type: ContentType
    let title: String
}
