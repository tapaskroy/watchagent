import SwiftUI

struct LoginView: View {
    @Environment(AppState.self) private var appState
    @Bindable var viewModel: AuthViewModel
    @FocusState private var focusedField: Field?

    enum Field { case email, password }

    var body: some View {
        ScrollView {
            VStack(spacing: 32) {
                // Logo
                VStack(spacing: 8) {
                    Image(systemName: "film.stack")
                        .font(.system(size: 56))
                        .foregroundStyle(Theme.primary)
                    Text("WatchAgent")
                        .font(.largeTitle.bold())
                        .foregroundStyle(.white)
                    Text("Your AI Movie Companion")
                        .font(.subheadline)
                        .foregroundStyle(Theme.textSecondary)
                }
                .padding(.top, 40)

                // Form
                VStack(spacing: 16) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Email")
                            .font(.caption)
                            .foregroundStyle(Theme.textSecondary)
                        TextField("", text: $viewModel.loginEmail)
                            .textFieldStyle(.plain)
                            .keyboardType(.emailAddress)
                            .textContentType(.emailAddress)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .padding(12)
                            .background(Theme.cardBackground)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                            .focused($focusedField, equals: .email)
                            .submitLabel(.next)
                            .onSubmit { focusedField = .password }
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        Text("Password")
                            .font(.caption)
                            .foregroundStyle(Theme.textSecondary)
                        SecureField("", text: $viewModel.loginPassword)
                            .textFieldStyle(.plain)
                            .textContentType(.password)
                            .padding(12)
                            .background(Theme.cardBackground)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                            .focused($focusedField, equals: .password)
                            .submitLabel(.go)
                            .onSubmit { loginAction() }
                    }
                }

                if let error = viewModel.errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(Theme.destructive)
                        .multilineTextAlignment(.center)
                }

                Button(action: loginAction) {
                    Group {
                        if viewModel.isLoading {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Text("Sign In")
                                .fontWeight(.semibold)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 48)
                }
                .buttonStyle(.borderedProminent)
                .tint(Theme.primary)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .disabled(!viewModel.canLogin || viewModel.isLoading)
            }
            .padding(.horizontal, 24)
        }
        .background(Theme.background)
    }

    private func loginAction() {
        guard viewModel.canLogin else { return }
        Task {
            if let tokens = await viewModel.login() {
                appState.handleLoginSuccess(tokens: tokens)
            }
        }
    }
}
