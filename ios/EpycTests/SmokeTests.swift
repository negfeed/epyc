import XCTest
import EpycCore
@testable import Epyc

/// App-target smoke tests. The exhaustive parity tests live in the EpycCore package
/// (`swift test` in ios/EpycCore). These confirm the app target links EpycCore and
/// the wire DTO mapping round-trips.
final class SmokeTests: XCTestCase {

    func testWordListLinked() {
        XCTAssertEqual(Words.easyWords.count, 121)
    }

    func testGameDocMapsToDomain() {
        let doc = GameDoc(
            createdAtMs: 1,
            state: GameState.started.rawValue,
            creatorUid: "u0",
            players: ["u0", "u1"],
            usersOrder: ["u0", "u1"],
            users: ["u0": GameUserDoc(displayName: "A", photoURL: nil, joined: true)],
            threads: [
                "0": ThreadDoc(word: "a cat", gameAtoms: [
                    "0": AtomDoc(type: GameAtomType.drawing.rawValue, state: GameAtomState.done.rawValue, drawingRef: "d1", guess: nil, authorUid: "u0"),
                    "1": AtomDoc(type: GameAtomType.guess.rawValue, state: GameAtomState.notStarted.rawValue, drawingRef: nil, guess: nil, authorUid: nil)
                ])
            ])
        let game = doc.toDomain(id: "g1")
        XCTAssertEqual(game.id, "g1")
        XCTAssertEqual(game.threads.count, 1)
        XCTAssertEqual(game.threads[0].gameAtoms.count, 2)
        XCTAssertEqual(game.threads[0].gameAtoms[0].drawingRef, "d1")
        XCTAssertEqual(game.threads[0].gameAtoms[0].type, .drawing)
        XCTAssertEqual(game.threads[0].gameAtoms[1].type, .guess)
    }
}
