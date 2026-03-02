import Foundation

enum ChatService {
    static func getConversation() async throws -> Conversation {
        let response: APIResponse<Conversation> = try await APIClient.shared.request(
            .GET, path: "/chat/conversation"
        )
        guard let data = response.data else {
            throw response.error ?? APIError(code: "UNKNOWN", message: "Failed to load conversation")
        }
        return data
    }

    static func initOnboarding() async throws -> InitOnboardingResponse {
        let response: APIResponse<InitOnboardingResponse> = try await APIClient.shared.request(
            .POST, path: "/chat/init-onboarding", body: EmptyBody()
        )
        guard let data = response.data else {
            throw response.error ?? APIError(code: "UNKNOWN", message: "Failed to start onboarding")
        }
        return data
    }

    static func sendMessage(conversationId: String, message: String) async throws -> SendMessageResponse {
        let body = SendMessageRequest(conversationId: conversationId, message: message)
        let response: APIResponse<SendMessageResponse> = try await APIClient.shared.request(
            .POST, path: "/chat/message", body: body
        )
        guard let data = response.data else {
            throw response.error ?? APIError(code: "UNKNOWN", message: "Failed to send message")
        }
        return data
    }
}

private struct SendMessageRequest: Encodable {
    let conversationId: String
    let message: String
}
