import Foundation

struct APIResponse<T: Decodable & Sendable>: Decodable, Sendable {
    let success: Bool
    let data: T?
    let error: APIError?
    let meta: ResponseMeta?
}

struct APIError: Decodable, Error, LocalizedError, Sendable {
    let code: String
    let message: String
    let details: [String: String]?

    var errorDescription: String? { message }

    enum CodingKeys: String, CodingKey {
        case code, message, details
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        code = try container.decode(String.self, forKey: .code)
        message = try container.decode(String.self, forKey: .message)
        details = try? container.decode([String: String].self, forKey: .details)
    }

    init(code: String, message: String) {
        self.code = code
        self.message = message
        self.details = nil
    }
}

struct ResponseMeta: Decodable, Sendable {
    let page: Int?
    let limit: Int?
    let total: Int?
    let totalPages: Int?
    let algorithm: String?
    let cached: Bool?
    let timeWindow: String?
    let message: String?
}

struct AuthTokens: Decodable, Sendable {
    let accessToken: String
    let refreshToken: String
    let expiresIn: Int
}

struct PaginatedData<T: Decodable & Sendable>: Decodable, Sendable {
    let items: [T]
    let meta: ResponseMeta
}

struct MessageResponse: Decodable, Sendable {
    let message: String
}

struct LogoutResponse: Decodable, Sendable {
    let success: Bool
    let message: String?
}
