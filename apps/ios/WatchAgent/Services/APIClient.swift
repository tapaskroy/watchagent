import Foundation

actor APIClient {
    static let shared = APIClient()

    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder
    private var isRefreshing = false
    private var pendingRequests: [CheckedContinuation<Void, Never>] = []

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        self.session = URLSession(configuration: config)

        self.decoder = JSONDecoder()
        self.decoder.keyDecodingStrategy = .convertFromSnakeCase
        self.decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let string = try container.decode(String.self)
            let iso = ISO8601DateFormatter()
            iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let date = iso.date(from: string) { return date }
            iso.formatOptions = [.withInternetDateTime]
            if let date = iso.date(from: string) { return date }
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Invalid date: \(string)")
        }

        self.encoder = JSONEncoder()
    }

    // MARK: - Public API

    func request<T: Decodable>(
        _ method: HTTPMethod,
        path: String,
        body: (any Encodable)? = nil,
        query: [String: String]? = nil,
        authenticated: Bool = true
    ) async throws -> T {
        if authenticated {
            await waitForRefreshIfNeeded()
        }

        let url = try buildURL(path: path, query: query)
        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if authenticated, let token = KeychainService.accessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body {
            request.httpBody = try encoder.encode(AnyEncodable(body))
        }

        let (data, response) = try await session.data(for: request)
        let httpResponse = response as! HTTPURLResponse

        // Handle 401 — try token refresh
        if httpResponse.statusCode == 401 && authenticated {
            let refreshed = await refreshToken()
            if refreshed {
                return try await self.request(method, path: path, body: body, query: query, authenticated: true)
            } else {
                await AppState.shared.logout()
                throw APIError(code: "UNAUTHORIZED", message: "Session expired. Please log in again.")
            }
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            if let apiResponse = try? decoder.decode(APIResponse<EmptyData>.self, from: data),
               let error = apiResponse.error {
                throw error
            }
            throw APIError(code: "HTTP_\(httpResponse.statusCode)", message: "Request failed with status \(httpResponse.statusCode)")
        }

        return try decoder.decode(T.self, from: data)
    }

    func requestRaw(
        _ method: HTTPMethod,
        path: String,
        body: (any Encodable)? = nil,
        query: [String: String]? = nil,
        authenticated: Bool = true
    ) async throws -> Data {
        if authenticated {
            await waitForRefreshIfNeeded()
        }

        let url = try buildURL(path: path, query: query)
        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if authenticated, let token = KeychainService.accessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body {
            request.httpBody = try encoder.encode(AnyEncodable(body))
        }

        let (data, response) = try await session.data(for: request)
        let httpResponse = response as! HTTPURLResponse

        if httpResponse.statusCode == 401 && authenticated {
            let refreshed = await refreshToken()
            if refreshed {
                return try await self.requestRaw(method, path: path, body: body, query: query, authenticated: true)
            } else {
                await AppState.shared.logout()
                throw APIError(code: "UNAUTHORIZED", message: "Session expired. Please log in again.")
            }
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            if let apiResponse = try? decoder.decode(APIResponse<EmptyData>.self, from: data),
               let error = apiResponse.error {
                throw error
            }
            throw APIError(code: "HTTP_\(httpResponse.statusCode)", message: "Request failed with status \(httpResponse.statusCode)")
        }

        return data
    }

    // MARK: - Token Refresh

    private func refreshToken() async -> Bool {
        if isRefreshing {
            await waitForRefreshIfNeeded()
            return KeychainService.accessToken != nil
        }

        isRefreshing = true
        defer {
            isRefreshing = false
            for continuation in pendingRequests {
                continuation.resume()
            }
            pendingRequests.removeAll()
        }

        guard let refreshToken = KeychainService.refreshToken else { return false }

        do {
            let url = try buildURL(path: "/auth/refresh", query: nil)
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")

            let body = ["refreshToken": refreshToken]
            request.httpBody = try JSONSerialization.data(withJSONObject: body)

            let (data, response) = try await session.data(for: request)
            let httpResponse = response as! HTTPURLResponse

            guard (200...299).contains(httpResponse.statusCode) else { return false }

            let apiResponse = try decoder.decode(APIResponse<AuthTokens>.self, from: data)
            guard let tokens = apiResponse.data else { return false }

            KeychainService.saveTokens(access: tokens.accessToken, refresh: tokens.refreshToken)
            return true
        } catch {
            return false
        }
    }

    private func waitForRefreshIfNeeded() async {
        guard isRefreshing else { return }
        await withCheckedContinuation { continuation in
            pendingRequests.append(continuation)
        }
    }

    // MARK: - Helpers

    private func buildURL(path: String, query: [String: String]?) throws -> URL {
        let fullPath = path.hasPrefix("/") ? path : "/\(path)"
        guard var components = URLComponents(string: APIConfig.baseURL + fullPath) else {
            throw APIError(code: "INVALID_URL", message: "Could not build URL for \(path)")
        }
        if let query, !query.isEmpty {
            components.queryItems = query.map { URLQueryItem(name: $0.key, value: $0.value) }
        }
        guard let url = components.url else {
            throw APIError(code: "INVALID_URL", message: "Could not build URL for \(path)")
        }
        return url
    }
}

enum HTTPMethod: String {
    case GET, POST, PUT, DELETE, PATCH
}

struct EmptyData: Decodable {}

struct EmptyBody: Encodable {}

// Type-erasing wrapper for Encodable
private struct AnyEncodable: Encodable {
    private let _encode: (Encoder) throws -> Void

    init(_ wrapped: any Encodable) {
        _encode = { encoder in
            try wrapped.encode(to: encoder)
        }
    }

    func encode(to encoder: Encoder) throws {
        try _encode(encoder)
    }
}
