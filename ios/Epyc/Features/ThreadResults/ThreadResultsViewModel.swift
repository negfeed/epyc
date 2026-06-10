import Foundation
import SwiftUI
import EpycCore

/// Drives a single thread's results: it observes the game to obtain the thread, and
/// lazily loads the recorded drawing events for each drawing atom so they can replay.
@MainActor
final class ThreadResultsViewModel: ObservableObject {
    @Published var game: Game?
    /// Loaded drawing events keyed by `drawingRef`.
    @Published var eventsByRef: [String: [DrawingEvent]] = [:]

    private var threadIndex: Int = 0
    private var games: GameRepository?
    private var drawings: DrawingRepository?
    private var observeTask: Task<Void, Never>?
    private var loadingRefs: Set<String> = []

    var word: String? {
        guard let game, game.threads.indices.contains(threadIndex) else { return nil }
        return game.threads[threadIndex].word
    }

    var atoms: [GameAtom] {
        guard let game, game.threads.indices.contains(threadIndex) else { return [] }
        return game.threads[threadIndex].gameAtoms
    }

    func author(for atom: GameAtom) -> GameUser? {
        guard let game else { return nil }
        return game.users[atom.authorUid ?? ""]
    }

    func events(forRef ref: String) -> [DrawingEvent]? {
        eventsByRef[ref]
    }

    func start(gameId: String, threadIndex: Int, games: GameRepository, drawings: DrawingRepository) {
        guard observeTask == nil else { return }
        self.threadIndex = threadIndex
        self.games = games
        self.drawings = drawings
        observeTask = Task { [weak self] in
            for await game in games.observeGame(gameId) {
                guard let self else { return }
                self.game = game
                self.loadDrawings()
            }
        }
    }

    /// Load events for every drawing atom that has a ref we have not fetched yet.
    private func loadDrawings() {
        guard let drawings else { return }
        for atom in atoms where atom.type == .drawing {
            guard let ref = atom.drawingRef,
                  eventsByRef[ref] == nil,
                  !loadingRefs.contains(ref) else { continue }
            loadingRefs.insert(ref)
            Task { [weak self] in
                let events = (try? await drawings.loadEvents(drawingId: ref)) ?? []
                self?.eventsByRef[ref] = events
                self?.loadingRefs.remove(ref)
            }
        }
    }

    func stop() {
        observeTask?.cancel()
        observeTask = nil
    }
}
