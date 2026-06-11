import 'package:cloud_firestore/cloud_firestore.dart';

import '../../models/app_user.dart';

/// Firestore-backed port of `src/providers/user-model/user-model.ts`.
///
/// Schema: `users/{uid}` with a `games` subcollection.
class UserRepository {
  UserRepository(this._db);

  final FirebaseFirestore _db;

  DocumentReference<Map<String, dynamic>> _user(String uid) =>
      _db.collection('users').doc(uid);

  CollectionReference<Map<String, dynamic>> _userGames(String uid) =>
      _user(uid).collection('games');

  /// Port of `loadInstance`/`checkIn`: stamps the last check-in time.
  Future<void> checkIn(String uid) => _user(uid).set(
        {'lastCheckinMs': DateTime.now().millisecondsSinceEpoch},
        SetOptions(merge: true),
      );

  /// Port of `insertJoinGame` (user-model.ts:41-49). Records the join time once
  /// (does not overwrite an existing timestamp).
  Future<void> insertJoinGame(String uid, String gameId) async {
    final ref = _userGames(uid).doc(gameId);
    final snap = await ref.get();
    if (!snap.exists || snap.data()?['joinTimestampMs'] == null) {
      await ref.set(
        UserGameRef(
          gameId: gameId,
          joinTimestampMs: DateTime.now().millisecondsSinceEpoch,
        ).toMap(),
        SetOptions(merge: true),
      );
    }
  }

  /// Port of `queryLastFewGames` (user-model.ts:51-58): the 3 most-recently
  /// joined games, newest first.
  Stream<List<UserGameRef>> watchLastFewGames(String uid) => _userGames(uid)
      .orderBy('joinTimestampMs', descending: true)
      .limit(3)
      .snapshots()
      .map((q) => q.docs
          .map((d) => UserGameRef.fromMap(d.id, d.data()))
          .toList());
}
