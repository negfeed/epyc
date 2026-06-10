import Foundation
import FirebaseFirestore

/// Centralized Firestore collection/document references and small helpers.
enum FS {
    static var db: Firestore { Firestore.firestore() }

    static var users: CollectionReference { db.collection("users") }
    static func user(_ uid: String) -> DocumentReference { users.document(uid) }

    static var games: CollectionReference { db.collection("games") }
    static func game(_ id: String) -> DocumentReference { games.document(id) }

    static var drawings: CollectionReference { db.collection("drawings") }
    static func drawing(_ id: String) -> DocumentReference { drawings.document(id) }
    static func drawingEvents(_ id: String) -> CollectionReference { drawing(id).collection("events") }
}

/// Bridges a Firestore snapshot listener to an `AsyncStream`, removing the
/// listener when the consumer's task is cancelled.
func snapshotStream<T>(
    _ attach: @escaping (@escaping (Result<T, Error>) -> Void) -> ListenerRegistration
) -> AsyncStream<T> {
    AsyncStream { continuation in
        let registration = attach { result in
            if case let .success(value) = result { continuation.yield(value) }
        }
        continuation.onTermination = { _ in registration.remove() }
    }
}
