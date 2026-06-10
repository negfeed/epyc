import Foundation

/// Pure geometry/timeline math ported from the legacy drawing components:
///   - `src/components/drawing-canvas/drawing-canvas.ts`        (normalize, stroke widths)
///   - `src/components/recording-drawing-canvas/...`            (min processing distance)
///   - `src/components/replaying-drawing-canvas/...`            (timestamp normalize + replay ticks)
/// Asserted against `tools/golden/drawing_vectors.json`.
public enum DrawingGeometry {

    // Constants from the legacy components.
    public static let maxGapMs: Double = 1000      // MAXIMUM_EVENT_TIME_DIFFERENCE_IN_MILLIS
    public static let replayPeriodMs: Double = 33  // REPLAY_PERIOD_IN_MILLIS
    public static let minProcessingDistancePx: Double = 6
    public static let drawStrokeFraction: Double = 0.01   // strokeWidth = 0.01 * side
    public static let eraseStrokeFraction: Double = 0.03
    public static let progressBarHeightFraction: Double = 0.03

    public struct Point: Equatable, Sendable { public var x: Double; public var y: Double
        public init(x: Double, y: Double) { self.x = x; self.y = y } }

    // MARK: Coordinate normalization

    public static func normalize(_ p: Point, side: Double) -> Point {
        Point(x: p.x / side, y: p.y / side)
    }
    public static func denormalize(_ p: Point, side: Double) -> Point {
        Point(x: p.x * side, y: p.y * side)
    }

    // MARK: Recording — min processing distance (squared comparison, like the TS)

    public static func isBeyondMinProcessingDistance(last: Point, current: Point) -> Bool {
        let dx = last.x - current.x
        let dy = last.y - current.y
        return (minProcessingDistancePx * minProcessingDistancePx) < (dx * dx + dy * dy)
    }

    public static func drawStrokeWidth(side: Double) -> Double { drawStrokeFraction * side }
    public static func eraseStrokeWidth(side: Double) -> Double { eraseStrokeFraction * side }

    // MARK: Replay — timestamp normalization

    /// First event => 0; subsequent gaps capped at `maxGapMs`, then accumulated.
    public static func normalizedTimestamps(_ timestamps: [Double]) -> [Double] {
        guard !timestamps.isEmpty else { return [] }
        var out = [Double](repeating: 0, count: timestamps.count)
        out[0] = 0
        for i in 1..<timestamps.count {
            var d = timestamps[i] - timestamps[i - 1]
            if d > maxGapMs { d = maxGapMs }
            out[i] = out[i - 1] + d
        }
        return out
    }

    public struct ReplayTick: Equatable, Sendable {
        public var period: Int
        public var elapsedMs: Double
        public var drawnCount: Int
    }

    /// Drives the 33 ms replay loop (touchCount == 0 path): at each tick, every event
    /// with normalized timestamp <= elapsed has been drawn. Returns the cumulative
    /// drawn-count per tick from period 0 through the final period (inclusive).
    public static func replayTicks(normalizedTimestamps norm: [Double]) -> [ReplayTick] {
        let last = norm.last ?? 0
        let totalPeriods = Int(ceil(last / replayPeriodMs))
        var ticks: [ReplayTick] = []
        var drawingIndex = 0
        var counter = 0
        while counter <= totalPeriods {
            let cur = Double(counter) * replayPeriodMs
            while drawingIndex < norm.count && norm[drawingIndex] <= cur { drawingIndex += 1 }
            ticks.append(ReplayTick(period: counter, elapsedMs: cur, drawnCount: drawingIndex))
            counter += 1
        }
        return ticks
    }

    // MARK: Catmull-Rom smoothing (visual parity with Paper.js `path.smooth()`)

    /// Converts a Catmull-Rom spline through `points` into cubic Bezier control
    /// points, the standard equivalent of Paper.js's default smoothing. Returned as
    /// (control1, control2, endPoint) segments to feed a Bezier path renderer.
    public static func catmullRomToBezier(_ points: [Point]) -> [(c1: Point, c2: Point, end: Point)] {
        guard points.count >= 2 else { return [] }
        var segments: [(c1: Point, c2: Point, end: Point)] = []
        for i in 0..<(points.count - 1) {
            let p0 = points[max(i - 1, 0)]
            let p1 = points[i]
            let p2 = points[i + 1]
            let p3 = points[min(i + 2, points.count - 1)]
            let c1 = Point(x: p1.x + (p2.x - p0.x) / 6.0, y: p1.y + (p2.y - p0.y) / 6.0)
            let c2 = Point(x: p2.x - (p3.x - p1.x) / 6.0, y: p2.y - (p3.y - p1.y) / 6.0)
            segments.append((c1: c1, c2: c2, end: p2))
        }
        return segments
    }
}
