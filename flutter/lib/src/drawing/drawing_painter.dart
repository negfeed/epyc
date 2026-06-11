import 'package:flutter/material.dart';

import '../models/drawing_event.dart';
import 'stroke.dart';

/// Renders a list of [Stroke]s onto a square canvas, replacing the paper.js
/// drawing layer + `path.smooth()` from `drawing-canvas.ts`.
///
/// Smoothing: paper.js `Path.smooth()` fits a Catmull-Rom-like spline through
/// the recorded points. We reproduce that by drawing a Catmull-Rom spline,
/// converted segment-by-segment to cubic Béziers (the standard Catmull-Rom ->
/// Bézier conversion). This gives the same soft, continuous curves through
/// every sampled point without any third-party dependency.
///
/// The painter is resolution-independent: points are normalized 0..1 and are
/// only converted to pixels here using [side]. Recording at one pixel size and
/// replaying at another therefore produces identical geometry.
class DrawingPainter extends CustomPainter {
  DrawingPainter({
    required this.strokes,
    this.progress,
    this.showProgressBar = false,
  });

  /// Strokes in paint order (oldest first). Erase strokes paint white on top.
  final List<Stroke> strokes;

  /// Replay progress in [0, 1]; when non-null and [showProgressBar] is true a
  /// thin semi-transparent blue bar is drawn along the bottom edge.
  final double? progress;
  final bool showProgressBar;

  /// Normalized height of the progress bar, matching
  /// `PROGRESS_BAR_NORMALIZED_HEIGHT = 0.03` in the original.
  static const double _progressBarNormalizedHeight = 0.03;

  @override
  void paint(Canvas canvas, Size size) {
    // The canvas is square; use the side length to denormalize.
    final double side = size.width;

    for (final stroke in strokes) {
      _paintStroke(canvas, stroke, side);
    }

    if (showProgressBar && progress != null) {
      _paintProgressBar(canvas, side, progress!.clamp(0.0, 1.0));
    }
  }

  void _paintStroke(Canvas canvas, Stroke stroke, double side) {
    if (stroke.isEmpty) return;

    final paint = Paint()
      ..color = stroke.color
      ..strokeWidth = stroke.strokeWidthFor(side)
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..isAntiAlias = true;

    final points = stroke.points;

    // A single point still renders as a round dot (paper.js draws a dot for a
    // one-segment path with a round cap). Emulate with a tiny filled circle.
    if (points.length == 1) {
      final dot = Paint()
        ..color = stroke.color
        ..style = PaintingStyle.fill
        ..isAntiAlias = true;
      final p = _denormalize(points.first, side);
      canvas.drawCircle(p, stroke.strokeWidthFor(side) / 2, dot);
      return;
    }

    canvas.drawPath(_buildSmoothPath(points, side), paint);
  }

  /// Builds a Catmull-Rom spline through [points] as a [Path] of cubic Béziers.
  Path _buildSmoothPath(List<NormalizedPoint> points, double side) {
    final path = Path();
    final pts = points.map((p) => _denormalize(p, side)).toList();

    path.moveTo(pts.first.dx, pts.first.dy);

    if (pts.length == 2) {
      path.lineTo(pts[1].dx, pts[1].dy);
      return path;
    }

    // Standard Catmull-Rom -> cubic Bézier conversion (tension = 0, the uniform
    // / "centripetal-ish" form paper.js approximates). For each segment between
    // p1 and p2 we use neighbours p0 and p3 to derive the control points.
    for (int i = 0; i < pts.length - 1; i++) {
      final p0 = pts[i == 0 ? 0 : i - 1];
      final p1 = pts[i];
      final p2 = pts[i + 1];
      final p3 = pts[i + 2 < pts.length ? i + 2 : pts.length - 1];

      final c1 = Offset(
        p1.dx + (p2.dx - p0.dx) / 6.0,
        p1.dy + (p2.dy - p0.dy) / 6.0,
      );
      final c2 = Offset(
        p2.dx - (p3.dx - p1.dx) / 6.0,
        p2.dy - (p3.dy - p1.dy) / 6.0,
      );

      path.cubicTo(c1.dx, c1.dy, c2.dx, c2.dy, p2.dx, p2.dy);
    }

    return path;
  }

  void _paintProgressBar(Canvas canvas, double side, double progress) {
    // Mirrors `drawProgress`: a bar spanning the bottom 3% of the canvas,
    // filled from the left to `progress` of the width, in translucent blue.
    final double top = (1 - _progressBarNormalizedHeight) * side;
    final rect = Rect.fromLTRB(0, top, side * progress, side);
    final paint = Paint()
      // paper.js used Color(0, 0, 225, 0.2): blue 225/255, alpha 0.2.
      ..color = const Color.fromRGBO(0, 0, 225, 0.2)
      ..style = PaintingStyle.fill;
    canvas.drawRect(rect, paint);
  }

  Offset _denormalize(NormalizedPoint p, double side) =>
      Offset(p.x * side, p.y * side);

  @override
  bool shouldRepaint(covariant DrawingPainter oldDelegate) {
    // Strokes are mutated in place during recording/replay, so repaint whenever
    // the owning widget rebuilds (it bumps a listenable / setState on change).
    return true;
  }
}
