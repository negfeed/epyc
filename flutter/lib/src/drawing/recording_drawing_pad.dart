import 'package:flutter/material.dart';

import '../models/drawing_event.dart';
import '../theme/app_theme.dart';
import 'drawing_mode.dart';
import 'drawing_painter.dart';
import 'stroke.dart';

/// A self-contained recording surface: a Draw/Erase + Undo/Redo control bar
/// above a square canvas that captures multi-touch strokes.
///
/// Port of `recording-drawing-canvas.ts` + `drawing-control-bar.ts`/`.html`.
///
/// Every recorded event is reported through [onPersistEvent] together with a
/// monotonically increasing `seq` (starting at 0), so the caller can persist
/// the time-series to Firestore. [onContentChanged] fires `true` the first time
/// the drawing contains real content.
class RecordingDrawingPad extends StatefulWidget {
  const RecordingDrawingPad({
    super.key,
    required this.onPersistEvent,
    this.onContentChanged,
  });

  /// Called for every recorded event with its monotonic sequence index.
  final void Function(DrawingEvent event, int seq) onPersistEvent;

  /// Fires `true` the first time real content exists on the canvas.
  final ValueChanged<bool>? onContentChanged;

  @override
  State<RecordingDrawingPad> createState() => _RecordingDrawingPadState();
}

/// Per-finger tracking state, mirroring `FingerState` in the original.
class _FingerState {
  _FingerState({
    required this.pathName,
    required this.mode,
    required this.lastProcessed,
  });

  final String pathName;
  final DrawingMode mode;

  /// Last point (pixels) that was actually recorded for this finger; used for
  /// the minimum-processing-distance throttle.
  Offset lastProcessed;
}

class _RecordingDrawingPadState extends State<RecordingDrawingPad> {
  /// Manhattan/Euclidean throttle threshold in logical pixels.
  /// Matches `MINIMUM_PROCESSING_DISTANCE = 6`.
  static const double _minimumProcessingDistance = 6;

  DrawingMode _mode = DrawingMode.draw;

  /// Active strokes keyed by pathName (one per finger currently down).
  final Map<String, Stroke> _activeStrokes = <String, Stroke>{};

  /// Active finger states keyed by pathName.
  final Map<String, _FingerState> _fingers = <String, _FingerState>{};

  /// Completed + active strokes in insertion order (the undo stack), and the
  /// redo stack of strokes that were undone. These mirror the paper.js
  /// `undoStack` / `redoStack` of `Path`s.
  final List<Stroke> _undoStack = <Stroke>[];
  final List<Stroke> _redoStack = <Stroke>[];

  /// All strokes currently visible, in paint order. Kept in sync with the undo
  /// stack but exposed separately so the painter has a stable list to render.
  final List<Stroke> _visibleStrokes = <Stroke>[];

  int _nextSeq = 0;
  bool _contentReported = false;

  double _side = 0;

  bool get _undoEnabled => _undoStack.isNotEmpty;
  bool get _redoEnabled => _redoStack.isNotEmpty;

  // ---------------------------------------------------------------------------
  // Coordinate helpers
  // ---------------------------------------------------------------------------

  NormalizedPoint _normalize(Offset pixel) =>
      NormalizedPoint(pixel.dx / _side, pixel.dy / _side);

  /// Euclidean distance squared, used for the throttle (matches the original's
  /// `isTouchBeyondMinimumProcessingDistance`).
  bool _beyondMinimumDistance(Offset last, Offset current) {
    final dx = last.dx - current.dx;
    final dy = last.dy - current.dy;
    return (dx * dx + dy * dy) >
        (_minimumProcessingDistance * _minimumProcessingDistance);
  }

  // ---------------------------------------------------------------------------
  // Event persistence
  // ---------------------------------------------------------------------------

  void _persist(DrawingEvent event) {
    widget.onPersistEvent(event, _nextSeq);
    _nextSeq++;
  }

  void _reportContent() {
    if (!_contentReported) {
      _contentReported = true;
      widget.onContentChanged?.call(true);
    }
  }

  /// Records a draw/erase point for [pathName], creating the stroke on first
  /// point. Mirrors `drawPath` + `storeAndProcessDrawingEvent`.
  void _recordPoint(String pathName, DrawingMode mode, Offset pixel) {
    final normalized = _normalize(pixel);
    final now = DateTime.now().millisecondsSinceEpoch;

    var stroke = _activeStrokes[pathName];
    if (stroke == null) {
      stroke = Stroke(mode);
      _activeStrokes[pathName] = stroke;
      _undoStack.add(stroke);
      _visibleStrokes.add(stroke);
      // Starting a new stroke invalidates the redo history (paper.js clears
      // redoStack whenever a fresh path is created).
      _redoStack.clear();
    }
    stroke.add(normalized);

    final DrawingEvent event = mode == DrawingMode.erase
        ? EraseDrawingEvent(
            timestamp: now, pathName: pathName, point: normalized)
        : PointDrawingEvent(
            timestamp: now, pathName: pathName, point: normalized);
    _persist(event);
    _reportContent();
  }

  // ---------------------------------------------------------------------------
  // Pointer handling — each Flutter pointer id is a stable finger id, used
  // directly as the pathName (replaces the TouchEvent permutation matching).
  // ---------------------------------------------------------------------------

  void _onPointerDown(PointerDownEvent event) {
    if (_side <= 0) return;
    final pathName = event.pointer.toString();
    final pixel = event.localPosition;
    final mode = _mode;

    setState(() {
      _fingers[pathName] = _FingerState(
        pathName: pathName,
        mode: mode,
        lastProcessed: pixel,
      );
      _recordPoint(pathName, mode, pixel);
    });
  }

  void _onPointerMove(PointerMoveEvent event) {
    final pathName = event.pointer.toString();
    final finger = _fingers[pathName];
    if (finger == null) return;
    final pixel = event.localPosition;

    if (_beyondMinimumDistance(finger.lastProcessed, pixel)) {
      setState(() {
        _recordPoint(pathName, finger.mode, pixel);
        finger.lastProcessed = pixel;
      });
    }
  }

  void _onPointerUp(String pathName, Offset pixel) {
    final finger = _fingers[pathName];
    if (finger == null) return;

    setState(() {
      // Record the final point (paper.js records on touchend too), throttle
      // does not apply to the terminating point.
      _recordPoint(pathName, finger.mode, pixel);
      _fingers.remove(pathName);
      _activeStrokes.remove(pathName);
    });
  }

  // ---------------------------------------------------------------------------
  // Undo / redo. Disallowed mid-stroke, exactly like the original
  // (`if (this.fingersState.size > 0) return;`).
  // ---------------------------------------------------------------------------

  void _onUndo() {
    if (_fingers.isNotEmpty || _undoStack.isEmpty) return;
    setState(() {
      final stroke = _undoStack.removeLast();
      _visibleStrokes.remove(stroke);
      _redoStack.add(stroke);
      _persist(UndoDrawingEvent(
          timestamp: DateTime.now().millisecondsSinceEpoch));
    });
  }

  void _onRedo() {
    if (_fingers.isNotEmpty || _redoStack.isEmpty) return;
    setState(() {
      final stroke = _redoStack.removeLast();
      _undoStack.add(stroke);
      _visibleStrokes.add(stroke);
      _persist(RedoDrawingEvent(
          timestamp: DateTime.now().millisecondsSinceEpoch));
    });
  }

  void _onModeChanged(DrawingMode mode) {
    setState(() => _mode = mode);
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _ControlBar(
          mode: _mode,
          undoEnabled: _undoEnabled,
          redoEnabled: _redoEnabled,
          onModeChanged: _onModeChanged,
          onUndo: _onUndo,
          onRedo: _onRedo,
        ),
        LayoutBuilder(
          builder: (context, constraints) {
            // Square canvas: side = parent width (matches the original sizing).
            final side = constraints.maxWidth;
            _side = side;
            return SizedBox(
              width: side,
              height: side,
              child: Listener(
                behavior: HitTestBehavior.opaque,
                onPointerDown: _onPointerDown,
                onPointerMove: _onPointerMove,
                onPointerUp: (e) =>
                    _onPointerUp(e.pointer.toString(), e.localPosition),
                onPointerCancel: (e) =>
                    _onPointerUp(e.pointer.toString(), e.localPosition),
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    border: Border.all(color: AppColors.light),
                  ),
                  child: CustomPaint(
                    size: Size(side, side),
                    painter: DrawingPainter(strokes: _visibleStrokes),
                  ),
                ),
              ),
            );
          },
        ),
      ],
    );
  }
}

/// Draw/Erase segmented control + Undo/Redo buttons.
/// Port of `drawing-control-bar.html`.
class _ControlBar extends StatelessWidget {
  const _ControlBar({
    required this.mode,
    required this.undoEnabled,
    required this.redoEnabled,
    required this.onModeChanged,
    required this.onUndo,
    required this.onRedo,
  });

  final DrawingMode mode;
  final bool undoEnabled;
  final bool redoEnabled;
  final ValueChanged<DrawingMode> onModeChanged;
  final VoidCallback onUndo;
  final VoidCallback onRedo;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      child: Row(
        children: [
          SegmentedButton<DrawingMode>(
            segments: const [
              ButtonSegment<DrawingMode>(
                value: DrawingMode.draw,
                label: Text('Draw'),
                icon: Icon(Icons.brush),
              ),
              ButtonSegment<DrawingMode>(
                value: DrawingMode.erase,
                label: Text('Erase'),
                icon: Icon(Icons.cleaning_services),
              ),
            ],
            selected: <DrawingMode>{mode},
            showSelectedIcon: false,
            onSelectionChanged: (selection) => onModeChanged(selection.first),
          ),
          const Spacer(),
          IconButton(
            icon: const Icon(Icons.undo),
            tooltip: 'Undo',
            onPressed: undoEnabled ? onUndo : null,
          ),
          IconButton(
            icon: const Icon(Icons.redo),
            tooltip: 'Redo',
            onPressed: redoEnabled ? onRedo : null,
          ),
        ],
      ),
    );
  }
}
