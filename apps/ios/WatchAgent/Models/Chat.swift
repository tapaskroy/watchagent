import Foundation

struct Conversation: Decodable {
    let conversationId: String
    let messages: [ChatMessage]
    let isOnboarding: Bool
    let onboardingCompleted: Bool
}

struct ChatMessage: Decodable, Identifiable {
    let role: ChatRole
    let content: String
    let timestamp: String?

    var id: String { "\(role.rawValue)-\(timestamp ?? UUID().uuidString)" }
}

enum ChatRole: String, Decodable {
    case user
    case assistant
}

struct InitOnboardingResponse: Decodable {
    let message: String
    let conversationId: String
}

struct SendMessageResponse: Decodable {
    let message: String
    let onboardingCompleted: Bool?
    let isSearch: Bool?
    let searchResults: [ContentCard]?
}
