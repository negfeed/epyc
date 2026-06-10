package com.negfeed.epyc.core

import kotlinx.serialization.Serializable
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

@Serializable private data class Event(val type: String, val timestamp: Double)
@Serializable private data class Tick(val period: Int, val elapsedMs: Double, val drawnCount: Int)
@Serializable private data class Replay(
    val name: String,
    val events: List<Event>,
    val totalPeriods: Int,
    val normalizedTimestamps: List<Double>,
    val ticks: List<Tick>,
)
@Serializable private data class XY(val x: Double, val y: Double)
@Serializable private data class MinDist(val last: XY, val cur: XY, val beyond: Boolean)
@Serializable private data class CoordCase(val screen: XY, val normalized: XY)
@Serializable private data class Coordinates(val side: Double, val cases: List<CoordCase>)
@Serializable private data class Constants(
    val MAX_GAP_MS: Double,
    val REPLAY_PERIOD_MS: Double,
    val MIN_PROCESSING_DISTANCE_PX: Double,
)
@Serializable private data class DrawingVectors(
    val constants: Constants,
    val replays: List<Replay>,
    val minDistance: List<MinDist>,
    val coordinates: Coordinates,
)

class DrawingGeometryTest {

    private val v: DrawingVectors =
        GoldenLoader.json.decodeFromString(DrawingVectors.serializer(), GoldenLoader.read("drawing_vectors.json"))

    @Test fun constantsMatchGolden() {
        assertEquals(v.constants.MAX_GAP_MS, DrawingGeometry.MAX_GAP_MS)
        assertEquals(v.constants.REPLAY_PERIOD_MS, DrawingGeometry.REPLAY_PERIOD_MS)
        assertEquals(v.constants.MIN_PROCESSING_DISTANCE_PX, DrawingGeometry.MIN_PROCESSING_DISTANCE_PX)
    }

    @Test fun timestampNormalizationAndReplayTicks() {
        for (r in v.replays) {
            val norm = DrawingGeometry.normalizedTimestamps(r.events.map { it.timestamp })
            assertEquals(r.normalizedTimestamps, norm, "normalized ts for ${r.name}")
            val ticks = DrawingGeometry.replayTicks(norm)
            assertEquals(r.ticks.size, ticks.size, "tick count for ${r.name}")
            r.ticks.forEachIndexed { i, t ->
                assertEquals(t.period, ticks[i].period)
                assertEquals(t.elapsedMs, ticks[i].elapsedMs, 1e-9)
                assertEquals(t.drawnCount, ticks[i].drawnCount, "drawnCount tick $i for ${r.name}")
            }
        }
    }

    @Test fun minProcessingDistanceMatchesGolden() {
        for (c in v.minDistance) {
            val got = DrawingGeometry.isBeyondMinProcessingDistance(
                DrawingGeometry.Point(c.last.x, c.last.y),
                DrawingGeometry.Point(c.cur.x, c.cur.y),
            )
            assertEquals(c.beyond, got)
        }
    }

    @Test fun coordinateNormalizationMatchesGolden() {
        val side = v.coordinates.side
        for (c in v.coordinates.cases) {
            val got = DrawingGeometry.normalize(DrawingGeometry.Point(c.screen.x, c.screen.y), side)
            assertEquals(c.normalized.x, got.x, 1e-12)
            assertEquals(c.normalized.y, got.y, 1e-12)
            val back = DrawingGeometry.denormalize(got, side)
            assertEquals(c.screen.x, back.x, 1e-9)
            assertEquals(c.screen.y, back.y, 1e-9)
        }
    }
}
