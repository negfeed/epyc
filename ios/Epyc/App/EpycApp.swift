import SwiftUI
import FirebaseCore
import GoogleSignIn

@main
struct EpycApp: App {
    @StateObject private var di: DIContainer
    @StateObject private var router: AppRouter

    init() {
        FirebaseApp.configure()
        let container = DIContainer()
        _di = StateObject(wrappedValue: container)
        _router = StateObject(wrappedValue: AppRouter(games: container.games, auth: container.auth))
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(di)
                .environmentObject(di.auth)
                .environmentObject(router)
                .onOpenURL { url in
                    // Google Sign-In callback first; otherwise treat as an invite deep link.
                    if GIDSignIn.sharedInstance.handle(url) { return }
                    handleInviteLink(url)
                }
        }
    }

    /// Parses com.negfeed.epycnative://game/{id} or https://<domain>/game/{id} invite links.
    private func handleInviteLink(_ url: URL) {
        let parts = url.pathComponents.filter { $0 != "/" }
        if let idx = parts.firstIndex(of: "game"), idx + 1 < parts.count {
            router.enterGame(parts[idx + 1])
        } else if url.host == "game" {
            // com.negfeed.epycnative://game/{id}
            let id = url.pathComponents.last
            if let id, id != "/" { router.enterGame(id) }
        }
    }
}
