import Foundation

enum ContentService {
    static func search(query: String, type: ContentType? = nil, page: Int = 1) async throws -> [ContentListItem] {
        var params: [String: String] = ["query": query, "page": String(page)]
        if let type { params["type"] = type.rawValue }
        let response: APIResponse<[ContentListItem]> = try await APIClient.shared.request(
            .GET, path: "/content/search", query: params, authenticated: false
        )
        return (response.data ?? []).filter { $0.type == .movie || $0.type == .tv }
    }

    static func trending(type: ContentType? = nil, timeWindow: String = "week") async throws -> [ContentListItem] {
        var params: [String: String] = ["timeWindow": timeWindow]
        if let type { params["type"] = type.rawValue }
        let response: APIResponse<[ContentListItem]> = try await APIClient.shared.request(
            .GET, path: "/content/trending", query: params, authenticated: false
        )
        return response.data ?? []
    }

    static func popular(type: ContentType) async throws -> [ContentListItem] {
        let params: [String: String] = ["type": type.rawValue]
        let response: APIResponse<[ContentListItem]> = try await APIClient.shared.request(
            .GET, path: "/content/popular", query: params, authenticated: false
        )
        return response.data ?? []
    }

    static func detail(tmdbId: String, type: ContentType) async throws -> ContentDetail {
        let params: [String: String] = ["type": type.rawValue]
        let response: APIResponse<ContentDetail> = try await APIClient.shared.request(
            .GET, path: "/content/\(tmdbId)", query: params, authenticated: false
        )
        guard let data = response.data else {
            throw response.error ?? APIError(code: "NOT_FOUND", message: "Content not found")
        }
        return data
    }
}
