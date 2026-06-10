import Foundation
import SwiftUI
import EpycCore

/// State + side effects for the Guess screen (port of the legacy guess page).
///
/// Responsibilities:
/// - Mark the atom `.started` on appear.
/// - Load the drawing's recorded events so `ReplayCanvasView` can replay them.
/// - Gate submission on a non-empty guess AND the replay having finished.
/// - Persist the guess via `GameRepository.finishGuess`.
///
/// Shared services live in the SwiftUI environment, so the View passes them into
/// the VM's effect methods rather than the VM owning copies.
@MainActor
final class GuessViewModel: ObservableObject {

    // MARK: Inputs
    let gameId: String
    let drawingKey: String
    let address: AtomAddress

    // MARK: Published state
    /// Recorded events to replay; populated in `load`.
    @Published private(set) var events: [DrawingEvent] = []
    /// True once the events have been fetched (so the replay only starts with real data).
    @Published private(set) var loaded = false
    /// True once the replay animation has completed.
    @Published var drawingFinished = false
    /// The user's text guess.
    @Published var guess = ""
    /// Set once the guess has been submitted to avoid double-submission.
    @Published private(set) var didSubmit = false

    @Published var showLeaveConfirmation = false

    private var didLoad = false

    /// Submit is allowed only when there is a non-empty (trimmed) guess and the
    /// drawing replay has finished.
    var canSubmit: Bool {
        !guess.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && drawingFinished
            && !didSubmit
    }

    init(gameId: String, threadIndex: Int, atomIndex: Int, drawingKey: String) {
        self.gameId = gameId
        self.drawingKey = drawingKey
        self.address = AtomAddress(threadIndex: threadIndex, atomIndex: atomIndex)
    }

    // MARK: - Lifecycle

    /// Mark the atom started and load the drawing's events. Runs exactly once.
    func load(di: DIContainer) async {
        guard !didLoad else { return }
        didLoad = true
        defer { loaded = true }
        do {
            try await di.games.setAtomState(gameId: gameId, address: address, state: .started)
            events = try await di.drawings.loadEvents(drawingId: drawingKey)
        } catch {
            events = []
        }
    }

    // MARK: - Submit

    func submit(di: DIContainer, auth: AuthService) {
        guard canSubmit else { return }
        let trimmed = guess.trimmingCharacters(in: .whitespacesAndNewlines)
        let uid = auth.user?.uid ?? ""
        didSubmit = true
        Task { [weak self] in
            guard let self else { return }
            do {
                try await di.games.finishGuess(gameId: self.gameId,
                                               address: self.address,
                                               guess: trimmed,
                                               authorUid: uid)
            } catch {
                // Re-enable submission on failure.
                self.didSubmit = false
            }
        }
    }

    // MARK: - Navigation

    func confirmLeave() { showLeaveConfirmation = true }
}
