import XCTest
@testable import EpycCore

// Golden JSON shapes
private struct TurnVectors: Decodable {
    struct APIRow: Decodable { let n: Int; let threadIndex: Int; let atomIndex: Int; let playerIndex: Int }
    struct Addr: Decodable { let threadIndex: Int; let atomIndex: Int }
    struct PlayerSnap: Decodable {
        let playerIndex: Int
        let nextAtom: Addr?
        let readyToPlay: Bool
        let allAtomsDone: Bool
        let destination: String
    }
    struct Round: Decodable { let states: [[Int]]; let players: [PlayerSnap] }
    struct Sim: Decodable {
        let playersCount: Int
        let atomCountPerThread: Int
        let addressSeqs: [String: [Addr]]
        let rounds: [Round]
    }
    let atomPlayerIndex: [APIRow]
    let simulations: [Sim]
}

final class TurnEngineTests: XCTestCase {

    private func loadVectors() throws -> TurnVectors {
        try Golden.decode(TurnVectors.self, from: "turn_vectors.json")
    }

    func testAtomPlayerIndexMatchesGolden() throws {
        let v = try loadVectors()
        XCTAssertFalse(v.atomPlayerIndex.isEmpty)
        for row in v.atomPlayerIndex {
            let got = TurnEngine.atomPlayerIndex(
                AtomAddress(threadIndex: row.threadIndex, atomIndex: row.atomIndex),
                playersCount: row.n)
            XCTAssertEqual(got, row.playerIndex,
                "atomPlayerIndex(n=\(row.n), t=\(row.threadIndex), a=\(row.atomIndex))")
        }
    }

    func testPlayerAtomAddressesMatchGolden() throws {
        let v = try loadVectors()
        for sim in v.simulations {
            let n = sim.playersCount
            for (key, expected) in sim.addressSeqs {
                let p = Int(key)!
                let got = TurnEngine.playerAtomAddresses(playerIndex: p, playersCount: n)
                XCTAssertEqual(got.count, expected.count, "addr seq length n=\(n) p=\(p)")
                for (i, e) in expected.enumerated() {
                    XCTAssertEqual(got[i].threadIndex, e.threadIndex)
                    XCTAssertEqual(got[i].atomIndex, e.atomIndex)
                }
            }
        }
    }

    /// Rebuild threads from a golden state matrix (atom type derived by index parity).
    private func threads(from states: [[Int]]) -> [GameThread] {
        states.map { atomStates in
            let atoms = atomStates.enumerated().map { (i, s) in
                GameAtom(type: i % 2 == 0 ? .drawing : .guess,
                         state: GameAtomState(rawValue: s)!)
            }
            return GameThread(word: "word", gameAtoms: atoms)
        }
    }

    func testGetNextAtomAndDestinationAcrossFullSimulations() throws {
        let v = try loadVectors()
        var rounds = 0
        for sim in v.simulations {
            let n = sim.playersCount
            let usersOrder = (0..<n).map { "u\($0)" }
            for round in sim.rounds {
                rounds += 1
                let threads = threads(from: round.states)
                for snap in round.players {
                    let uid = "u\(snap.playerIndex)"
                    let next = TurnEngine.getNextAtom(threads: threads, usersOrder: usersOrder, userId: uid)

                    XCTAssertEqual(next.readyToPlay, snap.readyToPlay,
                        "ready n=\(n) p=\(snap.playerIndex) states=\(round.states)")
                    XCTAssertEqual(next.allAtomsDone, snap.allAtomsDone,
                        "allDone n=\(n) p=\(snap.playerIndex)")
                    if let e = snap.nextAtom {
                        XCTAssertEqual(next.address?.threadIndex, e.threadIndex)
                        XCTAssertEqual(next.address?.atomIndex, e.atomIndex)
                    } else {
                        XCTAssertNil(next.address)
                    }

                    let dest = GameNavigation.destination(
                        state: .started, threads: threads, usersOrder: usersOrder, userId: uid)
                    XCTAssertEqual(dest.rawValue, snap.destination,
                        "destination n=\(n) p=\(snap.playerIndex) states=\(round.states)")
                }
            }
        }
        XCTAssertGreaterThan(rounds, 0)
    }

    func testBuildEmptyThreadsShape() {
        for n in 2...5 {
            let threads = TurnEngine.buildEmptyThreads(playerCount: n, words: Words.pick(count: n))
            XCTAssertEqual(threads.count, n)
            for t in threads {
                XCTAssertEqual(t.gameAtoms.count, n + 1)
                for (i, a) in t.gameAtoms.enumerated() {
                    XCTAssertEqual(a.type, i % 2 == 0 ? .drawing : .guess)
                    XCTAssertEqual(a.state, .notStarted)
                }
            }
        }
    }

    func testWordListCount() {
        // Faithful copy of src/providers/words/words.ts (121 entries, incl. intentional
        // duplicates such as "an apple" and "a bed").
        XCTAssertEqual(Words.easyWords.count, 121)
    }

    func testCreatedStateRoutesToWaitingRoom() {
        let dest = GameNavigation.destination(state: .created, threads: [], usersOrder: [], userId: "x")
        XCTAssertEqual(dest, .waitingRoom)
    }
}
