import SwiftUI

struct LearnedPreferencesView: View {
    let preferences: LearnedPreferences

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("What WatchAgent Learned")
                .font(.headline)
                .foregroundStyle(.white)

            if let movies = preferences.favoriteMovies, !movies.isEmpty {
                preferenceSection("Favorite Movies", items: movies, icon: "film")
            }
            if let genres = preferences.favoriteGenres, !genres.isEmpty {
                preferenceSection("Favorite Genres", items: genres, icon: "theatermasks")
            }
            if let actors = preferences.favoriteActors, !actors.isEmpty {
                preferenceSection("Favorite Actors", items: actors, icon: "person.2")
            }
            if let moods = preferences.moodPreferences, !moods.isEmpty {
                preferenceSection("Mood Preferences", items: moods, icon: "face.smiling")
            }
            if let dislikes = preferences.dislikes, !dislikes.isEmpty {
                preferenceSection("Dislikes", items: dislikes, icon: "hand.thumbsdown")
            }

            if isEmpty {
                Text("Chat with WatchAgent to build your preference profile!")
                    .font(.subheadline)
                    .foregroundStyle(Theme.textSecondary)
            }
        }
        .padding(16)
        .background(Theme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    @ViewBuilder
    private func preferenceSection(_ title: String, items: [String], icon: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.caption)
                    .foregroundStyle(Theme.primary)
                Text(title)
                    .font(.subheadline.bold())
                    .foregroundStyle(Theme.textSecondary)
            }
            TagFlowView(tags: items)
        }
    }

    private var isEmpty: Bool {
        (preferences.favoriteMovies ?? []).isEmpty
        && (preferences.favoriteGenres ?? []).isEmpty
        && (preferences.favoriteActors ?? []).isEmpty
        && (preferences.moodPreferences ?? []).isEmpty
        && (preferences.dislikes ?? []).isEmpty
    }
}
