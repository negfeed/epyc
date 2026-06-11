/// Whether the recording pad is laying down ink or erasing it.
///
/// Ported from `DrawingMode` in
/// `src/providers/drawing-controller/drawing-controller.ts`. The original also
/// had an `UNKNOWN` member used as an uninitialized sentinel; the Flutter pad
/// always has a concrete mode, so it is omitted.
enum DrawingMode { draw, erase }
