package com.negfeed.epyc.drawing

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Redo
import androidx.compose.material.icons.automirrored.filled.Undo
import androidx.compose.material.icons.filled.Brush
import androidx.compose.material3.Button
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.PointerEventType
import androidx.compose.ui.input.pointer.PointerId
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import com.negfeed.epyc.core.DrawingEvent
import com.negfeed.epyc.core.DrawingEventType
import com.negfeed.epyc.core.DrawingGeometry
import kotlin.math.ceil

private fun nowMs(): Double = System.currentTimeMillis().toDouble()

/**
 * Multi-touch recording surface (port of recording-drawing-canvas.ts). Each pointer
 * is one finger/path; events are emitted normalized with millisecond timestamps and a
 * monotonic path name.
 */
@Composable
fun RecordingCanvas(
    controller: DrawingController,
    initialEvents: List<DrawingEvent>,
    onEvent: (Int, DrawingEvent) -> Unit,
    onSomethingDrawn: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
) {
    val engine = remember { DrawingEngine() }
    var redraw by remember { mutableStateOf(0) }
    val seq = remember { intArrayOf(0) }
    val biggestKey = remember { intArrayOf(0) }
    val activePointers = remember { HashMap<PointerId, String>() }
    val lastProcessed = remember { HashMap<PointerId, DrawingGeometry.Point>() }

    fun store(event: DrawingEvent) {
        onEvent(seq[0], event); seq[0] += 1
        engine.process(event); onSomethingDrawn(true); redraw++
    }

    DisposableEffect(controller) {
        engine.onUndoAvailabilityChanged = { controller.undoAvailable = it }
        engine.onRedoAvailabilityChanged = { controller.redoAvailable = it }
        onDispose { engine.onUndoAvailabilityChanged = null; engine.onRedoAvailabilityChanged = null }
    }

    LaunchedEffect(Unit) {
        initialEvents.forEach { e ->
            engine.process(e)
            if (e.type == DrawingEventType.POINT || e.type == DrawingEventType.ERASE) {
                onSomethingDrawn(true)
                e.pathName?.toIntOrNull()?.let { if (it > biggestKey[0]) biggestKey[0] = it }
            }
        }
        seq[0] = initialEvents.size
        redraw++
    }

    // Undo/redo from the control bar (blocked mid-stroke, like the legacy code).
    LaunchedEffect(controller) {
        controller.doEvents.collect { ev ->
            if (activePointers.isNotEmpty()) return@collect
            store(DrawingEvent(
                type = if (ev == DrawingController.DoEvent.UNDO) DrawingEventType.UNDO else DrawingEventType.REDO,
                ts = nowMs()))
        }
    }

    Canvas(
        modifier = modifier
            .fillMaxWidth()
            .aspectRatio(1f)
            .border(1.dp, Color.LightGray)
            .pointerInput(Unit) {
                val side = size.width.toFloat()
                fun emit(id: PointerId, x: Float, y: Float) {
                    val name = activePointers[id] ?: run { biggestKey[0] += 1; biggestKey[0].toString() }
                    activePointers[id] = name
                    val isErase = controller.mode == DrawingController.Mode.ERASE
                    val n = DrawingGeometry.normalize(DrawingGeometry.Point(x.toDouble(), y.toDouble()), side.toDouble())
                    store(DrawingEvent(
                        type = if (isErase) DrawingEventType.ERASE else DrawingEventType.POINT,
                        ts = nowMs(), pathName = name, x = n.x, y = n.y))
                    lastProcessed[id] = DrawingGeometry.Point(x.toDouble(), y.toDouble())
                }
                awaitPointerEventScope {
                    while (true) {
                        val event = awaitPointerEvent()
                        for (change in event.changes) {
                            val p = change.position
                            when {
                                change.pressed && !change.previousPressed -> emit(change.id, p.x, p.y)
                                !change.pressed && change.previousPressed -> {
                                    emit(change.id, p.x, p.y)
                                    activePointers.remove(change.id); lastProcessed.remove(change.id)
                                }
                                change.pressed -> {
                                    val last = lastProcessed[change.id]
                                    val cur = DrawingGeometry.Point(p.x.toDouble(), p.y.toDouble())
                                    if (last == null || DrawingGeometry.isBeyondMinProcessingDistance(last, cur)) {
                                        emit(change.id, p.x, p.y)
                                    }
                                }
                            }
                            change.consume()
                        }
                    }
                }
            }
    ) {
        @Suppress("UNUSED_EXPRESSION") redraw // subscribe to redraw
        drawRect(Color.White, size = size)
        engine.draw(this, size.width)
    }
}

/**
 * Replays a recorded drawing on a 33 ms timeline (port of replaying-drawing-canvas.ts):
 * timestamps normalized (gaps capped at 1 s), events drawn when ts <= elapsed, a bottom
 * progress bar, and touch-and-hold fast-forward (5x).
 */
@Composable
fun ReplayCanvas(
    events: List<DrawingEvent>,
    onFinished: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
) {
    val engine = remember(events) { DrawingEngine() }
    var redraw by remember(events) { mutableStateOf(0) }
    var progress by remember(events) { mutableStateOf(0f) }   // 0..100
    val touchCount = remember(events) { mutableIntStateOf(0) }

    LaunchedEffect(events) {
        if (events.isEmpty()) { progress = 100f; onFinished(false); return@LaunchedEffect }
        val normalized = DrawingGeometry.normalizedTimestamps(events.map { it.ts })
        val last = normalized.lastOrNull() ?: 0.0
        val totalPeriods = ceil(last / DrawingGeometry.REPLAY_PERIOD_MS).toInt()
        var counter = 0
        var drawingIndex = 0
        while (true) {
            val cur = counter * DrawingGeometry.REPLAY_PERIOD_MS
            while (drawingIndex < events.size && normalized[drawingIndex] <= cur) {
                engine.process(events[drawingIndex]); drawingIndex++
            }
            redraw++
            if (counter >= totalPeriods) { progress = 100f; onFinished(true); break }
            progress = if (totalPeriods > 0) 100f * counter / totalPeriods else 100f
            counter += if (touchCount.intValue == 0) 1 else 5
            kotlinx.coroutines.delay(DrawingGeometry.REPLAY_PERIOD_MS.toLong())
        }
    }

    Canvas(
        modifier = modifier
            .fillMaxWidth()
            .aspectRatio(1f)
            .border(1.dp, Color.LightGray)
            .pointerInput(Unit) {
                awaitPointerEventScope {
                    while (true) {
                        val event = awaitPointerEvent()
                        when (event.type) {
                            PointerEventType.Press -> touchCount.intValue += 1
                            PointerEventType.Release -> touchCount.intValue = maxOf(0, touchCount.intValue - 1)
                            else -> {}
                        }
                    }
                }
            }
    ) {
        @Suppress("UNUSED_EXPRESSION") redraw
        drawRect(Color.White, size = size)
        engine.draw(this, size.width)
        val h = size.width * DrawingGeometry.PROGRESS_BAR_HEIGHT_FRACTION.toFloat()
        drawRect(
            color = Color(0x332F73F2),
            topLeft = androidx.compose.ui.geometry.Offset(0f, size.height - h),
            size = androidx.compose.ui.geometry.Size(size.width * (progress / 100f), h),
        )
    }
}

/** Draw/erase toggle + undo/redo (port of drawing-control-bar.ts). */
@Composable
fun DrawingControlBar(controller: DrawingController, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier.fillMaxWidth().padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        FilledTonalButton(onClick = { controller.mode = DrawingController.Mode.DRAW }) {
            Icon(Icons.Filled.Brush, contentDescription = "Draw"); Text("Draw")
        }
        OutlinedButton(onClick = { controller.mode = DrawingController.Mode.ERASE }) {
            Text("Erase")
        }
        Button(onClick = { controller.requestUndo() }, enabled = controller.undoAvailable) {
            Icon(Icons.AutoMirrored.Filled.Undo, contentDescription = "Undo")
        }
        Button(onClick = { controller.requestRedo() }, enabled = controller.redoAvailable) {
            Icon(Icons.AutoMirrored.Filled.Redo, contentDescription = "Redo")
        }
    }
}
