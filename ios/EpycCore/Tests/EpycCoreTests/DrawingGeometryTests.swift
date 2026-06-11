import XCTest
@testable import EpycCore

private struct DrawingVectors: Decodable {
    struct Constants: Decodable {
        let MAX_GAP_MS: Double
        let REPLAY_PERIOD_MS: Double
        let MIN_PROCESSING_DISTANCE_PX: Double
    }
    struct Event: Decodable { let type: String; let timestamp: Double }
    struct Tick: Decodable { let period: Int; let elapsedMs: Double; let drawnCount: Int }
    struct Replay: Decodable {
        let name: String
        let events: [Event]
        let totalPeriods: Int
        let normalizedTimestamps: [Double]
        let ticks: [Tick]
    }
    struct XY: Decodable { let x: Double; let y: Double }
    struct MinDist: Decodable { let last: XY; let cur: XY; let beyond: Bool }
    struct CoordCase: Decodable { let screen: XY; let normalized: XY }
    struct Coordinates: Decodable { let side: Double; let cases: [CoordCase] }

    let constants: Constants
    let replays: [Replay]
    let minDistance: [MinDist]
    let coordinates: Coordinates
}

final class DrawingGeometryTests: XCTestCase {

    private func load() throws -> DrawingVectors {
        try Golden.decode(DrawingVectors.self, from: "drawing_vectors.json")
    }

    func testConstantsMatchGolden() throws {
        let v = try load()
        XCTAssertEqual(DrawingGeometry.maxGapMs, v.constants.MAX_GAP_MS)
        XCTAssertEqual(DrawingGeometry.replayPeriodMs, v.constants.REPLAY_PERIOD_MS)
        XCTAssertEqual(DrawingGeometry.minProcessingDistancePx, v.constants.MIN_PROCESSING_DISTANCE_PX)
    }

    func testTimestampNormalizationAndReplayTicks() throws {
        let v = try load()
        for r in v.replays {
            let norm = DrawingGeometry.normalizedTimestamps(r.events.map { $0.timestamp })
            XCTAssertEqual(norm, r.normalizedTimestamps, "normalized ts for \(r.name)")

            let ticks = DrawingGeometry.replayTicks(normalizedTimestamps: norm)
            XCTAssertEqual(ticks.count, r.ticks.count, "tick count for \(r.name)")
            for (i, t) in r.ticks.enumerated() {
                XCTAssertEqual(ticks[i].period, t.period)
                XCTAssertEqual(ticks[i].elapsedMs, t.elapsedMs, accuracy: 1e-9)
                XCTAssertEqual(ticks[i].drawnCount, t.drawnCount, "drawnCount tick \(i) for \(r.name)")
            }
        }
    }

    func testMinProcessingDistanceMatchesGolden() throws {
        let v = try load()
        for c in v.minDistance {
            let got = DrawingGeometry.isBeyondMinProcessingDistance(
                last: .init(x: c.last.x, y: c.last.y),
                current: .init(x: c.cur.x, y: c.cur.y))
            XCTAssertEqual(got, c.beyond, "beyond for last=(\(c.last.x),\(c.last.y)) cur=(\(c.cur.x),\(c.cur.y))")
        }
    }

    func testCoordinateNormalizationMatchesGolden() throws {
        let v = try load()
        let side = v.coordinates.side
        for c in v.coordinates.cases {
            let got = DrawingGeometry.normalize(.init(x: c.screen.x, y: c.screen.y), side: side)
            XCTAssertEqual(got.x, c.normalized.x, accuracy: 1e-12)
            XCTAssertEqual(got.y, c.normalized.y, accuracy: 1e-12)
            // round-trip
            let back = DrawingGeometry.denormalize(got, side: side)
            XCTAssertEqual(back.x, c.screen.x, accuracy: 1e-9)
            XCTAssertEqual(back.y, c.screen.y, accuracy: 1e-9)
        }
    }

    func testCatmullRomProducesSegmentPerInterval() {
        let pts = (0..<5).map { DrawingGeometry.Point(x: Double($0), y: Double($0 * $0)) }
        let segs = DrawingGeometry.catmullRomToBezier(pts)
        XCTAssertEqual(segs.count, pts.count - 1)
        XCTAssertEqual(segs.last?.end, pts.last)
    }
}
