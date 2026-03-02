import SwiftUI

struct ContentView: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        Group {
            if appState.isLoading {
                ZStack {
                    Theme.background.ignoresSafeArea()
                    VStack(spacing: 16) {
                        Image(systemName: "film.stack")
                            .font(.system(size: 48))
                            .foregroundStyle(Theme.primary)
                        Text("WatchAgent")
                            .font(.title.bold())
                            .foregroundStyle(.white)
                        ProgressView()
                            .tint(Theme.primary)
                    }
                }
            } else if appState.isAuthenticated {
                MainTabView()
            } else {
                AuthNavigationView()
            }
        }
        .preferredColorScheme(.dark)
    }
}
