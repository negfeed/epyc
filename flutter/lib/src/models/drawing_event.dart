/// Drawing event model ported from
/// `src/providers/drawing-model/drawing-model.ts`.
///
/// Drawings are stored as an ordered time-series of vector events (NOT raster
/// images). This is the contract that must survive so replays stay faithful.
/// Coordinates are normalized to 0..1 so they are resolution-independent.
///
/// Firestore layout: `drawings/{drawingId}/events/{autoId}` with a `seq` field
/// for ordering (see MIGRATION_PLAN.md §3).
library;

/// A normalized point, each component in [0, 1].
class NormalizedPoint {
  const NormalizedPoint(this.x, this.y);
  final double x;
  final double y;

  Map<String, dynamic> toMap() => {'x': x, 'y': y};

  factory NormalizedPoint.fromMap(Map<String, dynamic> map) =>
      NormalizedPoint((map['x'] as num).toDouble(), (map['y'] as num).toDouble());
}

/// Discriminator stored in the `type` field.
enum DrawingEventType { point, erase, undo, redo }

sealed class DrawingEvent {
  const DrawingEvent({required this.timestamp, this.seq});

  /// Milliseconds since epoch when the event was recorded.
  final int timestamp;

  /// Monotonic sequence index used to order events on read.
  final int? seq;

  DrawingEventType get type;

  Map<String, dynamic> toMap();

  factory DrawingEvent.fromMap(Map<String, dynamic> map) {
    final timestamp = (map['timestamp'] as num).toInt();
    final seq = (map['seq'] as num?)?.toInt();
    switch (map['type'] as String) {
      case 'point':
        return PointDrawingEvent(
          timestamp: timestamp,
          pathName: map['pathName'] as String,
          point: NormalizedPoint(
              (map['x'] as num).toDouble(), (map['y'] as num).toDouble()),
          seq: seq,
        );
      case 'erase':
        return EraseDrawingEvent(
          timestamp: timestamp,
          pathName: map['pathName'] as String,
          point: NormalizedPoint(
              (map['x'] as num).toDouble(), (map['y'] as num).toDouble()),
          seq: seq,
        );
      case 'undo':
        return UndoDrawingEvent(timestamp: timestamp, seq: seq);
      case 'redo':
        return RedoDrawingEvent(timestamp: timestamp, seq: seq);
      default:
        throw ArgumentError('Unknown drawing event type: ${map['type']}');
    }
  }
}

/// A draw point belonging to a stroke identified by [pathName] (finger id).
class PointDrawingEvent extends DrawingEvent {
  const PointDrawingEvent({
    required super.timestamp,
    required this.pathName,
    required this.point,
    super.seq,
  });

  final String pathName;
  final NormalizedPoint point;

  @override
  DrawingEventType get type => DrawingEventType.point;

  @override
  Map<String, dynamic> toMap() => {
        'type': 'point',
        'timestamp': timestamp,
        if (seq != null) 'seq': seq,
        'pathName': pathName,
        'x': point.x,
        'y': point.y,
      };
}

/// An erase point belonging to a stroke identified by [pathName].
class EraseDrawingEvent extends DrawingEvent {
  const EraseDrawingEvent({
    required super.timestamp,
    required this.pathName,
    required this.point,
    super.seq,
  });

  final String pathName;
  final NormalizedPoint point;

  @override
  DrawingEventType get type => DrawingEventType.erase;

  @override
  Map<String, dynamic> toMap() => {
        'type': 'erase',
        'timestamp': timestamp,
        if (seq != null) 'seq': seq,
        'pathName': pathName,
        'x': point.x,
        'y': point.y,
      };
}

class UndoDrawingEvent extends DrawingEvent {
  const UndoDrawingEvent({required super.timestamp, super.seq});

  @override
  DrawingEventType get type => DrawingEventType.undo;

  @override
  Map<String, dynamic> toMap() => {
        'type': 'undo',
        'timestamp': timestamp,
        if (seq != null) 'seq': seq,
      };
}

class RedoDrawingEvent extends DrawingEvent {
  const RedoDrawingEvent({required super.timestamp, super.seq});

  @override
  DrawingEventType get type => DrawingEventType.redo;

  @override
  Map<String, dynamic> toMap() => {
        'type': 'redo',
        'timestamp': timestamp,
        if (seq != null) 'seq': seq,
      };
}
