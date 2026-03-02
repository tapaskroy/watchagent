import SwiftUI

struct HomeView: View {
    @State private var viewModel = HomeViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    LoadingView(message: "Setting things up...")
                } else if viewModel.isOnboarding && !viewModel.onboardingCompleted {
                    OnboardingChatView(viewModel: viewModel)
                } else {
                    VStack(spacing: 0) {
                        RecommendationGridView(
                            recommendations: viewModel.recommendations,
                            searchResults: viewModel.searchResults,
                            isRefreshing: viewModel.isRefreshingRecommendations,
                            onRefresh: { await viewModel.refreshRecommendations() },
                            onClearSearch: { viewModel.clearSearchResults() }
                        )

                        ChatBarView(
                            text: $viewModel.chatInput,
                            isLoading: viewModel.isSendingMessage
                        ) {
                            let text = viewModel.chatInput
                            Task { await viewModel.sendMessage(text) }
                        }
                    }
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
}
