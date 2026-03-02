import SwiftUI

struct CastGalleryView: View {
    let cast: [CastMember]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Cast")
                .font(.headline)
                .foregroundStyle(.white)

            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: 12) {
                    ForEach(cast.prefix(20)) { member in
                        VStack(spacing: 6) {
                            AsyncImage(url: APIConfig.profileURL(member.profilePath)) { phase in
                                switch phase {
                                case .success(let image):
                                    image
                                        .resizable()
                                        .scaledToFill()
                                default:
                                    Circle()
                                        .fill(Theme.surfaceBackground)
                                        .overlay {
                                            Image(systemName: "person.fill")
                                                .foregroundStyle(Theme.textMuted)
                                        }
                                }
                            }
                            .frame(width: 64, height: 64)
                            .clipShape(Circle())

                            VStack(spacing: 2) {
                                Text(member.name)
                                    .font(.caption2.bold())
                                    .foregroundStyle(.white)
                                    .lineLimit(1)
                                if let character = member.character {
                                    Text(character)
                                        .font(.caption2)
                                        .foregroundStyle(Theme.textSecondary)
                                        .lineLimit(1)
                                }
                            }
                            .frame(width: 80)
                        }
                    }
                }
            }
        }
    }
}
