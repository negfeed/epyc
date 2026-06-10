package com.negfeed.epyc.core

import kotlin.math.ceil

/**
 * Pure geometry/timeline math ported from the legacy drawing components and
 * asserted against `tools/golden/drawing_vectors.json`.
 */
object DrawingGeometry {

    const val MAX_GAP_MS = 1000.0          // MAXIMUM_EVENT_TIME_DIFFERENCE_IN_MILLIS
    const val REPLAY_PERIOD_MS = 33.0      // REPLAY_PERIOD_IN_MILLIS
    const val MIN_PROCESSING_DISTANCE_PX = 6.0
    const val DRAW_STROKE_FRACTION = 0.01
    const val ERASE_STROKE_FRACTION = 0.03
    const val PROGRESS_BAR_HEIGHT_FRACTION = 0.03

    data class Point(val x: Double, val y: Double)
    data class ReplayTick(val period: Int, val elapsedMs: Double, val drawnCount: Int)
    data class BezierSegment(val c1: Point, val c2: Point, val end: Point)

    fun normalize(p: Point, side: Double) = Point(p.x / side, p.y / side)
    fun denormalize(p: Point, side: Double) = Point(p.x * side, p.y * side)

    fun isBeyondMinProcessingDistance(last: Point, current: Point): Boolean {
        val dx = last.x - current.x
        val dy = last.y - current.y
        return (MIN_PROCESSING_DISTANCE_PX * MIN_PROCESSING_DISTANCE_PX) < (dx * dx + dy * dy)
    }

    fun drawStrokeWidth(side: Double) = DRAW_STROKE_FRACTION * side
    fun eraseStrokeWidth(side: Double) = ERASE_STROKE_FRACTION * side

    /** First event => 0; subsequent gaps capped at MAX_GAP_MS, then accumulated. */
    fun normalizedTimestamps(timestamps: List<Double>): List<Double> {
        if (timestamps.isEmpty()) return emptyList()
        val out = DoubleArray(timestamps.size)
        out[0] = 0.0
        for (i in 1 until timestamps.size) {
            var d = timestamps[i] - timestamps[i - 1]
            if (d > MAX_GAP_MS) d = MAX_GAP_MS
            out[i] = out[i - 1] + d
        }
        return out.toList()
    }

    /** Cumulative drawn-count per 33 ms tick (touchCount == 0 path), inclusive of final period. */
    fun replayTicks(normalizedTimestamps: List<Double>): List<ReplayTick> {
        val last = normalizedTimestamps.lastOrNull() ?: 0.0
        val totalPeriods = ceil(last / REPLAY_PERIOD_MS).toInt()
        val ticks = ArrayList<ReplayTick>(totalPeriods + 1)
        var drawingIndex = 0
        var counter = 0
        while (counter <= totalPeriods) {
            val cur = counter * REPLAY_PERIOD_MS
            while (drawingIndex < normalizedTimestamps.size && normalizedTimestamps[drawingIndex] <= cur) drawingIndex++
            ticks.add(ReplayTick(counter, cur, drawingIndex))
            counter++
        }
        return ticks
    }

    /** Catmull-Rom spline → cubic Bezier segments (Paper.js `path.smooth()` equivalent). */
    fun catmullRomToBezier(points: List<Point>): List<BezierSegment> {
        if (points.size < 2) return emptyList()
        val segments = ArrayList<BezierSegment>(points.size - 1)
        for (i in 0 until points.size - 1) {
            val p0 = points[maxOf(i - 1, 0)]
            val p1 = points[i]
            val p2 = points[i + 1]
            val p3 = points[minOf(i + 2, points.size - 1)]
            val c1 = Point(p1.x + (p2.x - p0.x) / 6.0, p1.y + (p2.y - p0.y) / 6.0)
            val c2 = Point(p2.x - (p3.x - p1.x) / 6.0, p2.y - (p3.y - p1.y) / 6.0)
            segments.add(BezierSegment(c1, c2, p2))
        }
        return segments
    }
}
