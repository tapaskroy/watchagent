import Foundation

enum AuthService {
    static func login(email: String, password: String) async throws -> AuthTokens {
        let body = LoginRequest(email: email, password: password, rememberMe: true)
        let response: APIResponse<AuthTokens> = try await APIClient.shared.request(
            .POST, path: "/auth/login", body: body, authenticated: false
        )
        guard let tokens = response.data else {
            throw response.error ?? APIError(code: "UNKNOWN", message: "Login failed")
        }
        KeychainService.saveTokens(access: tokens.accessToken, refresh: tokens.refreshToken)
        return tokens
    }

    static func register(username: String, email: String, password: String, fullName: String?) async throws -> AuthTokens {
        let body = RegisterRequest(username: username, email: email, password: password, fullName: fullName)
        let response: APIResponse<AuthTokens> = try await APIClient.shared.request(
            .POST, path: "/auth/register", body: body, authenticated: false
        )
        guard let tokens = response.data else {
            throw response.error ?? APIError(code: "UNKNOWN", message: "Registration failed")
        }
        KeychainService.saveTokens(access: tokens.accessToken, refresh: tokens.refreshToken)
        return tokens
    }

    static func refresh() async throws -> AuthTokens {
        guard let refreshToken = KeychainService.refreshToken else {
            throw APIError(code: "NO_TOKEN", message: "No refresh token available")
        }
        let body = RefreshRequest(refreshToken: refreshToken)
        let response: APIResponse<AuthTokens> = try await APIClient.shared.request(
            .POST, path: "/auth/refresh", body: body, authenticated: false
        )
        guard let tokens = response.data else {
            throw response.error ?? APIError(code: "UNKNOWN", message: "Token refresh failed")
        }
        KeychainService.saveTokens(access: tokens.accessToken, refresh: tokens.refreshToken)
        return tokens
    }

    static func logout() async {
        if let refreshToken = KeychainService.refreshToken {
            let body = LogoutRequest(refreshToken: refreshToken)
            let _: LogoutResponse? = try? await APIClient.shared.request(
                .POST, path: "/auth/logout", body: body, authenticated: false
            )
        }
        KeychainService.clearTokens()
    }
}

// MARK: - Request Bodies

private struct LoginRequest: Encodable {
    let email: String
    let password: String
    let rememberMe: Bool
}

private struct RegisterRequest: Encodable {
    let username: String
    let email: String
    let password: String
    let fullName: String?
}

private struct RefreshRequest: Encodable {
    let refreshToken: String
}

private struct LogoutRequest: Encodable {
    let refreshToken: String
}
