import Foundation
import FirebaseFirestore
import EpycCore

/// Owns Firestore I/O for the `users` collection (ports user-model.ts profile + check-in).
struct UserRepository {

    /// Upserts the signed-in user's profile (called on first sign-in / each launch).
    func upsertProfile(_ info: AuthUserInfo) async throws {
        try await FS.user(info.uid).setData([
            "displayName": info.displayName,
            "photoURL": info.photoURL as Any,
            "lastCheckinMs": Date().timeIntervalSince1970 * 1000
        ], merge: true)
    }

    /// Updates the last check-in timestamp (Home onAppear).
    func checkIn(uid: String) async throws {
        try await FS.user(uid).setData([
            "lastCheckinMs": Date().timeIntervalSince1970 * 1000
        ], merge: true)
    }
}
