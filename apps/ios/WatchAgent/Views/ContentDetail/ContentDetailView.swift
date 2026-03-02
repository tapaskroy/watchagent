import SwiftUI

struct ContentDetailView: View {
    let tmdbId: String
    let contentType: ContentType

    @State private var viewModel: ContentDetailViewModel

    init(tmdbId: String, contentType: ContentType) {
        self.tmdbId = tmdbId
        self.contentType = contentType
        self._viewModel = State(initialValue: ContentDetailViewModel(tmdbId: tmdbId, contentType: contentType))
    }

    private let similarColumns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12)
    ]

    var body: some View {
        Group {
            if viewModel.isLoading {
                LoadingView()
            } else if let error = viewModel.errorMessage {
                EmptyStateView(
                    icon: "exclamationmark.triangle",
                    title: "Error",
                    message: error,
                    actionTitle: "Retry"
                ) {
                    Task { await viewModel.loadData() }
                }
            } else if let content = viewModel.content {
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        // Hero
                        HeroSectionView(content: content)

                        VStack(alignment: .leading, spacing: 20) {
                            // Action buttons
                            HStack(spacing: 12) {
                                Button {
                                    Task { await viewModel.toggleWatchlist() }
                                } label: {
                                    Label(
                                        viewModel.isInWatchlist ? "In Watchlist" : "Add to Watchlist",
                                        systemImage: viewModel.isInWatchlist ? "checkmark" : "plus"
                                    )
                                    .font(.subheadline.bold())
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 44)
                                }
                                .buttonStyle(.borderedProminent)
                                .tint(viewModel.isInWatchlist ? Theme.success : Theme.primary)
                                .disabled(viewModel.isUpdatingWatchlist)

                                if let trailerUrl = content.trailerUrl,
                                   let url = URL(string: trailerUrl) {
                                    Link(destination: url) {
                                        Label("Trailer", systemImage: "play.fill")
                                            .font(.subheadline.bold())
                                            .frame(height: 44)
                                            .padding(.horizontal, 20)
                                    }
                                    .buttonStyle(.bordered)
                                    .tint(.white)
                                }
                            }

                            // Overview
                            if let overview = content.overview, !overview.isEmpty {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("Overview")
                                        .font(.headline)
                                        .foregroundStyle(.white)
                                    Text(overview)
                                        .font(.subheadline)
                                        .foregroundStyle(Theme.textSecondary)
                                        .lineSpacing(4)
                                }
                            }

                            // Details
                            detailsSection(content)

                            // Watch Providers
                            if let providers = content.watchProviders {
                                WatchProvidersView(
                                    providers: providers,
                                    title: content.title,
                                    tmdbId: content.tmdbId,
                                    contentType: content.type
                                )
                            }

                            // Cast
                            if let cast = content.cast, !cast.isEmpty {
                                CastGalleryView(cast: cast)
                            }

                            // Similar
                            if !viewModel.similarContent.isEmpty {
                                VStack(alignment: .leading, spacing: 12) {
                                    Text("Similar")
                                        .font(.headline)
                                        .foregroundStyle(.white)

                                    LazyVGrid(columns: similarColumns, spacing: 16) {
                                        ForEach(viewModel.similarContent) { card in
                                            NavigationLink(value: ContentDestination(
                                                tmdbId: card.tmdbId,
                                                type: card.type,
                                                title: card.title
                                            )) {
                                                ContentCardView(content: card)
                                            }
                                            .buttonStyle(.plain)
                                        }
                                    }
                                }
                            }
                        }
                        .padding(.horizontal, 16)
                    }
                }
            }
        }
        .background(Theme.background)
        .navigationBarTitleDisplayMode(.inline)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .toast(isPresented: $viewModel.showToast, message: viewModel.toastMessage, isSuccess: viewModel.toastIsSuccess)
        .task {
            await viewModel.loadData()
        }
    }

    @ViewBuilder
    private func detailsSection(_ content: ContentDetail) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            if let director = viewModel.director {
                detailRow("Director", value: director)
            }
            if let language = content.language {
                detailRow("Language", value: language.uppercased())
            }
            if let status = content.status {
                detailRow("Status", value: status)
            }
            if let seasons = content.numberOfSeasons {
                detailRow("Seasons", value: "\(seasons)")
            }
            if let episodes = content.numberOfEpisodes {
                detailRow("Episodes", value: "\(episodes)")
            }
            if let budget = content.budget, budget > 0 {
                detailRow("Budget", value: formatCurrency(budget))
            }
            if let revenue = content.revenue, revenue > 0 {
                detailRow("Revenue", value: formatCurrency(revenue))
            }
        }
    }

    private func detailRow(_ label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundStyle(Theme.textSecondary)
                .frame(width: 100, alignment: .leading)
            Text(value)
                .font(.subheadline)
                .foregroundStyle(.white)
            Spacer()
        }
    }

    private func formatCurrency(_ amount: Int) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: amount)) ?? "$\(amount)"
    }
}
