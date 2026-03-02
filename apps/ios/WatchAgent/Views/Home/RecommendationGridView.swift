import SwiftUI

struct RecommendationGridView: View {
    let recommendations: [Recommendation]
    let isRefreshing: Bool
    let onRefresh: () async -> Void

    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12)
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Text("For You")
                        .font(.title3.bold())
                        .foregroundStyle(.white)
                    Spacer()
                    if isRefreshing {
                        ProgressView()
                            .tint(Theme.primary)
                    }
                }

                if recommendations.isEmpty {
                    EmptyStateView(
                        icon: "sparkles",
                        title: "No Recommendations Yet",
                        message: "Chat with WatchAgent to get personalized recommendations!"
                    )
                    .frame(height: 200)
                } else {
                    LazyVGrid(columns: columns, spacing: 16) {
                        ForEach(recommendations) { rec in
                            NavigationLink(value: ContentDestination(
                                tmdbId: rec.content.tmdbId,
                                type: rec.content.type,
                                title: rec.content.title
                            )) {
                                VStack(alignment: .leading, spacing: 4) {
                                    ContentCardView(content: rec.content)
                                    if let reason = rec.reason {
                                        Text(reason)
                                            .font(.caption2)
                                            .foregroundStyle(Theme.textSecondary)
                                            .lineLimit(2)
                                    }
                                }
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
            .padding(16)
        }
        .refreshable {
            await onRefresh()
        }
    }
}
