import Foundation
import SwiftUI
import EpycCore

/// View model for the Home screen. Holds the recent games list, creates new games,
/// and performs profile/check-in upserts on appear.
@MainActor
final class HomeViewModel: ObservableObject {
    @Published var recentGames: [Game] = []
    @Published var isCreatingGame = false
    @Published var errorMessage: String?

    /// Consume the recent-games stream. Call from `.task` so it cancels on disappear.
    func observeRecentGames(games: GameRepository, uid: String) async {
        for await list in games.observeRecentGames(uid: uid) {
            recentGames = list
        }
    }

    /// Upsert the profile and record a check-in for the signed-in user.
    func refreshProfile(users: UserRepository, user: AuthUserInfo) async {
        try? await users.upsertProfile(user)
        try? await users.checkIn(uid: user.uid)
    }

    /// Create a new game then hand off to the router to enter it.
    func newGame(games: GameRepository, router: AppRouter, creator: AuthUserInfo) {
        guard !isCreatingGame else { return }
        isCreatingGame = true
        Task { [weak self] in
            defer { self?.isCreatingGame = false }
            do {
                let id = try await games.createGame(creator: creator)
                router.enterGame(id)
            } catch {
                self?.errorMessage = error.localizedDescription
            }
        }
    }

    func signOut(auth: AuthService) {
        try? auth.signOut()
    }

    /// Human-readable relative time for a game's creation timestamp (ms since epoch).
    func relativeTime(forMs ms: Double) -> String {
        let date = Date(timeIntervalSince1970: ms / 1000)
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .full
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}
