package com.negfeed.epyc.drawing

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import com.negfeed.epyc.core.DrawingEvent
import com.negfeed.epyc.core.DrawingEventType
import com.negfeed.epyc.core.DrawingGeometry
import kotlinx.coroutines.flow.MutableSharedFlow

/** One finger stroke (normalized points + erase flag). */
class StrokeData(val pathName: String, val isErase: Boolean) {
    val points = ArrayList<DrawingGeometry.Point>()
}

/**
 * Renderable, event-sourced drawing state shared by the recording and replay
 * canvases (port of the abstract drawing-canvas.ts: paths + undo/redo + Catmull-Rom).
 */
class DrawingEngine {
    private val strokes = HashMap<String, StrokeData>()
    private val undoStack = ArrayList<StrokeData>()
    private val redoStack = ArrayList<StrokeData>()
    private val visible = ArrayList<StrokeData>()

    var onUndoAvailabilityChanged: ((Boolean) -> Unit)? = null
    var onRedoAvailabilityChanged: ((Boolean) -> Unit)? = null

    val hasContent: Boolean get() = visible.isNotEmpty()

    fun reset() {
        strokes.clear(); undoStack.clear(); redoStack.clear(); visible.clear()
        onUndoAvailabilityChanged?.invoke(false); onRedoAvailabilityChanged?.invoke(false)
    }

    fun process(event: DrawingEvent) {
        when (event.type) {
            DrawingEventType.POINT, DrawingEventType.ERASE -> {
                val x = event.x ?: return; val y = event.y ?: return; val name = event.pathName ?: return
                addPoint(name, event.type == DrawingEventType.ERASE, x, y)
            }
            DrawingEventType.UNDO -> undo()
            DrawingEventType.REDO -> redo()
        }
    }

    private fun addPoint(pathName: String, isErase: Boolean, x: Double, y: Double) {
        val stroke = strokes[pathName] ?: StrokeData(pathName, isErase).also {
            strokes[pathName] = it
            visible.add(it)
            undoStack.add(it)
            onUndoAvailabilityChanged?.invoke(true)
            redoStack.clear()
            onRedoAvailabilityChanged?.invoke(false)
        }
        stroke.points.add(DrawingGeometry.Point(x, y))
    }

    private fun undo() {
        val stroke = undoStack.removeLastOrNull() ?: return
        if (undoStack.isEmpty()) onUndoAvailabilityChanged?.invoke(false)
        visible.remove(stroke)
        redoStack.add(stroke)
        onRedoAvailabilityChanged?.invoke(true)
    }

    private fun redo() {
        val stroke = redoStack.removeLastOrNull() ?: return
        if (redoStack.isEmpty()) onRedoAvailabilityChanged?.invoke(false)
        visible.add(stroke)
        undoStack.add(stroke)
        onUndoAvailabilityChanged?.invoke(true)
    }

    /** Render visible strokes into a Compose DrawScope of `side` px (square). */
    fun draw(scope: DrawScope, side: Float) {
        for (stroke in visible) {
            val denorm = stroke.points.map { DrawingGeometry.denormalize(it, side.toDouble()) }
            val path = buildPath(denorm)
            val width = (if (stroke.isErase) DrawingGeometry.eraseStrokeWidth(side.toDouble())
                         else DrawingGeometry.drawStrokeWidth(side.toDouble())).toFloat()
            scope.drawPath(
                path = path,
                color = if (stroke.isErase) Color.White else Color.Black,
                style = Stroke(width = width, cap = StrokeCap.Round),
            )
        }
    }

    private fun buildPath(pts: List<DrawingGeometry.Point>): Path {
        val path = Path()
        val first = pts.firstOrNull() ?: return path
        path.moveTo(first.x.toFloat(), first.y.toFloat())
        if (pts.size == 1) {
            path.lineTo((first.x + 0.01).toFloat(), first.y.toFloat())
            return path
        }
        for (s in DrawingGeometry.catmullRomToBezier(pts)) {
            path.cubicTo(
                s.c1.x.toFloat(), s.c1.y.toFloat(),
                s.c2.x.toFloat(), s.c2.y.toFloat(),
                s.end.x.toFloat(), s.end.y.toFloat(),
            )
        }
        return path
    }
}

/** Draw/erase mode + undo/redo wiring (port of drawing-controller.ts). */
class DrawingController {
    enum class Mode { DRAW, ERASE }
    enum class DoEvent { UNDO, REDO }

    var mode by mutableStateOf(Mode.DRAW)
    var undoAvailable by mutableStateOf(false)
    var redoAvailable by mutableStateOf(false)

    val doEvents = MutableSharedFlow<DoEvent>(extraBufferCapacity = 8)

    fun requestUndo() { doEvents.tryEmit(DoEvent.UNDO) }
    fun requestRedo() { doEvents.tryEmit(DoEvent.REDO) }
}
