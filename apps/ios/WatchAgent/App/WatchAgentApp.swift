import SwiftUI

@main
struct WatchAgentApp: App {
    @State private var appState = AppState.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(appState)
                .task {
                    await appState.checkAuth()
                }
        }
    }
}
