import SwiftUI

struct RecommendationsView: View {
    @State private var viewModel = RecommendationsViewModel()

    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12)
    ]

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    LoadingView(message: "Getting recommendations...")
                } else if viewModel.recommendations.isEmpty {
                    EmptyStateView(
                        icon: "sparkles",
                        title: "No Recommendations",
                        message: "Complete the onboarding chat to get personalized picks",
                        actionTitle: "Refresh"
                    ) {
                        Task { await viewModel.refreshRecommendations() }
                    }
                } else {
                    ScrollView {
                        LazyVGrid(columns: columns, spacing: 20) {
                            ForEach(viewModel.recommendations) { rec in
                                NavigationLink(value: ContentDestination(
                                    tmdbId: rec.content.tmdbId,
                                    type: rec.content.type,
                                    title: rec.content.title
                                )) {
                                    ContentCardWithFeedbackView(recommendation: rec) { action in
                                        await viewModel.sendFeedback(for: rec, action: action)
                                    }
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(16)
                    }
                    .refreshable {
                        await viewModel.refreshRecommendations()
                    }
                }
            }
            .background(Theme.background)
            .navigationTitle("Recommendations")
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        Task { await viewModel.refreshRecommendations() }
                    } label: {
                        if viewModel.isRefreshing {
                            ProgressView().tint(.white)
                        } else {
                            Image(systemName: "arrow.clockwise")
                        }
                    }
                    .disabled(viewModel.isRefreshing)
                }
            }
            .navigationDestination(for: ContentDestination.self) { dest in
                ContentDetailView(tmdbId: dest.tmdbId, contentType: dest.type)
            }
            .toast(isPresented: $viewModel.showToast, message: viewModel.toastMessage, isSuccess: viewModel.toastIsSuccess)
        }
        .task {
            await viewModel.loadRecommendations()
        }
    }
}
