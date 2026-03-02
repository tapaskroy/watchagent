import SwiftUI

struct ProfileView: View {
    @Environment(AppState.self) private var appState
    @State private var viewModel = ProfileViewModel()
    @State private var showEditPreferences = false
    @State private var showLogoutConfirm = false

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    LoadingView()
                } else if let profile = viewModel.profile {
                    ScrollView {
                        VStack(spacing: 20) {
                            // User header
                            userHeader(profile.user)

                            // Stats
                            statsSection(profile.stats)

                            // Learned Preferences
                            if let learned = profile.preferences.learnedPreferences {
                                LearnedPreferencesView(preferences: learned)
                            }

                            // Selected genres
                            if let genres = profile.preferences.preferredGenres, !genres.isEmpty {
                                genresSection(genres)
                            }

                            // Liked content
                            if !profile.likedContent.isEmpty {
                                likedContentSection(profile.likedContent)
                            }

                            // Actions
                            VStack(spacing: 12) {
                                Button {
                                    showEditPreferences = true
                                } label: {
                                    Label("Edit Preferences", systemImage: "slider.horizontal.3")
                                        .font(.subheadline.bold())
                                        .frame(maxWidth: .infinity)
                                        .frame(height: 44)
                                }
                                .buttonStyle(.bordered)
                                .tint(.white)

                                Button(role: .destructive) {
                                    showLogoutConfirm = true
                                } label: {
                                    Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                                        .font(.subheadline.bold())
                                        .frame(maxWidth: .infinity)
                                        .frame(height: 44)
                                }
                                .buttonStyle(.bordered)
                                .tint(Theme.destructive)
                            }
                            .padding(.top, 8)
                        }
                        .padding(16)
                    }
                    .refreshable {
                        await viewModel.loadProfile()
                    }
                } else {
                    EmptyStateView(
                        icon: "person.crop.circle.badge.exclamationmark",
                        title: "Failed to Load",
                        message: viewModel.errorMessage,
                        actionTitle: "Retry"
                    ) {
                        Task { await viewModel.loadProfile() }
                    }
                }
            }
            .background(Theme.background)
            .navigationTitle("Profile")
            .toolbarColorScheme(.dark, for: .navigationBar)
            .navigationDestination(isPresented: $showEditPreferences) {
                ViewingPreferencesEditorView(
                    selectedGenres: $viewModel.selectedGenres,
                    contentTypes: $viewModel.contentTypes,
                    viewingPreferencesText: $viewModel.viewingPreferencesText,
                    onSave: { await viewModel.savePreferences() }
                )
            }
            .confirmationDialog("Sign Out?", isPresented: $showLogoutConfirm, titleVisibility: .visible) {
                Button("Sign Out", role: .destructive) {
                    Task { await appState.logout() }
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("Are you sure you want to sign out?")
            }
            .toast(isPresented: $viewModel.showToast, message: viewModel.toastMessage, isSuccess: viewModel.toastIsSuccess)
        }
        .task {
            await viewModel.loadProfile()
        }
    }

    @ViewBuilder
    private func userHeader(_ user: User) -> some View {
        VStack(spacing: 12) {
            // Avatar
            Circle()
                .fill(Theme.primary.opacity(0.2))
                .frame(width: 80, height: 80)
                .overlay {
                    Text(String(user.username.prefix(1)).uppercased())
                        .font(.title.bold())
                        .foregroundStyle(Theme.primary)
                }

            VStack(spacing: 4) {
                Text(user.fullName ?? user.username)
                    .font(.title3.bold())
                    .foregroundStyle(.white)
                Text("@\(user.username)")
                    .font(.subheadline)
                    .foregroundStyle(Theme.textSecondary)
                Text(user.email)
                    .font(.caption)
                    .foregroundStyle(Theme.textMuted)
            }
        }
    }

    @ViewBuilder
    private func statsSection(_ stats: UserStats) -> some View {
        HStack(spacing: 0) {
            statItem("Ratings", value: "\(stats.totalRatings)")
            Divider().frame(height: 32).overlay(Theme.divider)
            statItem("Watchlist", value: "\(stats.totalWatchlistItems)")
            Divider().frame(height: 32).overlay(Theme.divider)
            statItem("Avg Rating", value: String(format: "%.1f", stats.averageRating))
        }
        .padding(.vertical, 16)
        .background(Theme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func statItem(_ label: String, value: String) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.title3.bold())
                .foregroundStyle(Theme.primary)
            Text(label)
                .font(.caption)
                .foregroundStyle(Theme.textSecondary)
        }
        .frame(maxWidth: .infinity)
    }

    @ViewBuilder
    private func genresSection(_ genreIds: [Int]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Preferred Genres")
                .font(.headline)
                .foregroundStyle(.white)
            FlowLayout(spacing: 8) {
                ForEach(genreIds, id: \.self) { id in
                    TagView(text: TMDBGenres.name(for: id), isSelected: true)
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    @ViewBuilder
    private func likedContentSection(_ items: [LikedContent]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Highly Rated")
                .font(.headline)
                .foregroundStyle(.white)

            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: 12) {
                    ForEach(items) { item in
                        NavigationLink(value: ContentDestination(
                            tmdbId: item.tmdbId,
                            type: item.type,
                            title: item.title
                        )) {
                            ContentCardView(
                                title: item.title,
                                posterPath: item.posterPath,
                                rating: item.userRating,
                                releaseDate: item.releaseDate,
                                type: item.type
                            )
                            .frame(width: 100)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
        .navigationDestination(for: ContentDestination.self) { dest in
            ContentDetailView(tmdbId: dest.tmdbId, contentType: dest.type)
        }
    }
}
