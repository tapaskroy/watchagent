import Foundation

@Observable
@MainActor
final class WatchlistViewModel {
    var items: [WatchlistItem] = []
    var isLoading = true
    var errorMessage: String?
    var selectedStatus: WatchlistStatus?
    var totalItems = 0

    func loadData() async {
        isLoading = true
        errorMessage = nil

        do {
            let result = try await WatchlistService.getAll(status: selectedStatus, limit: 50)
            items = result.items
            totalItems = result.meta.total ?? items.count
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func updateStatus(itemId: String, to status: WatchlistStatus) async {
        do {
            let updated = try await WatchlistService.update(id: itemId, status: status)
            if let index = items.firstIndex(where: { $0.id == itemId }) {
                items[index] = updated
            }
            // If filtering, remove if status changed to something else
            if let filter = selectedStatus, updated.status != filter {
                items.removeAll { $0.id == itemId }
            }
        } catch {
            errorMessage = "Failed to update status"
        }
    }

    func deleteItem(id: String) async {
        do {
            try await WatchlistService.delete(id: id)
            items.removeAll { $0.id == id }
            totalItems -= 1
        } catch {
            errorMessage = "Failed to remove item"
        }
    }

    func filterByStatus(_ status: WatchlistStatus?) {
        selectedStatus = status
        Task { await loadData() }
    }
}
