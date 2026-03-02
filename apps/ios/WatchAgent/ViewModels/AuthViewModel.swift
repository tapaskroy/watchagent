import Foundation

@Observable
@MainActor
final class AuthViewModel {
    // Login fields
    var loginEmail = ""
    var loginPassword = ""

    // Register fields
    var registerUsername = ""
    var registerEmail = ""
    var registerPassword = ""
    var registerFullName = ""

    // State
    var isLoading = false
    var errorMessage: String?

    var canLogin: Bool {
        loginEmail.isValidEmail && loginPassword.count >= 8
    }

    var canRegister: Bool {
        registerUsername.isValidUsername
        && registerEmail.isValidEmail
        && registerPassword.isValidPassword
    }

    func login() async -> AuthTokens? {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let tokens = try await AuthService.login(email: loginEmail, password: loginPassword)
            return tokens
        } catch let error as APIError {
            errorMessage = error.message
            return nil
        } catch {
            errorMessage = "An unexpected error occurred. Please try again."
            return nil
        }
    }

    func register() async -> AuthTokens? {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let fullName = registerFullName.isEmpty ? nil : registerFullName
            let tokens = try await AuthService.register(
                username: registerUsername,
                email: registerEmail,
                password: registerPassword,
                fullName: fullName
            )
            return tokens
        } catch let error as APIError {
            errorMessage = error.message
            return nil
        } catch {
            errorMessage = "An unexpected error occurred. Please try again."
            return nil
        }
    }

    func clearError() {
        errorMessage = nil
    }
}
