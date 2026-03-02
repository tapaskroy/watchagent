import SwiftUI

struct WatchlistView: View {
    @State private var viewModel = WatchlistViewModel()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Status filter tabs
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        statusChip("All", status: nil)
                        ForEach(WatchlistStatus.allCases, id: \.self) { status in
                            statusChip(status.displayName, status: status)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                }

                if viewModel.isLoading {
                    LoadingView()
                } else if viewModel.items.isEmpty {
                    EmptyStateView(
                        icon: "list.bullet",
                        title: "Your Watchlist is Empty",
                        message: "Add movies and TV shows to keep track of what to watch"
                    )
                } else {
                    List {
                        ForEach(viewModel.items) { item in
                            NavigationLink(value: ContentDestination(
                                tmdbId: item.content.tmdbId,
                                type: item.content.type,
                                title: item.content.title
                            )) {
                                watchlistRow(item)
                            }
                            .listRowBackground(Theme.cardBackground)
                            .swipeActions(edge: .trailing) {
                                Button(role: .destructive) {
                                    Task { await viewModel.deleteItem(id: item.id) }
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                            }
                            .swipeActions(edge: .leading) {
                                let nextStatus = nextStatus(for: item.status)
                                Button {
                                    Task { await viewModel.updateStatus(itemId: item.id, to: nextStatus) }
                                } label: {
                                    Label(nextStatus.displayName, systemImage: nextStatus.icon)
                                }
                                .tint(Theme.success)
                            }
                        }
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                }
            }
            .background(Theme.background)
            .navigationTitle("Watchlist (\(viewModel.totalItems))")
            .toolbarColorScheme(.dark, for: .navigationBar)
            .refreshable {
                await viewModel.loadData()
            }
            .navigationDestination(for: ContentDestination.self) { dest in
                ContentDetailView(tmdbId: dest.tmdbId, contentType: dest.type)
            }
        }
        .task {
            await viewModel.loadData()
        }
    }

    @ViewBuilder
    private func watchlistRow(_ item: WatchlistItem) -> some View {
        HStack(spacing: 12) {
            AsyncImage(url: APIConfig.posterURL(item.content.posterPath, size: APIConfig.ImageSize.posterSmall)) { phase in
                switch phase {
                case .success(let image):
                    image.resizable().aspectRatio(2/3, contentMode: .fill)
                default:
                    RoundedRectangle(cornerRadius: 6)
                        .fill(Theme.surfaceBackground)
                        .overlay { Image(systemName: "film").foregroundStyle(Theme.textMuted) }
                }
            }
            .frame(width: 50, height: 75)
            .clipShape(RoundedRectangle(cornerRadius: 6))

            VStack(alignment: .leading, spacing: 4) {
                Text(item.content.title)
                    .font(.subheadline.bold())
                    .foregroundStyle(.white)
                    .lineLimit(2)

                HStack(spacing: 6) {
                    Image(systemName: item.status.icon)
                        .font(.caption2)
                    Text(item.status.displayName)
                        .font(.caption)
                }
                .foregroundStyle(statusColor(item.status))

                if let rating = item.content.tmdbRating, rating > 0 {
                    HStack(spacing: 2) {
                        Image(systemName: "star.fill")
                            .font(.caption2)
                            .foregroundStyle(.yellow)
                        Text(String(format: "%.1f", rating))
                            .font(.caption)
                            .foregroundStyle(Theme.textSecondary)
                    }
                }
            }

            Spacer()
        }
        .padding(.vertical, 4)
    }

    private func statusChip(_ title: String, status: WatchlistStatus?) -> some View {
        Button {
            viewModel.filterByStatus(status)
        } label: {
            Text(title)
                .font(.caption.bold())
                .padding(.horizontal, 14)
                .padding(.vertical, 6)
                .background(viewModel.selectedStatus == status ? Theme.primary : Theme.cardBackground)
                .foregroundStyle(viewModel.selectedStatus == status ? .white : Theme.textSecondary)
                .clipShape(Capsule())
        }
    }

    private func statusColor(_ status: WatchlistStatus) -> Color {
        switch status {
        case .toWatch: Theme.primary
        case .watching: Theme.warning
        case .watched: Theme.success
        }
    }

    private func nextStatus(for current: WatchlistStatus) -> WatchlistStatus {
        switch current {
        case .toWatch: .watching
        case .watching: .watched
        case .watched: .toWatch
        }
    }
}
