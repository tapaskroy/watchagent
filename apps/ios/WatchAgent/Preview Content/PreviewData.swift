import Foundation

#if DEBUG
enum PreviewData {
    static let user = User(
        id: "preview-user-1",
        username: "moviefan",
        email: "fan@example.com",
        fullName: "Movie Fan",
        bio: "I love watching movies",
        avatarUrl: nil
    )

    static let contentCard = ContentCard(
        id: "preview-content-1",
        tmdbId: "550",
        type: .movie,
        title: "Fight Club",
        releaseDate: "1999-10-15",
        posterPath: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
        tmdbRating: 8.4,
        genres: [Genre(id: 18, name: "Drama"), Genre(id: 53, name: "Thriller")],
        userRating: nil,
        inWatchlist: false
    )

    static let recommendation = Recommendation(
        id: "preview-rec-1",
        userId: "preview-user-1",
        contentId: "preview-content-1",
        score: 0.92,
        reason: "Based on your love of psychological thrillers",
        algorithm: "llm",
        createdAt: "2024-01-01T00:00:00.000Z",
        expiresAt: "2024-01-08T00:00:00.000Z",
        content: contentCard
    )

    static let learnedPreferences = LearnedPreferences(
        favoriteMovies: ["The Shawshank Redemption", "Inception", "The Dark Knight"],
        favoriteGenres: ["Sci-Fi", "Thriller", "Drama"],
        favoriteActors: ["Leonardo DiCaprio", "Christian Bale"],
        dislikes: ["Jump scare horror", "Romantic comedies"],
        moodPreferences: ["Thought-provoking", "Dark and gritty"]
    )

    static let stats = UserStats(
        totalRatings: 42,
        totalWatchlistItems: 15,
        averageRating: 7.8
    )

    @MainActor
    static let appState: AppState = AppState.shared
}
#endif
