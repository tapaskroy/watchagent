import Foundation

@Observable
@MainActor
final class ProfileViewModel {
    var profile: UserProfile?
    var isLoading = true
    var errorMessage: String?

    // Edit state
    var selectedGenres: Set<Int> = []
    var contentTypes: Set<ContentType> = [.movie, .tv]
    var viewingPreferencesText = ""

    // Toast
    var showToast = false
    var toastMessage = ""
    var toastIsSuccess = true

    func loadProfile() async {
        isLoading = true
        errorMessage = nil

        do {
            let result = try await PreferencesService.getProfile()
            profile = result

            // Populate edit fields
            selectedGenres = Set(result.preferences.preferredGenres ?? [])
            contentTypes = Set(result.preferences.contentTypes ?? [.movie, .tv])
            viewingPreferencesText = result.preferences.viewingPreferencesText ?? ""
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func savePreferences() async {
        let request = UpdatePreferencesRequest(
            preferredGenres: selectedGenres.map { GenreInput(id: $0, name: TMDBGenres.name(for: $0)) },
            contentTypes: Array(contentTypes),
            viewingPreferencesText: viewingPreferencesText
        )

        do {
            _ = try await PreferencesService.updatePreferences(request)
            toastMessage = "Preferences saved!"
            toastIsSuccess = true
            showToast = true
        } catch {
            toastMessage = "Failed to save preferences"
            toastIsSuccess = false
            showToast = true
        }
    }
}
