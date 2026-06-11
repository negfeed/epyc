import Foundation

/// Where the state-driven router should send a player, ported from
/// `src/providers/game-navigation-controller/game-navigation-controller.ts`.
/// Raw values match the golden vectors' `destination` strings.
public enum Destination: String, Sendable, Equatable {
    case waitingRoom = "WAITING_ROOM"
    case draw = "DRAW"
    case guess = "GUESS"
    case waitTurn = "WAIT_TURN"
    case waitGameToEnd = "WAIT_GAME_TO_END"
    case gameResults = "GAME_RESULTS"
}

public enum GameNavigation {

    /// Pure screen-selection decision. The view layer adds parameters (word /
    /// drawingRef) once the destination is known.
    public static func destination(state: GameState,
                                   threads: [GameThread],
                                   usersOrder: [String],
                                   userId: String) -> Destination {
        if state == .created { return .waitingRoom }
        guard state == .started, usersOrder.contains(userId) else { return .gameResults }
        if TurnEngine.isGameDone(threads: threads) { return .gameResults }

        let next = TurnEngine.getNextAtom(threads: threads, usersOrder: usersOrder, userId: userId)
        if next.allAtomsDone { return .waitGameToEnd }
        if !next.readyToPlay { return .waitTurn }
        if let addr = next.address {
            let atom = threads[addr.threadIndex].gameAtoms[addr.atomIndex]
            return atom.type == .drawing ? .draw : .guess
        }
        return .gameResults
    }

    /// The word a DRAW atom should show: the thread word for atom 0, otherwise the
    /// previous atom's guess. (Ported from getNavigationTargetFromGameState.)
    public static func drawWord(threads: [GameThread], address: AtomAddress) -> String? {
        let thread = threads[address.threadIndex]
        if address.atomIndex == 0 { return thread.word }
        return thread.gameAtoms[address.atomIndex - 1].guess
    }

    /// The drawing a GUESS atom should replay: the previous atom's drawingRef.
    public static func guessDrawingRef(threads: [GameThread], address: AtomAddress) -> String? {
        guard address.atomIndex > 0 else { return nil }
        return threads[address.threadIndex].gameAtoms[address.atomIndex - 1].drawingRef
    }
}
