import Foundation

// MARK: - Enums (integer raw values preserved from the legacy TypeScript so the
// same values round-trip through Firestore and the ported logic is identical).

public enum GameState: Int, Codable, Sendable, CaseIterable {
    case created = 1
    case started = 2
    case abandoned = 3
    case finished = 4
}

public enum GameAtomType: Int, Codable, Sendable {
    case drawing = 1
    case guess = 2
}

public enum GameAtomState: Int, Codable, Sendable {
    case notStarted = 1
    case started = 2
    case done = 3
}

// MARK: - Domain models (mirror the Firestore contract in MIGRATION_PLAN.md §3)

public struct GameUser: Codable, Sendable, Hashable, Identifiable {
    public var uid: String
    public var displayName: String
    public var photoURL: String?
    public var joined: Bool

    public init(uid: String, displayName: String, photoURL: String? = nil, joined: Bool = false) {
        self.uid = uid
        self.displayName = displayName
        self.photoURL = photoURL
        self.joined = joined
    }

    public var id: String { uid }
}

public struct GameAtom: Codable, Sendable, Hashable {
    public var type: GameAtomType
    public var state: GameAtomState
    public var drawingRef: String?
    public var guess: String?
    public var authorUid: String?

    public init(type: GameAtomType,
                state: GameAtomState = .notStarted,
                drawingRef: String? = nil,
                guess: String? = nil,
                authorUid: String? = nil) {
        self.type = type
        self.state = state
        self.drawingRef = drawingRef
        self.guess = guess
        self.authorUid = authorUid
    }
}

public struct GameThread: Codable, Sendable, Hashable {
    public var word: String
    public var gameAtoms: [GameAtom]

    public init(word: String, gameAtoms: [GameAtom]) {
        self.word = word
        self.gameAtoms = gameAtoms
    }
}

public struct Game: Codable, Sendable, Hashable, Identifiable {
    public var id: String
    public var createdAtMs: Double
    public var state: GameState
    public var creatorUid: String
    public var players: [String]
    public var usersOrder: [String]
    public var users: [String: GameUser]
    public var threads: [GameThread]

    public init(id: String,
                createdAtMs: Double,
                state: GameState,
                creatorUid: String,
                players: [String] = [],
                usersOrder: [String] = [],
                users: [String: GameUser] = [:],
                threads: [GameThread] = []) {
        self.id = id
        self.createdAtMs = createdAtMs
        self.state = state
        self.creatorUid = creatorUid
        self.players = players
        self.usersOrder = usersOrder
        self.users = users
        self.threads = threads
    }
}

// MARK: - Drawing events (flat Firestore shape: type, ts, pathName, x, y)

public enum DrawingEventType: String, Codable, Sendable {
    case point
    case erase
    case undo
    case redo
}

public struct DrawingEvent: Codable, Sendable, Hashable {
    public var type: DrawingEventType
    public var ts: Double
    public var pathName: String?
    public var x: Double?
    public var y: Double?

    public init(type: DrawingEventType, ts: Double, pathName: String? = nil, x: Double? = nil, y: Double? = nil) {
        self.type = type
        self.ts = ts
        self.pathName = pathName
        self.x = x
        self.y = y
    }
}

// MARK: - Address types

public struct AtomAddress: Codable, Sendable, Hashable {
    public var threadIndex: Int
    public var atomIndex: Int
    public init(threadIndex: Int, atomIndex: Int) {
        self.threadIndex = threadIndex
        self.atomIndex = atomIndex
    }
}

public struct NextAtom: Sendable, Equatable {
    public var address: AtomAddress?
    public var readyToPlay: Bool
    public var allAtomsDone: Bool
    public init(address: AtomAddress?, readyToPlay: Bool, allAtomsDone: Bool) {
        self.address = address
        self.readyToPlay = readyToPlay
        self.allAtomsDone = allAtomsDone
    }
}
