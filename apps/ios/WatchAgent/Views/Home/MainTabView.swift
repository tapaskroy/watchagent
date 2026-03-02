import SwiftUI

struct MainTabView: View {
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView(onGoToChat: { selectedTab = 1 })
                .tabItem {
                    Label("Home", systemImage: "house.fill")
                }
                .tag(0)

            ChatView()
                .tabItem {
                    Label("Chat", systemImage: "bubble.left.and.bubble.right.fill")
                }
                .tag(1)

            BrowseView()
                .tabItem {
                    Label("Browse", systemImage: "rectangle.grid.2x2.fill")
                }
                .tag(2)

            WatchlistView()
                .tabItem {
                    Label("Watchlist", systemImage: "list.bullet")
                }
                .tag(3)

            ProfileView()
                .tabItem {
                    Label("Profile", systemImage: "person.fill")
                }
                .tag(4)
        }
        .tint(Theme.primary)
    }
}
