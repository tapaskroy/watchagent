import SwiftUI

struct ContentCardView: View {
    let title: String
    let posterPath: String?
    let rating: Double?
    let releaseDate: String?
    let type: ContentType?

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            // Poster
            AsyncImage(url: APIConfig.posterURL(posterPath, size: APIConfig.ImageSize.posterMedium)) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(2/3, contentMode: .fill)
                case .failure:
                    posterPlaceholder
                default:
                    posterPlaceholder
                        .overlay { ProgressView().tint(Theme.textMuted) }
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 8))

            // Title
            Text(title)
                .font(.caption.bold())
                .foregroundStyle(Theme.textPrimary)
                .lineLimit(2)

            // Metadata
            HStack(spacing: 4) {
                if let rating, rating > 0 {
                    Image(systemName: "star.fill")
                        .font(.caption2)
                        .foregroundStyle(.yellow)
                    Text(String(format: "%.1f", rating))
                        .font(.caption2)
                        .foregroundStyle(Theme.textSecondary)
                }
                if let year = releaseDate?.prefix(4), !year.isEmpty {
                    Text(String(year))
                        .font(.caption2)
                        .foregroundStyle(Theme.textSecondary)
                }
            }
        }
    }

    private var posterPlaceholder: some View {
        RoundedRectangle(cornerRadius: 8)
            .fill(Theme.cardBackground)
            .aspectRatio(2/3, contentMode: .fill)
            .overlay {
                Image(systemName: "film")
                    .font(.title2)
                    .foregroundStyle(Theme.textMuted)
            }
    }
}

// Convenience initializers from different model types
extension ContentCardView {
    init(content: ContentCard) {
        self.init(
            title: content.title,
            posterPath: content.posterPath,
            rating: content.tmdbRating,
            releaseDate: content.releaseDate,
            type: content.type
        )
    }

    init(content: ContentListItem) {
        self.init(
            title: content.title,
            posterPath: content.posterPath,
            rating: content.tmdbRating,
            releaseDate: content.releaseDate,
            type: content.type
        )
    }
}
