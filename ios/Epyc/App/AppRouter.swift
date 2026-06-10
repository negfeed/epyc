import Foundation
import SwiftUI
import EpycCore

/// Navigation routes (parameters carried inline, like the legacy NavParams).
enum Route: Hashable {
    case waitingRoom(gameId: String)
    case draw(gameId: String, threadIndex: Int, atomIndex: Int, word: String)
    case guess(gameId: String, threadIndex: Int, atomIndex: Int, drawingKey: String)
    case waitTurn(gameId: String)
    case waitGameToEnd(gameId: String)
    case gameResults(gameId: String)
    case threadResults(gameId: String, threadIndex: Int)

    /// The screen "kind" used to decide whether navigation actually changed
    /// (mirrors `sourcePageName != navigationTarget.pageName` in the legacy controller).
    var kind: Destination? {
        switch self {
        case .waitingRoom: return .waitingRoom
        case .draw: return .draw
        case .guess: return .guess
        case .waitTurn: return .waitTurn
        case .waitGameToEnd: return .waitGameToEnd
        case .gameResults: return .gameResults
        case .threadResults: return .gameResults
        }
    }
}

/// Central state-driven router — the SwiftUI analogue of `GameNavigationController`.
/// It observes a game document and pushes the correct screen for the player's state.
@MainActor
final class AppRouter: ObservableObject {
    @Published var path: [Route] = []

    private let games: GameRepository
    private let auth: AuthService
    private var observeTask: Task<Void, Never>?
    private var didJoinOnLeaveWaitingRoom = false

    init(games: GameRepository, auth: AuthService) {
        self.games = games
        self.auth = auth
    }

    /// Entry from Home (New Game / open game).
    func enterGame(_ gameId: String) {
        path = [.waitingRoom(gameId: gameId)]
        observe(gameId: gameId, from: .waitingRoom)
    }

    /// The screen that currently owns the observation. Used so a disappearing screen
    /// can't cancel the observation a newly-appeared screen just started (SwiftUI may
    /// fire the new view's `onAppear` before the old view's `onDisappear`).
    private var currentSource: Destination?

    /// Called by each game screen on appear so the router keeps driving navigation.
    func observe(gameId: String, from source: Destination) {
        currentSource = source
        observeTask?.cancel()
        observeTask = Task { [weak self] in
            guard let self else { return }
            for await game in self.games.observeGame(gameId) {
                guard let uid = self.auth.user?.uid else { continue }
                let dest = GameNavigation.destination(
                    state: game.state, threads: game.threads,
                    usersOrder: game.usersOrder, userId: uid)
                guard let route = self.route(for: dest, game: game, uid: uid) else { continue }
                if route.kind != source {
                    self.push(route)
                    break
                }
            }
        }
    }

    /// Stop observing on behalf of a specific screen. No-op if another screen has
    /// already taken over observation (prevents the onAppear/onDisappear race from
    /// killing the new screen's observation).
    func stopObserving(from source: Destination) {
        guard currentSource == source else { return }
        observeTask?.cancel()
        observeTask = nil
        currentSource = nil
    }

    /// Unconditionally stop (used when leaving the game flow entirely).
    func stopObserving() {
        observeTask?.cancel()
        observeTask = nil
        currentSource = nil
    }

    func leaveGame() {
        stopObserving()
        path.removeAll()
    }

    private func push(_ route: Route) {
        // Game Results is terminal: collapse the in-game stack to [results] so the
        // system Back button returns Home instead of popping into a now-finished
        // game screen (whose observer would immediately re-push results — a bounce).
        if case .gameResults = route {
            if let last = path.last, case .gameResults = last { return }
            path = [route]
            return
        }
        // Otherwise push the next destination (single-screen forward).
        if let last = path.last, last.kind == route.kind { return }
        path.append(route)
    }

    /// Maps a `Destination` to a concrete `Route` with parameters (ports the param
    /// derivation in getNavigationTargetFromGameState).
    private func route(for dest: Destination, game: Game, uid: String) -> Route? {
        switch dest {
        case .waitingRoom:
            return .waitingRoom(gameId: game.id)
        case .waitTurn:
            return .waitTurn(gameId: game.id)
        case .waitGameToEnd:
            return .waitGameToEnd(gameId: game.id)
        case .gameResults:
            return .gameResults(gameId: game.id)
        case .draw:
            let next = TurnEngine.getNextAtom(threads: game.threads, usersOrder: game.usersOrder, userId: uid)
            guard let addr = next.address else { return nil }
            let word = GameNavigation.drawWord(threads: game.threads, address: addr) ?? ""
            return .draw(gameId: game.id, threadIndex: addr.threadIndex, atomIndex: addr.atomIndex, word: word)
        case .guess:
            let next = TurnEngine.getNextAtom(threads: game.threads, usersOrder: game.usersOrder, userId: uid)
            guard let addr = next.address,
                  let drawingKey = GameNavigation.guessDrawingRef(threads: game.threads, address: addr)
            else { return nil }
            return .guess(gameId: game.id, threadIndex: addr.threadIndex, atomIndex: addr.atomIndex, drawingKey: drawingKey)
        }
    }
}
