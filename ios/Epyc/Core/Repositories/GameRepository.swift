import Foundation
import FirebaseFirestore
import EpycCore

/// Owns all Firestore I/O for games. Maps the index-keyed wire shape to/from the
/// ordered-array domain models in EpycCore. Ports `game-model.ts` + the user-side
/// of `user-model.ts` (recent games / join).
struct GameRepository {

    // MARK: Create

    /// Creates a game in the CREATED state with the caller as creator and sole player.
    func createGame(creator: AuthUserInfo) async throws -> String {
        let ref = FS.games.document()
        let data: [String: Any] = [
            "createdAtMs": Date().timeIntervalSince1970 * 1000,
            "state": GameState.created.rawValue,
            "creatorUid": creator.uid,
            "players": [creator.uid],
            "usersOrder": [],
            "users": [
                creator.uid: [
                    "displayName": creator.displayName,
                    "photoURL": creator.photoURL as Any,
                    "joined": true
                ]
            ]
        ]
        try await ref.setData(data)
        return ref.documentID
    }

    // MARK: Observe

    func observeGame(_ id: String) -> AsyncStream<Game> {
        snapshotStream { handler in
            FS.game(id).addSnapshotListener { snapshot, error in
                if let error { handler(.failure(error)); return }
                guard let snapshot, snapshot.exists else { return }
                do {
                    let doc = try snapshot.data(as: GameDoc.self)
                    handler(.success(doc.toDomain(id: id)))
                } catch { handler(.failure(error)) }
            }
        }
    }

    /// Recent games for the home screen: players array-contains uid, newest first.
    func observeRecentGames(uid: String, limit: Int = 3) -> AsyncStream<[Game]> {
        snapshotStream { handler in
            FS.games
                .whereField("players", arrayContains: uid)
                .order(by: "createdAtMs", descending: true)
                .limit(to: limit)
                .addSnapshotListener { snapshot, error in
                    if let error { handler(.failure(error)); return }
                    guard let snapshot else { return }
                    let games: [Game] = snapshot.documents.compactMap { d in
                        (try? d.data(as: GameDoc.self))?.toDomain(id: d.documentID)
                    }
                    handler(.success(games))
                }
        }
    }

    // MARK: Membership (ports waiting-room.ts join/leave + upsert)

    /// Adds a user to the lobby (as a watcher by default) if not already present.
    func upsertGameUser(gameId: String, user: GameUser) async throws {
        try await FS.game(gameId).setData([
            "players": FieldValue.arrayUnion([user.uid]),
            "users": [
                user.uid: [
                    "displayName": user.displayName,
                    "photoURL": user.photoURL as Any,
                    "joined": user.joined
                ]
            ]
        ], merge: true)
    }

    func setJoined(gameId: String, uid: String, joined: Bool) async throws {
        try await FS.game(gameId).updateData([
            "users.\(uid).joined": joined,
            "players": FieldValue.arrayUnion([uid])
        ])
    }

    // MARK: Start (ports GameModel.start — shuffle joined users, build threads)

    func start(gameId: String) async throws {
        let snapshot = try await FS.game(gameId).getDocument()
        let doc = try snapshot.data(as: GameDoc.self)
        let joined = (doc.users ?? [:]).filter { $0.value.joined }.map { $0.key }
        var generator = SystemRandomNumberGenerator()
        let order = TurnEngine.shuffled(joined, using: &generator)
        let words = Words.pick(count: order.count)
        let threads = TurnEngine.buildEmptyThreads(playerCount: order.count, words: words)

        var threadsWire: [String: Any] = [:]
        for (i, t) in threads.enumerated() { threadsWire[String(i)] = t.toWireMap() }

        try await FS.game(gameId).updateData([
            "state": GameState.started.rawValue,
            "usersOrder": order,
            "threads": threadsWire
        ])
    }

    // MARK: Atom writes (ports upsertAtom — granular, dotted field paths)

    func setAtomState(gameId: String, address: AtomAddress, state: GameAtomState) async throws {
        try await FS.game(gameId).updateData([
            "threads.\(address.threadIndex).gameAtoms.\(address.atomIndex).state": state.rawValue
        ])
    }

    func setAtomDrawingRef(gameId: String, address: AtomAddress, drawingRef: String) async throws {
        try await FS.game(gameId).updateData([
            "threads.\(address.threadIndex).gameAtoms.\(address.atomIndex).drawingRef": drawingRef
        ])
    }

    /// Finalize a DRAW atom (state DONE + author).
    func finishDrawing(gameId: String, address: AtomAddress, authorUid: String) async throws {
        try await FS.game(gameId).updateData([
            "threads.\(address.threadIndex).gameAtoms.\(address.atomIndex).state": GameAtomState.done.rawValue,
            "threads.\(address.threadIndex).gameAtoms.\(address.atomIndex).authorUid": authorUid
        ])
    }

    /// Finalize a GUESS atom (guess + state DONE + author).
    func finishGuess(gameId: String, address: AtomAddress, guess: String, authorUid: String) async throws {
        try await FS.game(gameId).updateData([
            "threads.\(address.threadIndex).gameAtoms.\(address.atomIndex).guess": guess,
            "threads.\(address.threadIndex).gameAtoms.\(address.atomIndex).state": GameAtomState.done.rawValue,
            "threads.\(address.threadIndex).gameAtoms.\(address.atomIndex).authorUid": authorUid
        ])
    }
}
