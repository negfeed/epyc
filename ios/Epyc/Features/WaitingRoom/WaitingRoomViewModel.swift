import Foundation
import SwiftUI
import EpycCore

/// View model for the waiting room. Observes the game, ensures the current user is a
/// member, and exposes derived host/join state plus the join/leave/start actions.
@MainActor
final class WaitingRoomViewModel: ObservableObject {
    @Published var game: Game?
    @Published var errorMessage: String?

    private let gameId: String
    private var didEnsureMembership = false

    init(gameId: String) {
        self.gameId = gameId
    }

    private var allUsers: [GameUser] {
        Array((game?.users ?? [:]).values)
            .sorted { $0.displayName.localizedCaseInsensitiveCompare($1.displayName) == .orderedAscending }
    }

    /// Players who have joined (will play), ordered by display name.
    var joinedUsers: [GameUser] { allUsers.filter { $0.joined } }

    /// Users present but only watching.
    var watchingUsers: [GameUser] { allUsers.filter { !$0.joined } }

    func isHost(uid: String) -> Bool { game?.creatorUid == uid }
    func isJoined(uid: String) -> Bool { game?.users[uid]?.joined == true }
    var isJoinable: Bool { game?.state == .created }

    /// Consume the game stream and ensure the current user is registered as a member.
    func observe(games: GameRepository, user: AuthUserInfo?) async {
        for await updated in games.observeGame(gameId) {
            game = updated
            await ensureMembership(games: games, game: updated, user: user)
        }
    }

    private func ensureMembership(games: GameRepository, game: Game, user: AuthUserInfo?) async {
        guard let user, !didEnsureMembership else { return }
        guard game.users[user.uid] == nil else {
            didEnsureMembership = true
            return
        }
        didEnsureMembership = true
        do {
            try await games.upsertGameUser(
                gameId: gameId,
                user: GameUser(uid: user.uid,
                               displayName: user.displayName,
                               photoURL: user.photoURL,
                               joined: false))
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func setJoined(games: GameRepository, uid: String, joined: Bool) {
        Task { [weak self] in
            guard let self else { return }
            do {
                try await games.setJoined(gameId: self.gameId, uid: uid, joined: joined)
            } catch {
                self.errorMessage = error.localizedDescription
            }
        }
    }

    func startGame(games: GameRepository) {
        Task { [weak self] in
            guard let self else { return }
            do {
                try await games.start(gameId: self.gameId)
            } catch {
                self.errorMessage = error.localizedDescription
            }
        }
    }
}
