import Foundation
import SwiftUI
import EpycCore

/// State + side effects for the Draw screen (port of the legacy draw page).
///
/// Responsibilities:
/// - Locate the atom at (threadIndex, atomIndex), look up or create its `drawingRef`
///   and load any previously recorded events so the canvas can be re-seeded on re-entry.
/// - Mark the atom `.started`.
/// - Persist each recorded `DrawingEvent` via `DrawingRepository.appendEvent`.
/// - Run a 5-second countdown before finalizing the drawing; tapping again cancels it.
///
/// The shared services (`DIContainer`, `AuthService`) live in the SwiftUI environment,
/// so the View passes them in when invoking effects rather than the VM owning copies.
@MainActor
final class DrawViewModel: ObservableObject {

    // MARK: Inputs
    let gameId: String
    let word: String
    let address: AtomAddress

    // MARK: Published state
    /// The drawing document key (created lazily if the atom has none yet).
    @Published private(set) var drawingKey: String?
    /// Events to seed the recording canvas with on first appearance.
    @Published private(set) var initialEvents: [DrawingEvent] = []
    /// Whether the canvas reports something has been drawn (enables "Done").
    @Published var somethingDrawn = false
    /// Remaining seconds in the finalize countdown (nil when not counting down).
    @Published private(set) var countdownRemaining: Int?
    /// True once the canvas + drawingRef are ready to render.
    @Published private(set) var isPrepared = false
    /// Set once the drawing has been finalized to avoid double-submission.
    @Published private(set) var didFinish = false

    @Published var showLeaveConfirmation = false

    private var didPrepare = false
    private var countdownTask: Task<Void, Never>?

    private static let countdownSeconds = 5

    var isCountingDown: Bool { countdownRemaining != nil }

    init(gameId: String, threadIndex: Int, atomIndex: Int, word: String) {
        self.gameId = gameId
        self.word = word
        self.address = AtomAddress(threadIndex: threadIndex, atomIndex: atomIndex)
    }

    // MARK: - Lifecycle

    /// Look up / create the drawing reference, seed initial events, mark the atom
    /// started. Runs exactly once.
    func prepare(di: DIContainer, auth: AuthService) async {
        guard !didPrepare else { return }
        didPrepare = true

        let uid = auth.user?.uid ?? ""
        do {
            // Read the first emitted game snapshot to inspect the current atom.
            var atom: GameAtom?
            for await game in di.games.observeGame(gameId) {
                atom = currentAtom(in: game)
                break
            }

            let key: String
            if let existing = atom?.drawingRef {
                key = existing
                initialEvents = try await di.drawings.loadEvents(drawingId: existing)
            } else {
                key = try await di.drawings.createDrawing(authorUid: uid)
                try await di.games.setAtomDrawingRef(gameId: gameId, address: address, drawingRef: key)
            }
            drawingKey = key

            try await di.games.setAtomState(gameId: gameId, address: address, state: .started)
            isPrepared = true
        } catch {
            // Prepare won't be retried (guard above); reveal the canvas if we at
            // least obtained a key so the user can keep drawing.
            isPrepared = drawingKey != nil
        }
    }

    private func currentAtom(in game: Game) -> GameAtom? {
        guard address.threadIndex >= 0, address.threadIndex < game.threads.count else { return nil }
        let atoms = game.threads[address.threadIndex].gameAtoms
        guard address.atomIndex >= 0, address.atomIndex < atoms.count else { return nil }
        return atoms[address.atomIndex]
    }

    // MARK: - Event persistence

    /// Persist a recorded canvas event. Called from `RecordingCanvasView.onEvent`.
    func appendEvent(seq: Int, event: DrawingEvent, di: DIContainer) {
        guard let key = drawingKey else { return }
        Task {
            try? await di.drawings.appendEvent(drawingId: key, seq: seq, event: event)
        }
    }

    // MARK: - Countdown / finish

    /// Toggle the finalize countdown. First tap starts it; a second tap cancels.
    func toggleCountdown(di: DIContainer, auth: AuthService) {
        if isCountingDown {
            cancelCountdown()
        } else {
            startCountdown(di: di, auth: auth)
        }
    }

    private func startCountdown(di: DIContainer, auth: AuthService) {
        guard somethingDrawn, !didFinish else { return }
        countdownRemaining = Self.countdownSeconds
        countdownTask?.cancel()
        countdownTask = Task { [weak self] in
            while let remaining = self?.countdownRemaining, remaining > 0 {
                try? await Task.sleep(nanoseconds: 1_000_000_000)
                if Task.isCancelled { return }
                guard let self else { return }
                guard let current = self.countdownRemaining else { return }
                let next = current - 1
                self.countdownRemaining = next
                if next <= 0 {
                    await self.finishDrawing(di: di, auth: auth)
                    return
                }
            }
        }
    }

    private func cancelCountdown() {
        countdownTask?.cancel()
        countdownTask = nil
        countdownRemaining = nil
    }

    private func finishDrawing(di: DIContainer, auth: AuthService) async {
        guard !didFinish else { return }
        countdownTask = nil
        countdownRemaining = nil
        let uid = auth.user?.uid ?? ""
        do {
            try await di.games.finishDrawing(gameId: gameId, address: address, authorUid: uid)
            didFinish = true
        } catch {
            // Allow the user to retry by re-enabling the Done button.
            countdownRemaining = nil
        }
    }

    // MARK: - Navigation

    func confirmLeave() { showLeaveConfirmation = true }

    func onDisappearCleanup() {
        cancelCountdown()
    }
}
