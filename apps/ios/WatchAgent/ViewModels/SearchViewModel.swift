import Foundation

@Observable
@MainActor
final class SearchViewModel {
    var query = ""
    var results: [ContentListItem] = []
    var isSearching = false
    var hasSearched = false
    var selectedType: ContentType?

    private var searchTask: Task<Void, Never>?

    func search() {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            results = []
            hasSearched = false
            return
        }

        searchTask?.cancel()
        searchTask = Task {
            // Debounce
            try? await Task.sleep(for: .milliseconds(400))
            guard !Task.isCancelled else { return }

            isSearching = true
            do {
                results = try await ContentService.search(query: trimmed, type: selectedType)
            } catch {
                if !Task.isCancelled {
                    results = []
                }
            }
            isSearching = false
            hasSearched = true
        }
    }

    func clear() {
        query = ""
        results = []
        hasSearched = false
        searchTask?.cancel()
    }
}
