import Foundation

/// Pure port of `src/providers/game-model/game-model.ts` turn/thread logic.
/// Behavior is asserted against `tools/golden/turn_vectors.json`.
public enum TurnEngine {

    // MARK: Thread construction

    /// One thread per player; each thread has `playerCount + 1` atoms alternating
    /// DRAWING (even index) / GUESS (odd index), all NOT_STARTED.
    public static func buildEmptyThread(playerCount: Int, word: String) -> GameThread {
        var atoms: [GameAtom] = []
        for i in 0..<(playerCount + 1) {
            atoms.append(GameAtom(type: i % 2 == 0 ? .drawing : .guess, state: .notStarted))
        }
        return GameThread(word: word, gameAtoms: atoms)
    }

    /// `playerCount` empty threads. `words` must supply one word per thread.
    public static func buildEmptyThreads(playerCount: Int, words: [String]) -> [GameThread] {
        (0..<playerCount).map { buildEmptyThread(playerCount: playerCount, word: words[$0 % words.count]) }
    }

    // MARK: Rotation

    /// `(threadIndex - atomIndex + n) % n`
    public static func atomPlayerIndex(_ address: AtomAddress, playersCount n: Int) -> Int {
        ((address.threadIndex - address.atomIndex) % n + n) % n
    }

    /// For `i` in `0...playersCount`: `{ thread: (i + playerIndex) % n, atom: i }`.
    public static func playerAtomAddresses(playerIndex: Int, playersCount n: Int) -> [AtomAddress] {
        var result: [AtomAddress] = []
        var i = 0
        while i < n + 1 {
            result.append(AtomAddress(threadIndex: (i + playerIndex) % n, atomIndex: i))
            i += 1
        }
        return result
    }

    // MARK: Next atom

    /// First non-DONE atom along the player's address sequence. `readyToPlay` iff
    /// the previous atom in that thread is DONE; `allAtomsDone` when exhausted.
    public static func getNextAtom(threads: [GameThread], usersOrder: [String], userId: String) -> NextAtom {
        let playerIndex = usersOrder.firstIndex(of: userId) ?? -1
        return getNextAtom(threads: threads, playersCount: usersOrder.count, playerIndex: playerIndex)
    }

    public static func getNextAtom(threads: [GameThread], playersCount n: Int, playerIndex: Int) -> NextAtom {
        let addresses = playerAtomAddresses(playerIndex: playerIndex, playersCount: n)
        for address in addresses {
            let thread = threads[address.threadIndex]
            let atom = thread.gameAtoms[address.atomIndex]
            let prev: GameAtom? = address.atomIndex > 0 ? thread.gameAtoms[address.atomIndex - 1] : nil
            if atom.state != .done {
                let ready = (prev == nil) || (prev?.state == .done)
                return NextAtom(address: address, readyToPlay: ready, allAtomsDone: false)
            }
        }
        return NextAtom(address: nil, readyToPlay: false, allAtomsDone: true)
    }

    // MARK: Completion

    /// True when the last atom of every thread is DONE.
    public static func isGameDone(threads: [GameThread]) -> Bool {
        for thread in threads {
            guard let last = thread.gameAtoms.last, last.state == .done else { return false }
        }
        return true
    }

    /// Deterministic Fisher-Yates-style shuffle used on game start. The legacy code
    /// shuffles with `Math.random()`; production uses `Int.random`. A seeded variant
    /// is provided for tests/reproducibility.
    public static func shuffled(_ users: [String], using generator: inout some RandomNumberGenerator) -> [String] {
        var u = users
        u.shuffle(using: &generator)
        return u
    }
}
