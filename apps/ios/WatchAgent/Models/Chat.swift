import Foundation

struct Conversation: Decodable, Sendable {
    let conversationId: String
    let messages: [ChatMessage]
    let isOnboarding: Bool
    let onboardingCompleted: Bool
}

struct ChatMessage: Decodable, Identifiable, Sendable {
    let role: ChatRole
    let content: String
    let timestamp: String?

    var id: String { "\(role.rawValue)-\(timestamp ?? UUID().uuidString)" }
}

enum ChatRole: String, Decodable, Sendable {
    case user
    case assistant
}

struct InitOnboardingResponse: Decodable, Sendable {
    let message: String
    let conversationId: String
}

struct SendMessageResponse: Decodable, Sendable {
    let message: String
    let onboardingCompleted: Bool?
    let isSearch: Bool?
    let searchResults: [ContentCard]?
}
