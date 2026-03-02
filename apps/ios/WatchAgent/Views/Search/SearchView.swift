import SwiftUI

struct SearchView: View {
    @State private var viewModel = SearchViewModel()

    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12)
    ]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Type filter
                HStack(spacing: 8) {
                    filterChip("All", isSelected: viewModel.selectedType == nil) {
                        viewModel.selectedType = nil
                        viewModel.search()
                    }
                    filterChip("Movies", isSelected: viewModel.selectedType == .movie) {
                        viewModel.selectedType = .movie
                        viewModel.search()
                    }
                    filterChip("TV Shows", isSelected: viewModel.selectedType == .tv) {
                        viewModel.selectedType = .tv
                        viewModel.search()
                    }
                    Spacer()
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 8)

                if viewModel.isSearching {
                    LoadingView(message: "Searching...")
                } else if viewModel.results.isEmpty && viewModel.hasSearched {
                    EmptyStateView(
                        icon: "magnifyingglass",
                        title: "No Results",
                        message: "Try a different search term"
                    )
                } else if viewModel.results.isEmpty {
                    EmptyStateView(
                        icon: "magnifyingglass",
                        title: "Search Movies & TV",
                        message: "Find your next favorite watch"
                    )
                } else {
                    ScrollView {
                        LazyVGrid(columns: columns, spacing: 16) {
                            ForEach(viewModel.results) { item in
                                NavigationLink(value: ContentDestination(
                                    tmdbId: item.tmdbId,
                                    type: item.type,
                                    title: item.title
                                )) {
                                    ContentCardView(content: item)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(16)
                    }
                }
            }
            .background(Theme.background)
            .navigationTitle("Search")
            .toolbarColorScheme(.dark, for: .navigationBar)
            .searchable(text: $viewModel.query, prompt: "Movies, TV shows...")
            .onChange(of: viewModel.query) { viewModel.search() }
            .navigationDestination(for: ContentDestination.self) { dest in
                ContentDetailView(tmdbId: dest.tmdbId, contentType: dest.type)
            }
        }
    }

    private func filterChip(_ title: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.caption.bold())
                .padding(.horizontal, 14)
                .padding(.vertical, 6)
                .background(isSelected ? Theme.primary : Theme.cardBackground)
                .foregroundStyle(isSelected ? .white : Theme.textSecondary)
                .clipShape(Capsule())
        }
    }
}
