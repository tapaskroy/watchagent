import SwiftUI

struct WatchProvidersView: View {
    let providers: WatchProviders
    let title: String
    let tmdbId: String
    let contentType: ContentType

    @Environment(\.openURL) private var openURL

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Where to Watch")
                    .font(.headline)
                    .foregroundStyle(.white)
                Spacer()
                if providers.link != nil {
                    Button("View All") {
                        openTMDBLink()
                    }
                    .font(.caption)
                    .foregroundStyle(Theme.primary)
                }
            }

            if let flatrate = providers.flatrate, !flatrate.isEmpty {
                providerRow("Stream", providers: flatrate)
            }
            if let rent = providers.rent, !rent.isEmpty {
                providerRow("Rent", providers: rent)
            }
            if let buy = providers.buy, !buy.isEmpty {
                providerRow("Buy", providers: buy)
            }

            if providers.flatrate == nil && providers.rent == nil && providers.buy == nil {
                Text("No streaming info available")
                    .font(.subheadline)
                    .foregroundStyle(Theme.textSecondary)
            }
        }
    }

    @ViewBuilder
    private func providerRow(_ label: String, providers: [WatchProvider]) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.caption.bold())
                .foregroundStyle(Theme.textSecondary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(providers) { provider in
                        Button {
                            openProvider(provider)
                        } label: {
                            VStack(spacing: 4) {
                                AsyncImage(url: APIConfig.posterURL(provider.logoPath, size: "w92")) { phase in
                                    switch phase {
                                    case .success(let image):
                                        image
                                            .resizable()
                                            .frame(width: 48, height: 48)
                                    default:
                                        RoundedRectangle(cornerRadius: 10)
                                            .fill(Theme.surfaceBackground)
                                            .frame(width: 48, height: 48)
                                    }
                                }
                                .clipShape(RoundedRectangle(cornerRadius: 10))

                                Text(provider.providerName)
                                    .font(.caption2)
                                    .foregroundStyle(Theme.textSecondary)
                                    .lineLimit(2)
                                    .multilineTextAlignment(.center)
                                    .frame(width: 68)
                            }
                        }
                    }
                }
            }
        }
    }

    private func openProvider(_ provider: WatchProvider) {
        let searchQuery = title.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? title

        // Try app deep link first, fall back to web URL
        if let deepLink = deepLinkURL(for: provider, query: searchQuery),
           UIApplication.shared.canOpenURL(deepLink) {
            openURL(deepLink)
        } else if let webURL = webURL(for: provider, query: searchQuery) {
            openURL(webURL)
        } else {
            openTMDBLink()
        }
    }

    private func deepLinkURL(for provider: WatchProvider, query: String) -> URL? {
        switch provider.providerId {
        // Netflix
        case 8:
            return URL(string: "nflx://www.netflix.com/search?q=\(query)")
        // Apple TV / Apple TV+
        case 2, 350:
            return URL(string: "https://tv.apple.com/search?term=\(query)")
        // Disney+
        case 337:
            return URL(string: "disneyplus://search?q=\(query)")
        // Amazon Prime Video / Amazon Video
        case 9, 10, 119:
            return URL(string: "aiv://aiv/search?phrase=\(query)")
        // Hulu
        case 15:
            return URL(string: "hulu://search?query=\(query)")
        // HBO Max / Max
        case 384, 1899:
            return URL(string: "hbomax://search?q=\(query)")
        // Paramount+
        case 531, 2616, 2303:
            return URL(string: "paramountplus://search?q=\(query)")
        // Peacock
        case 386, 387:
            return URL(string: "peacock://search?query=\(query)")
        // YouTube / YouTube Premium
        case 192, 188:
            return URL(string: "youtube://results?search_query=\(query)")
        default:
            return nil
        }
    }

    private func webURL(for provider: WatchProvider, query: String) -> URL? {
        switch provider.providerId {
        case 8:
            return URL(string: "https://www.netflix.com/search?q=\(query)")
        case 2, 350:
            return URL(string: "https://tv.apple.com/search?term=\(query)")
        case 337:
            return URL(string: "https://www.disneyplus.com/search?q=\(query)")
        case 9, 10, 119:
            return URL(string: "https://www.amazon.com/s?k=\(query)&i=instant-video")
        case 15:
            return URL(string: "https://www.hulu.com/search?q=\(query)")
        case 384, 1899:
            return URL(string: "https://play.max.com/search?q=\(query)")
        case 531, 2616, 2303:
            return URL(string: "https://www.paramountplus.com/search/?q=\(query)")
        case 386, 387:
            return URL(string: "https://www.peacocktv.com/search?q=\(query)")
        case 192, 188:
            return URL(string: "https://www.youtube.com/results?search_query=\(query)")
        case 3: // Google Play
            return URL(string: "https://play.google.com/store/search?q=\(query)&c=movies")
        case 7: // Fandango At Home (Vudu)
            return URL(string: "https://www.vudu.com/content/movies/search?searchString=\(query)")
        default:
            return nil
        }
    }

    private func openTMDBLink() {
        if let link = providers.link, let url = URL(string: link) {
            openURL(url)
        }
    }
}
