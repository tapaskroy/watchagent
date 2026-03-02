import Foundation
import SwiftUI

@Observable
@MainActor
final class AppState {
    static let shared = AppState()

    var isAuthenticated = false
    var currentUser: User?
    var isLoading = true

    private init() {}

    func checkAuth() async {
        isLoading = true
        defer { isLoading = false }

        guard let accessToken = KeychainService.accessToken else {
            isAuthenticated = false
            currentUser = nil
            return
        }

        // Decode user from JWT
        if let payload = JWTPayload.decode(from: accessToken) {
            currentUser = User(
                id: payload.id,
                username: payload.username,
                email: payload.email
            )
            isAuthenticated = true
        } else {
            // Token is malformed, try refresh
            do {
                let tokens = try await AuthService.refresh()
                if let payload = JWTPayload.decode(from: tokens.accessToken) {
                    currentUser = User(
                        id: payload.id,
                        username: payload.username,
                        email: payload.email
                    )
                    isAuthenticated = true
                }
            } catch {
                isAuthenticated = false
                currentUser = nil
                KeychainService.clearTokens()
            }
        }
    }

    func handleLoginSuccess(tokens: AuthTokens) {
        if let payload = JWTPayload.decode(from: tokens.accessToken) {
            currentUser = User(
                id: payload.id,
                username: payload.username,
                email: payload.email
            )
        }
        isAuthenticated = true
    }

    func logout() async {
        await AuthService.logout()
        isAuthenticated = false
        currentUser = nil
    }

    nonisolated func logoutSync() {
        Task { @MainActor in
            await self.logout()
        }
    }
}
