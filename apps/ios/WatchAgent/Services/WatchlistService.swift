import Foundation

enum WatchlistService {
    static func getAll(
        status: WatchlistStatus? = nil,
        sortBy: String = "added_at",
        sortOrder: String = "desc",
        page: Int = 1,
        limit: Int = 20
    ) async throws -> PaginatedData<WatchlistItem> {
        var params: [String: String] = [
            "sortBy": sortBy,
            "sortOrder": sortOrder,
            "page": String(page),
            "limit": String(limit)
        ]
        if let status { params["status"] = status.rawValue }

        let response: APIResponse<PaginatedData<WatchlistItem>> = try await APIClient.shared.request(
            .GET, path: "/watchlist", query: params
        )
        guard let data = response.data else {
            throw response.error ?? APIError(code: "UNKNOWN", message: "Failed to load watchlist")
        }
        return data
    }

    static func addFromTmdb(_ request: AddToWatchlistRequest) async throws -> WatchlistItem {
        let response: APIResponse<WatchlistItem> = try await APIClient.shared.request(
            .POST, path: "/watchlist/from-tmdb", body: request
        )
        guard let data = response.data else {
            throw response.error ?? APIError(code: "UNKNOWN", message: "Failed to add to watchlist")
        }
        return data
    }

    static func update(id: String, status: WatchlistStatus) async throws -> WatchlistItem {
        let body = ["status": status.rawValue]
        let response: APIResponse<WatchlistItem> = try await APIClient.shared.request(
            .PUT, path: "/watchlist/\(id)", body: body
        )
        guard let data = response.data else {
            throw response.error ?? APIError(code: "UNKNOWN", message: "Failed to update watchlist item")
        }
        return data
    }

    static func delete(id: String) async throws {
        let _: APIResponse<MessageResponse> = try await APIClient.shared.request(
            .DELETE, path: "/watchlist/\(id)"
        )
    }

    static func check(tmdbId: String) async throws -> WatchlistCheckResponse {
        let response: APIResponse<WatchlistCheckResponse> = try await APIClient.shared.request(
            .GET, path: "/watchlist/check/\(tmdbId)"
        )
        guard let data = response.data else {
            return WatchlistCheckResponse(inWatchlist: false, itemId: nil)
        }
        return data
    }
}
