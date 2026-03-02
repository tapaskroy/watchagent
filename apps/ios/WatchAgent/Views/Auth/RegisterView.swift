import SwiftUI

struct RegisterView: View {
    @Environment(AppState.self) private var appState
    @Bindable var viewModel: AuthViewModel
    @FocusState private var focusedField: Field?

    enum Field { case username, fullName, email, password }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                VStack(spacing: 8) {
                    Text("Create Account")
                        .font(.title.bold())
                        .foregroundStyle(.white)
                    Text("Join WatchAgent and get personalized recommendations")
                        .font(.subheadline)
                        .foregroundStyle(Theme.textSecondary)
                        .multilineTextAlignment(.center)
                }
                .padding(.top, 24)

                VStack(spacing: 16) {
                    formField("Username", text: $viewModel.registerUsername, field: .username, next: .fullName) {
                        if !viewModel.registerUsername.isEmpty && !viewModel.registerUsername.isValidUsername {
                            Text("3-50 characters, letters, numbers, underscore")
                                .font(.caption2)
                                .foregroundStyle(Theme.warning)
                        }
                    }

                    formField("Full Name (optional)", text: $viewModel.registerFullName, field: .fullName, next: .email)

                    formField("Email", text: $viewModel.registerEmail, field: .email, next: .password) {
                        if !viewModel.registerEmail.isEmpty && !viewModel.registerEmail.isValidEmail {
                            Text("Please enter a valid email")
                                .font(.caption2)
                                .foregroundStyle(Theme.warning)
                        }
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        Text("Password")
                            .font(.caption)
                            .foregroundStyle(Theme.textSecondary)
                        SecureField("", text: $viewModel.registerPassword)
                            .textFieldStyle(.plain)
                            .textContentType(.newPassword)
                            .padding(12)
                            .background(Theme.cardBackground)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                            .focused($focusedField, equals: .password)
                            .submitLabel(.go)
                            .onSubmit { registerAction() }
                        if !viewModel.registerPassword.isEmpty && !viewModel.registerPassword.isValidPassword {
                            Text("Min 8 chars with uppercase, lowercase, and number")
                                .font(.caption2)
                                .foregroundStyle(Theme.warning)
                        }
                    }
                }

                if let error = viewModel.errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(Theme.destructive)
                        .multilineTextAlignment(.center)
                }

                Button(action: registerAction) {
                    Group {
                        if viewModel.isLoading {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Text("Create Account")
                                .fontWeight(.semibold)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 48)
                }
                .buttonStyle(.borderedProminent)
                .tint(Theme.primary)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .disabled(!viewModel.canRegister || viewModel.isLoading)
            }
            .padding(.horizontal, 24)
        }
        .background(Theme.background)
    }

    private func formField(
        _ title: String,
        text: Binding<String>,
        field: Field,
        next: Field?,
        @ViewBuilder validation: () -> some View = { EmptyView() }
    ) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.caption)
                .foregroundStyle(Theme.textSecondary)
            TextField("", text: text)
                .textFieldStyle(.plain)
                .textInputAutocapitalization(field == .email ? .never : (field == .username ? .never : .words))
                .autocorrectionDisabled()
                .keyboardType(field == .email ? .emailAddress : .default)
                .textContentType(field == .email ? .emailAddress : (field == .username ? .username : .name))
                .padding(12)
                .background(Theme.cardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .focused($focusedField, equals: field)
                .submitLabel(next != nil ? .next : .go)
                .onSubmit {
                    if let next { focusedField = next } else { registerAction() }
                }
            validation()
        }
    }

    private func registerAction() {
        guard viewModel.canRegister else { return }
        Task {
            if let tokens = await viewModel.register() {
                appState.handleLoginSuccess(tokens: tokens)
            }
        }
    }
}
