import SwiftUI

struct HomeView: View {
    @State private var viewModel = HomeViewModel()
    var onGoToChat: (() -> Void)?

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    LoadingView(message: "Setting things up...")
                } else if !viewModel.onboardingCompleted {
                    onboardingPrompt
                } else {
                    RecommendationGridView(
                        recommendations: viewModel.recommendations,
                        isRefreshing: viewModel.isRefreshingRecommendations,
                        onRefresh: { await viewModel.refreshRecommendations() }
                    )
                }
            }
            .navigationTitle("WatchAgent")
            .toolbarColorScheme(.dark, for: .navigationBar)
            .background(Theme.background)
            .navigationDestination(for: ContentDestination.self) { dest in
                ContentDetailView(tmdbId: dest.tmdbId, contentType: dest.type)
            }
        }
        .task {
            await viewModel.loadInitialData()
        }
    }

    private var onboardingPrompt: some View {
        VStack(spacing: 20) {
            Spacer()
            Image(systemName: "sparkles")
                .font(.system(size: 56))
                .foregroundStyle(Theme.primary)
            Text("Welcome to WatchAgent")
                .font(.title2.bold())
                .foregroundStyle(.white)
            Text("Tell us about your taste in movies and TV shows to get personalized recommendations.")
                .font(.subheadline)
                .foregroundStyle(Theme.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
            Button {
                onGoToChat?()
            } label: {
                Text("Get Started")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
            }
            .buttonStyle(.borderedProminent)
            .tint(Theme.primary)
            .padding(.horizontal, 48)
            Spacer()
        }
    }
}
