import SwiftUI

struct AuthNavigationView: View {
    @State private var viewModel = AuthViewModel()
    @State private var showRegister = false

    var body: some View {
        NavigationStack {
            VStack {
                LoginView(viewModel: viewModel)

                HStack(spacing: 4) {
                    Text("Don't have an account?")
                        .foregroundStyle(Theme.textSecondary)
                    Button("Sign Up") {
                        viewModel.clearError()
                        showRegister = true
                    }
                    .foregroundStyle(Theme.primary)
                    .fontWeight(.semibold)
                }
                .font(.subheadline)
                .padding(.bottom, 24)
            }
            .background(Theme.background)
            .navigationDestination(isPresented: $showRegister) {
                RegisterView(viewModel: viewModel)
                    .navigationBarBackButtonHidden(false)
                    .toolbar {
                        ToolbarItem(placement: .principal) {
                            Text("Sign Up")
                                .font(.headline)
                                .foregroundStyle(.white)
                        }
                    }
            }
        }
        .tint(Theme.primary)
    }
}
