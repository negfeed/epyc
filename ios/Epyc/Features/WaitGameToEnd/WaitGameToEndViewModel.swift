import Foundation
import SwiftUI
import EpycCore

/// Drives the "waiting for everyone to finish" screen: the player is done with all
/// their atoms, so we show per-thread completion progress until the game finishes.
@MainActor
final class WaitGameToEndViewModel: ObservableObject {
    @Published var game: Game?

    private var games: GameRepository?
    private var observeTask: Task<Void, Never>?

    var threads: [GameThread] { game?.threads ?? [] }

    /// Done atoms over total atoms for a thread, as a 0...1 fraction.
    func progress(for thread: GameThread) -> Double {
        let total = thread.gameAtoms.count
        guard total > 0 else { return 0 }
        let done = thread.gameAtoms.filter { $0.state == .done }.count
        return Double(done) / Double(total)
    }

    func doneCount(for thread: GameThread) -> Int {
        thread.gameAtoms.filter { $0.state == .done }.count
    }

    func totalCount(for thread: GameThread) -> Int {
        thread.gameAtoms.count
    }

    func start(gameId: String, games: GameRepository) {
        guard observeTask == nil else { return }
        self.games = games
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
