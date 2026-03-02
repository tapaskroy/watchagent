import SwiftUI

struct BrowseView: View {
    @State private var viewModel = BrowseViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    LoadingView()
                } else {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 24) {
                            section("Trending This Week", items: viewModel.trending)
                            section("Popular Movies", items: viewModel.popularMovies)
                            section("Popular TV Shows", items: viewModel.popularTV)
                        }
                        .padding(.vertical, 16)
                    }
                    .refreshable {
                        await viewModel.loadData()
                    }
                }
            }
            .background(Theme.background)
            .navigationTitle("Browse")
            .toolbarColorScheme(.dark, for: .navigationBar)
            .navigationDestination(for: ContentDestination.self) { dest in
                ContentDetailView(tmdbId: dest.tmdbId, contentType: dest.type)
            }
        }
        .task {
            await viewModel.loadData()
        }
    }

    @ViewBuilder
    private func section(_ title: String, items: [ContentListItem]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.title3.bold())
                .foregroundStyle(.white)
                .padding(.horizontal, 16)

            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: 12) {
                    ForEach(items) { item in
                        NavigationLink(value: ContentDestination(
                            tmdbId: item.tmdbId,
                            type: item.type,
                            title: item.title
                        )) {
                            ContentCardView(content: item)
                                .frame(width: 120)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 16)
            }
        }
    }
}
