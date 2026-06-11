import 'dart:async';

import 'package:flutter/material.dart';

import '../models/drawing_event.dart';
import '../theme/app_theme.dart';
import 'drawing_mode.dart';
import 'drawing_painter.dart';
import 'stroke.dart';

/// Replays a recorded drawing — a square canvas that re-draws the time-series
/// of [events] at the original pacing.
///
/// Port of `replaying-drawing-canvas.ts`.
///
/// Timestamps are normalized (first event -> 0, consecutive gaps clamped to
/// <= 1000ms) and the playhead advances by `REPLAY_PERIOD = 33ms` per tick.
/// On each tick every event with normalized timestamp <= playhead is applied.
/// When [events] changes (it may stream in asynchronously) playback restarts.
class ReplayingDrawingPad extends StatefulWidget {
  const ReplayingDrawingPad({
    super.key,
    required this.events,
    this.autoPlay = true,
    this.showProgressBar = true,
  });

  final List<DrawingEvent> events;
  final bool autoPlay;
  final bool showProgressBar;

  @override
  State<ReplayingDrawingPad> createState() => _ReplayingDrawingPadState();
}

class _ReplayingDrawingPadState extends State<ReplayingDrawingPad> {
  /// Matches `MAXIMUM_EVENT_TIME_DIFFERENCE_IN_MILLIS = 1000`.
  static const int _maxGapMillis = 1000;

  /// Matches `REPLAY_PERIOD_IN_MILLIS = 33`.
  static const int _replayPeriodMillis = 33;

  Timer? _timer;

  /// Events with normalized timestamps (first -> 0, gaps clamped).
  List<DrawingEvent> _normalizedEvents = const [];

  /// Index of the next event to apply (events are processed in order).
  int _eventIndex = 0;

  /// Playhead position, in normalized milliseconds.
  int _playheadMillis = 0;

  /// End of the timeline, in normalized milliseconds.
  int _endMillis = 0;

  /// Number of fingers currently touching the replay canvas. The original
  /// advances the playhead faster while touched (counter += 5 vs += 1).
  int _touchCount = 0;

  // Replay reconstruction state ------------------------------------------------

  /// Strokes currently visible, in paint order. Equivalent to the paper.js
  /// drawing layer children.
  final List<Stroke> _visibleStrokes = <Stroke>[];

  /// In-progress strokes keyed by pathName (cleared when replay restarts).
  final Map<String, Stroke> _strokesByPath = <String, Stroke>{};

  /// Undo/redo stacks of strokes, mirroring the recording semantics so that
  /// undo/redo events during replay remove/restore the right stroke.
  final List<Stroke> _undoStack = <Stroke>[];
  final List<Stroke> _redoStack = <Stroke>[];

  double get _progress =>
      _endMillis == 0 ? 1.0 : (_playheadMillis / _endMillis).clamp(0.0, 1.0);

  @override
  void initState() {
    super.initState();
    _prepareAndStart();
  }

  @override
  void didUpdateWidget(covariant ReplayingDrawingPad oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Restart whenever the events list reference changes or its contents differ
    // (events may arrive streamed/async).
    if (!identical(oldWidget.events, widget.events) ||
        oldWidget.events.length != widget.events.length) {
      _prepareAndStart();
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  /// Normalizes timestamps then (re)starts the periodic replayer.
  /// Combines `normalizeDrawingEventsTimestamps` + `initializePeriodicReplayer`
  /// + `startDrawing`.
  void _prepareAndStart() {
    _timer?.cancel();

    // Reset reconstruction state.
    _visibleStrokes.clear();
    _strokesByPath.clear();
    _undoStack.clear();
    _redoStack.clear();
    _eventIndex = 0;
    _playheadMillis = 0;

    _normalizedEvents = _normalizeTimestamps(widget.events);
    _endMillis = _normalizedEvents.isEmpty
        ? 0
        : _normalizedEvents.last.timestamp;

    if (_normalizedEvents.isEmpty) {
      // Nothing to replay; show an empty, completed canvas.
      setState(() {});
      return;
    }

    if (!widget.autoPlay) {
      setState(() {});
      return;
    }

    // Apply any events at t<=0 immediately, then tick.
    _applyDueEvents();
    setState(() {});
    _timer = Timer.periodic(
      const Duration(milliseconds: _replayPeriodMillis),
      (_) => _tick(),
    );
  }

  /// Returns a copy of [events] with timestamps remapped: first event -> 0,
  /// each subsequent gap clamped to <= [_maxGapMillis], accumulated.
  List<DrawingEvent> _normalizeTimestamps(List<DrawingEvent> events) {
    if (events.isEmpty) return const [];
    final result = <DrawingEvent>[];
    int accumulated = 0;
    for (int i = 0; i < events.length; i++) {
      final e = events[i];
      if (i == 0) {
        accumulated = 0;
      } else {
        int gap = e.timestamp - events[i - 1].timestamp;
        if (gap < 0) gap = 0; // guard against out-of-order timestamps
        if (gap > _maxGapMillis) gap = _maxGapMillis;
        accumulated += gap;
      }
      result.add(_withTimestamp(e, accumulated));
    }
    return result;
  }

  /// Rebuilds an event with a new (normalized) timestamp, preserving type/data.
  DrawingEvent _withTimestamp(DrawingEvent e, int timestamp) {
    switch (e) {
      case PointDrawingEvent():
        return PointDrawingEvent(
            timestamp: timestamp, pathName: e.pathName, point: e.point, seq: e.seq);
      case EraseDrawingEvent():
        return EraseDrawingEvent(
            timestamp: timestamp, pathName: e.pathName, point: e.point, seq: e.seq);
      case UndoDrawingEvent():
        return UndoDrawingEvent(timestamp: timestamp, seq: e.seq);
      case RedoDrawingEvent():
        return RedoDrawingEvent(timestamp: timestamp, seq: e.seq);
    }
  }

  void _tick() {
    if (!mounted) return;

    // Advance the playhead. While touched, advance 5 periods per tick (matches
    // the original `replayPeriodCounter += 5`).
    final step = _touchCount == 0 ? 1 : 5;
    _playheadMillis += step * _replayPeriodMillis;

    _applyDueEvents();

    if (_playheadMillis >= _endMillis) {
      _playheadMillis = _endMillis;
      _timer?.cancel();
      _timer = null;
    }

    setState(() {});
  }

  /// Applies every not-yet-applied event whose normalized timestamp is <= the
  /// current playhead, in order. Mirrors `processNextDrawingPeriod`'s inner loop.
  void _applyDueEvents() {
    while (_eventIndex < _normalizedEvents.length &&
        _normalizedEvents[_eventIndex].timestamp <= _playheadMillis) {
      _applyEvent(_normalizedEvents[_eventIndex]);
      _eventIndex++;
    }
  }

  /// Reconstructs the drawing from a single event. Equivalent to
  /// `DrawingCanvas.processDrawingEvent`.
  void _applyEvent(DrawingEvent event) {
    switch (event) {
      case PointDrawingEvent():
        _addPoint(event.pathName, DrawingMode.draw, event.point);
      case EraseDrawingEvent():
        _addPoint(event.pathName, DrawingMode.erase, event.point);
      case UndoDrawingEvent():
        if (_undoStack.isNotEmpty) {
          final stroke = _undoStack.removeLast();
          _visibleStrokes.remove(stroke);
          _redoStack.add(stroke);
        }
      case RedoDrawingEvent():
        if (_redoStack.isNotEmpty) {
          final stroke = _redoStack.removeLast();
          _undoStack.add(stroke);
          _visibleStrokes.add(stroke);
        }
    }
  }

  void _addPoint(String pathName, DrawingMode mode, NormalizedPoint point) {
    var stroke = _strokesByPath[pathName];
    if (stroke == null) {
      stroke = Stroke(mode);
      _strokesByPath[pathName] = stroke;
      _visibleStrokes.add(stroke);
      _undoStack.add(stroke);
      _redoStack.clear();
    }
    stroke.add(point);
  }

  // Touch handling: slow/speed the replay while the user is touching, matching
  // the original `onTouchEvent` touchCount tracking.
  void _onPointerDown(PointerDownEvent _) => _touchCount++;
  void _onPointerUp() {
    if (_touchCount > 0) _touchCount--;
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final side = constraints.maxWidth;
        return SizedBox(
          width: side,
          height: side,
          child: Listener(
            behavior: HitTestBehavior.opaque,
            onPointerDown: _onPointerDown,
            onPointerUp: (_) => _onPointerUp(),
            onPointerCancel: (_) => _onPointerUp(),
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border.all(color: AppColors.light),
              ),
              child: CustomPaint(
                size: Size(side, side),
                painter: DrawingPainter(
                  strokes: _visibleStrokes,
                  progress: _progress,
                  showProgressBar: widget.showProgressBar,
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
