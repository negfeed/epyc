import 'package:cloud_firestore/cloud_firestore.dart';

import '../../models/drawing_event.dart';

/// Firestore-backed port of `src/providers/drawing-model/drawing-model.ts`.
///
/// Schema: `drawings/{drawingId}` with an ordered `events` subcollection. Each
/// event carries a monotonic `seq` for replay ordering (replaces the RTDB
/// numeric-index list).
class DrawingRepository {
  DrawingRepository(this._db);

  final FirebaseFirestore _db;

  CollectionReference<Map<String, dynamic>> get _drawings =>
      _db.collection('drawings');

  CollectionReference<Map<String, dynamic>> _events(String drawingId) =>
      _drawings.doc(drawingId).collection('events');

  /// Port of `createInstance`: creates an empty drawing and returns its id.
  Future<String> createInstance() async {
    final ref = _drawings.doc();
    await ref.set({'createdMs': DateTime.now().millisecondsSinceEpoch});
    return ref.id;
  }

  /// Appends a drawing event. Port of `DrawingEventList.storeDrawingEvent`.
  /// The [seq] preserves recording order on read-back.
  Future<void> appendEvent(String drawingId, DrawingEvent event, int seq) {
    final map = event.toMap()..['seq'] = seq;
    return _events(drawingId).add(map);
  }

  /// Streams all events for a drawing in recording order. Port of
  /// `loadDrawingEvents`, used by the replaying canvas.
  Stream<List<DrawingEvent>> watchEvents(String drawingId) => _events(drawingId)
      .orderBy('seq')
      .snapshots()
      .map((q) => q.docs.map((d) => DrawingEvent.fromMap(d.data())).toList());

  /// One-shot read of all events (for results playback that does not need a
  /// live subscription).
  Future<List<DrawingEvent>> fetchEvents(String drawingId) async {
    final q = await _events(drawingId).orderBy('seq').get();
    return q.docs.map((d) => DrawingEvent.fromMap(d.data())).toList();
  }
}
