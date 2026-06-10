import Foundation
import EpycCore

// Wire DTOs: the Firestore game document keeps threads/gameAtoms as index-keyed
// maps (see MIGRATION_PLAN.md §3). These Codable types map that wire shape to/from
// the ordered-array domain models in EpycCore.

struct GameUserDoc: Codable {
    var displayName: String
    var photoURL: String?
    var joined: Bool
}

struct AtomDoc: Codable {
    var type: Int
    var state: Int
    var drawingRef: String?
    var guess: String?
    var authorUid: String?
}

struct ThreadDoc: Codable {
    var word: String
    var gameAtoms: [String: AtomDoc]?
}

struct GameDoc: Codable {
    var createdAtMs: Double
    var state: Int
    var creatorUid: String
    var players: [String]
    var usersOrder: [String]?
    var users: [String: GameUserDoc]?
    var threads: [String: ThreadDoc]?
}

extension Array where Element == (key: String, value: Any) {}

// Sort an index-keyed map ("0","1",…) into an ordered array.
private func ordered<V>(_ map: [String: V]?) -> [(Int, V)] {
    (map ?? [:])
        .compactMap { k, v in Int(k).map { ($0, v) } }
        .sorted { $0.0 < $1.0 }
}

extension GameDoc {
    func toDomain(id: String) -> Game {
        let users = (self.users ?? [:]).reduce(into: [String: GameUser]()) { acc, kv in
            acc[kv.key] = GameUser(uid: kv.key,
                                   displayName: kv.value.displayName,
                                   photoURL: kv.value.photoURL,
                                   joined: kv.value.joined)
        }
        let threads: [GameThread] = ordered(self.threads).map { _, t in
            let atoms: [GameAtom] = ordered(t.gameAtoms).map { _, a in
                GameAtom(type: GameAtomType(rawValue: a.type) ?? .drawing,
                         state: GameAtomState(rawValue: a.state) ?? .notStarted,
                         drawingRef: a.drawingRef,
                         guess: a.guess,
                         authorUid: a.authorUid)
            }
            return GameThread(word: t.word, gameAtoms: atoms)
        }
        return Game(id: id,
                    createdAtMs: createdAtMs,
                    state: GameState(rawValue: state) ?? .created,
                    creatorUid: creatorUid,
                    players: players,
                    usersOrder: usersOrder ?? [],
                    users: users,
                    threads: threads)
    }
}

extension GameThread {
    /// Encode back to the index-keyed Firestore map shape (used on game start).
    func toWireMap() -> [String: Any] {
        var atoms: [String: Any] = [:]
        for (i, a) in gameAtoms.enumerated() {
            var m: [String: Any] = ["type": a.type.rawValue, "state": a.state.rawValue]
            if let d = a.drawingRef { m["drawingRef"] = d }
            if let g = a.guess { m["guess"] = g }
            if let au = a.authorUid { m["authorUid"] = au }
            atoms[String(i)] = m
        }
        return ["word": word, "gameAtoms": atoms]
    }
}
