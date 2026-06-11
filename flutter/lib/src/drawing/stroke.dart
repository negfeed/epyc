import 'package:flutter/material.dart';

import '../models/drawing_event.dart';
import 'drawing_mode.dart';

/// One finger stroke — the Flutter analogue of a paper.js `Path`.
///
/// In the original `drawing-canvas.ts` each finger maps to a `Path` whose
/// `strokeColor` / `strokeWidth` are fixed at creation time based on the
/// drawing mode:
///   * draw  -> black, width `0.01 * sideWidth`, round cap
///   * erase -> white, width `0.03 * sideWidth`, round cap
///
/// Here we keep the points in normalized 0..1 space so the same stroke renders
/// identically at any canvas size (recording and replay can differ in pixels
/// but never in geometry). The pixel width is derived from [side] at paint
/// time, mirroring the `0.01 * sideWidth` / `0.03 * sideWidth` formulas.
class Stroke {
  Stroke(this.mode) : points = <NormalizedPoint>[];

  final DrawingMode mode;
  final List<NormalizedPoint> points;

  /// Normalized stroke width fractions, matching paper.js
  /// `0.01 * sideWidth` (draw) and `0.03 * sideWidth` (erase).
  static const double drawWidthFraction = 0.01;
  static const double eraseWidthFraction = 0.03;

  void add(NormalizedPoint point) => points.add(point);

  bool get isEmpty => points.isEmpty;

  /// Pixel stroke width for a square canvas of the given [side] length.
  double strokeWidthFor(double side) =>
      (mode == DrawingMode.erase ? eraseWidthFraction : drawWidthFraction) *
      side;

  /// Erase strokes paint opaque white over existing ink, exactly like the
  /// paper.js erase path (`strokeColor: 'white'`). Draw strokes are black.
  Color get color =>
      mode == DrawingMode.erase ? Colors.white : Colors.black;
}
