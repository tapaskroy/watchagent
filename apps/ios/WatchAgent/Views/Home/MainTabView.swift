import SwiftUI

struct MainTabView: View {
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView()
                .tabItem {
                    Label("Home", systemImage: "house.fill")
                }
                .tag(0)

            BrowseView()
                .tabItem {
                    Label("Browse", systemImage: "rectangle.grid.2x2.fill")
                }
                .tag(1)

            WatchlistView()
                .tabItem {
                    Label("Watchlist", systemImage: "list.bullet")
                }
                .tag(2)

            ProfileView()
                .tabItem {
                    Label("Profile", systemImage: "person.fill")
                }
                .tag(3)
        }
        .tint(Theme.primary)
    }
}
