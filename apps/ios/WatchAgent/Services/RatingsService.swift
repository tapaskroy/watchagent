import Foundation

enum RatingsService {
    static func getMyRating(contentId: String) async throws -> Rating? {
        let response: APIResponse<Rating> = try await APIClient.shared.request(
            .GET, path: "/ratings/my/\(contentId)"
        )
        return response.data
    }

    static func create(_ request: CreateRatingRequest) async throws -> Rating {
        let response: APIResponse<Rating> = try await APIClient.shared.request(
            .POST, path: "/ratings", body: request
        )
        guard let data = response.data else {
            throw response.error ?? APIError(code: "UNKNOWN", message: "Failed to create rating")
        }
        return data
    }

    static func update(id: String, request: UpdateRatingRequest) async throws -> Rating {
        let response: APIResponse<Rating> = try await APIClient.shared.request(
            .PUT, path: "/ratings/\(id)", body: request
        )
        guard let data = response.data else {
            throw response.error ?? APIError(code: "UNKNOWN", message: "Failed to update rating")
        }
        return data
    }

    static func delete(id: String) async throws {
        let _: APIResponse<MessageResponse> = try await APIClient.shared.request(
            .DELETE, path: "/ratings/\(id)"
        )
    }
}
