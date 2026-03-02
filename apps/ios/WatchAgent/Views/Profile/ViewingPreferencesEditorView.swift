import SwiftUI

struct ViewingPreferencesEditorView: View {
    @Binding var selectedGenres: Set<Int>
    @Binding var contentTypes: Set<ContentType>
    @Binding var viewingPreferencesText: String
    let onSave: () async -> Void

    @State private var isSaving = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Content type
                VStack(alignment: .leading, spacing: 12) {
                    Text("What do you watch?")
                        .font(.headline)
                        .foregroundStyle(.white)

                    HStack(spacing: 12) {
                        contentTypeToggle("Movies", type: .movie, icon: "film")
                        contentTypeToggle("TV Shows", type: .tv, icon: "tv")
                    }
                }

                // Genres
                VStack(alignment: .leading, spacing: 12) {
                    Text("Favorite Genres")
                        .font(.headline)
                        .foregroundStyle(.white)

                    FlowLayout(spacing: 8) {
                        ForEach(TMDBGenres.all, id: \.id) { genre in
                            TagView(
                                text: genre.name,
                                isSelected: selectedGenres.contains(genre.id)
                            ) {
                                if selectedGenres.contains(genre.id) {
                                    selectedGenres.remove(genre.id)
                                } else {
                                    selectedGenres.insert(genre.id)
                                }
                            }
                        }
                    }
                }

                // Free-text preferences
                VStack(alignment: .leading, spacing: 8) {
                    Text("Additional Preferences")
                        .font(.headline)
                        .foregroundStyle(.white)
                    Text("Describe what you like in your own words")
                        .font(.caption)
                        .foregroundStyle(Theme.textSecondary)

                    TextEditor(text: $viewingPreferencesText)
                        .scrollContentBackground(.hidden)
                        .foregroundStyle(.white)
                        .frame(minHeight: 100)
                        .padding(12)
                        .background(Theme.surfaceBackground)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }

                // Save
                Button {
                    isSaving = true
                    Task {
                        await onSave()
                        isSaving = false
                    }
                } label: {
                    Group {
                        if isSaving {
                            ProgressView().tint(.white)
                        } else {
                            Text("Save Preferences")
                                .fontWeight(.semibold)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 48)
                }
                .buttonStyle(.borderedProminent)
                .tint(Theme.primary)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .padding(16)
        }
        .background(Theme.background)
        .navigationTitle("Edit Preferences")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarColorScheme(.dark, for: .navigationBar)
    }

    private func contentTypeToggle(_ label: String, type: ContentType, icon: String) -> some View {
        Button {
            if contentTypes.contains(type) {
                if contentTypes.count > 1 { contentTypes.remove(type) }
            } else {
                contentTypes.insert(type)
            }
        } label: {
            HStack {
                Image(systemName: icon)
                Text(label)
            }
            .font(.subheadline.bold())
            .frame(maxWidth: .infinity)
            .frame(height: 44)
            .background(contentTypes.contains(type) ? Theme.primary : Theme.cardBackground)
            .foregroundStyle(contentTypes.contains(type) ? .white : Theme.textSecondary)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }
}
