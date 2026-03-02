import SwiftUI

struct HeroSectionView: View {
    let content: ContentDetail

    var body: some View {
        ZStack(alignment: .bottom) {
            // Backdrop
            AsyncImage(url: APIConfig.backdropURL(content.backdropPath)) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(16/9, contentMode: .fill)
                case .failure:
                    backdropPlaceholder
                default:
                    backdropPlaceholder
                        .overlay { ProgressView().tint(Theme.textMuted) }
                }
            }
            .frame(height: 250)
            .clipped()

            // Gradient overlay
            LinearGradient(
                colors: [.clear, Theme.background],
                startPoint: .center,
                endPoint: .bottom
            )

            // Title and metadata
            HStack(alignment: .bottom, spacing: 16) {
                // Mini poster
                AsyncImage(url: APIConfig.posterURL(content.posterPath, size: APIConfig.ImageSize.posterSmall)) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(2/3, contentMode: .fill)
                    default:
                        RoundedRectangle(cornerRadius: 8)
                            .fill(Theme.cardBackground)
                            .aspectRatio(2/3, contentMode: .fill)
                    }
                }
                .frame(width: 80, height: 120)
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .shadow(radius: 8)

                VStack(alignment: .leading, spacing: 4) {
                    Text(content.title)
                        .font(.title2.bold())
                        .foregroundStyle(.white)
                        .lineLimit(2)

                    HStack(spacing: 8) {
                        if let year = content.releaseDate?.prefix(4) {
                            Text(String(year))
                                .foregroundStyle(Theme.textSecondary)
                        }
                        if let runtime = content.runtime, runtime > 0 {
                            let h = runtime / 60
                            let m = runtime % 60
                            Text(h > 0 ? "\(h)h \(m)m" : "\(m)m")
                                .foregroundStyle(Theme.textSecondary)
                        }
                        if let rating = content.tmdbRating, rating > 0 {
                            HStack(spacing: 2) {
                                Image(systemName: "star.fill")
                                    .foregroundStyle(.yellow)
                                Text(String(format: "%.1f", rating))
                                    .foregroundStyle(.white)
                            }
                        }
                    }
                    .font(.caption)

                    if let genres = content.genres, !genres.isEmpty {
                        Text(genres.prefix(3).map(\.name).joined(separator: " · "))
                            .font(.caption)
                            .foregroundStyle(Theme.textSecondary)
                    }
                }

                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 8)
        }
    }

    private var backdropPlaceholder: some View {
        Rectangle()
            .fill(Theme.cardBackground)
            .frame(height: 250)
            .overlay {
                Image(systemName: "photo")
                    .font(.largeTitle)
                    .foregroundStyle(Theme.textMuted)
            }
    }
}
