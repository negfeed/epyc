import Foundation
import SwiftUI
import EpycCore

/// Drives the game-results overview: it observes the finished game and lists its
/// threads so the player can drill into each thread's full chain.
@MainActor
final class GameResultsViewModel: ObservableObject {
    @Published var game: Game?

    private var games: GameRepository?
    private var observeTask: Task<Void, Never>?

    var threads: [GameThread] { game?.threads ?? [] }

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
