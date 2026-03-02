import Foundation

@Observable
@MainActor
final class ContentDetailViewModel {
    let tmdbId: String
    let contentType: ContentType

    var content: ContentDetail?
    var similarContent: [ContentCard] = []
    var isLoading = true
    var errorMessage: String?

    // Watchlist state
    var isInWatchlist = false
    var watchlistItemId: String?
    var isUpdatingWatchlist = false

    // Toast
    var showToast = false
    var toastMessage = ""
    var toastIsSuccess = true

    init(tmdbId: String, contentType: ContentType) {
        self.tmdbId = tmdbId
        self.contentType = contentType
    }

    func loadData() async {
        isLoading = true
        errorMessage = nil

        async let detailTask = ContentService.detail(tmdbId: tmdbId, type: contentType)
        async let similarTask = RecommendationsService.getSimilar(tmdbId: tmdbId, type: contentType)
        async let watchlistTask = WatchlistService.check(tmdbId: tmdbId)

        do {
            content = try await detailTask
        } catch {
            errorMessage = error.localizedDescription
        }

        similarContent = (try? await similarTask) ?? []

        if let check = try? await watchlistTask {
            isInWatchlist = check.inWatchlist
            watchlistItemId = check.itemId
        }

        isLoading = false
    }

    func toggleWatchlist() async {
        isUpdatingWatchlist = true

        if isInWatchlist, let itemId = watchlistItemId {
            // Remove
            do {
                try await WatchlistService.delete(id: itemId)
                isInWatchlist = false
                watchlistItemId = nil
                showToastMessage("Removed from watchlist", success: true)
            } catch {
                showToastMessage("Failed to remove", success: false)
            }
        } else if let content {
            // Add
            let request = AddToWatchlistRequest(
                tmdbId: content.tmdbId,
                type: content.type,
                title: content.title,
                overview: content.overview,
                posterPath: content.posterPath,
                backdropPath: content.backdropPath,
                releaseDate: content.releaseDate,
                genres: content.genres,
                rating: content.tmdbRating,
                status: .toWatch
            )
            do {
                let item = try await WatchlistService.addFromTmdb(request)
                isInWatchlist = true
                watchlistItemId = item.id
                showToastMessage("Added to watchlist!", success: true)
            } catch {
                showToastMessage("Failed to add", success: false)
            }
        }

        isUpdatingWatchlist = false
    }

    private func showToastMessage(_ message: String, success: Bool) {
        toastMessage = message
        toastIsSuccess = success
        showToast = true
    }

    var year: String? {
        guard let releaseDate = content?.releaseDate else { return nil }
        return String(releaseDate.prefix(4))
    }

    var runtimeFormatted: String? {
        guard let runtime = content?.runtime, runtime > 0 else { return nil }
        let hours = runtime / 60
        let minutes = runtime % 60
        if hours > 0 {
            return "\(hours)h \(minutes)m"
        }
        return "\(minutes)m"
    }

    var director: String? {
        content?.crew?.first(where: { $0.job == "Director" })?.name
    }
}
