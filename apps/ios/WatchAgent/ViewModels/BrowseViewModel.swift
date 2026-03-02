import Foundation

@Observable
@MainActor
final class BrowseViewModel {
    var trending: [ContentListItem] = []
    var popularMovies: [ContentListItem] = []
    var popularTV: [ContentListItem] = []
    var isLoading = true
    var errorMessage: String?

    func loadData() async {
        isLoading = true
        errorMessage = nil

        async let trendingTask = ContentService.trending()
        async let moviesTask = ContentService.popular(type: .movie)
        async let tvTask = ContentService.popular(type: .tv)

        do {
            let (t, m, tv) = try await (trendingTask, moviesTask, tvTask)
            trending = t
            popularMovies = m
            popularTV = tv
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}
