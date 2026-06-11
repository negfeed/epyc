import Foundation
import FirebaseFirestore
import EpycCore

/// Owns Firestore I/O for drawings. Events live in a subcollection ordered by a
/// monotonic sequence number, mirroring the legacy append-by-index list.
struct DrawingRepository {

    /// Creates an empty drawing document and returns its id.
    func createDrawing(authorUid: String) async throws -> String {
        let ref = FS.drawings.document()
        try await ref.setData([
            "createdAtMs": Date().timeIntervalSince1970 * 1000,
            "authorUid": authorUid
        ])
        return ref.documentID
    }

    /// Appends an event at a specific sequence index (doc id = zero-agnostic seq).
    func appendEvent(drawingId: String, seq: Int, event: DrawingEvent) async throws {
        var data: [String: Any] = ["type": event.type.rawValue, "ts": event.ts]
        if let p = event.pathName { data["pathName"] = p }
        if let x = event.x { data["x"] = x }
        if let y = event.y { data["y"] = y }
        try await FS.drawingEvents(drawingId).document(String(format: "%08d", seq)).setData(data)
    }

    /// Loads all events once (used to seed a recording canvas re-entry).
    func loadEvents(drawingId: String) async throws -> [DrawingEvent] {
        let snapshot = try await FS.drawingEvents(drawingId).order(by: FieldPath.documentID()).getDocuments()
        return snapshot.documents.compactMap { Self.decode($0.data()) }
    }

    /// Streams events in order for live replay.
    func observeEvents(drawingId: String) -> AsyncStream<[DrawingEvent]> {
        snapshotStream { handler in
            FS.drawingEvents(drawingId)
                .order(by: FieldPath.documentID())
                .addSnapshotListener { snapshot, error in
                    if let error { handler(.failure(error)); return }
                    guard let snapshot else { return }
                    handler(.success(snapshot.documents.compactMap { Self.decode($0.data()) }))
                }
        }
    }

    private static func decode(_ data: [String: Any]) -> DrawingEvent? {
        guard let typeStr = data["type"] as? String,
              let type = DrawingEventType(rawValue: typeStr),
              let ts = data["ts"] as? Double else { return nil }
        return DrawingEvent(type: type,
                            ts: ts,
                            pathName: data["pathName"] as? String,
                            x: data["x"] as? Double,
                            y: data["y"] as? Double)
    }
}
