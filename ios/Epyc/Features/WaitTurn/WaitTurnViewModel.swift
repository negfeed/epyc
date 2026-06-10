import Foundation
import SwiftUI
import EpycCore

/// Drives the "waiting for your turn" screen: it observes the game and surfaces the
/// thread containing the player's next atom so the player can see overall progress.
@MainActor
final class WaitTurnViewModel: ObservableObject {
    @Published var game: Game?

    private var games: GameRepository?
    private var auth: AuthService?
    private var observeTask: Task<Void, Never>?

    private var uid: String { auth?.user?.uid ?? "" }

    /// The thread index the player's next atom lives in, if any.
    var nextThreadIndex: Int? {
        guard let game else { return nil }
        let next = TurnEngine.getNextAtom(threads: game.threads, usersOrder: game.usersOrder, userId: uid)
        return next.address?.threadIndex
    }

    /// The atoms of the thread the player is waiting on.
    var trackedAtoms: [GameAtom] {
        guard let game, let i = nextThreadIndex, game.threads.indices.contains(i) else { return [] }
        return game.threads[i].gameAtoms
    }

    func displayName(forAuthor authorUid: String?) -> String {
        guard let game, let authorUid, let user = game.users[authorUid] else { return "—" }
        return user.displayName
    }

    /// Wire dependencies (from the environment) and begin observing the game.
    func start(gameId: String, games: GameRepository, auth: AuthService) {
        guard observeTask == nil else { return }
        self.games = games
        self.auth = auth
        observeTask = Task { [weak self] in
            for await game in games.observeGame(gameId) {
                self?.game = game
            }
        }
    }

    func stop() {
        observeTask?.cancel()
        observeTask = nil
    }
}

extension GameAtomType {
    var label: String {
        switch self {
        case .drawing: return "Draw"
        case .guess: return "Guess"
        }
    }
}

extension GameAtomState {
    var label: String {
        switch self {
        case .notStarted: return "Not started"
        case .started: return "In progress"
        case .done: return "Done"
        }
    }
}
