import Foundation

/// Tiny manual DI container shared via the SwiftUI environment. Keeps construction
/// explicit (no Hilt-equivalent needed for an app this size).
@MainActor
final class DIContainer: ObservableObject {
    let auth: AuthService
    let games: GameRepository
    let drawings: DrawingRepository
    let users: UserRepository

    init() {
        // Constructed on the main actor (AuthService is @MainActor). Avoids
        // main-actor-isolated default-argument evaluation in a nonisolated context.
        self.auth = AuthService()
        self.games = GameRepository()
        self.drawings = DrawingRepository()
        self.users = UserRepository()
    }
}
