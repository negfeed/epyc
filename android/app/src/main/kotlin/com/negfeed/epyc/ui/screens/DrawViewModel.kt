package com.negfeed.epyc.ui.screens

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.negfeed.epyc.AppContainer
import com.negfeed.epyc.core.AtomAddress
import com.negfeed.epyc.core.DrawingEvent
import com.negfeed.epyc.core.GameAtomState
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

/**
 * Backs the Draw screen: creates/looks-up the drawing reference, seeds the canvas with
 * any previously persisted events, persists each new event, and runs the 5-second
 * "Done" countdown before committing the finished drawing.
 */
class DrawViewModel(
    private val container: AppContainer,
    private val gameId: String,
    threadIndex: Int,
    atomIndex: Int,
) : ViewModel() {

    private val address = AtomAddress(threadIndex, atomIndex)
    private val uid: String get() = container.auth.current()?.uid ?: ""

    /** Firestore drawing document id this atom records into; null until [prepare] resolves it. */
    var drawingKey: String? = null
        private set

    /** Events already recorded for this drawing (used to seed RecordingCanvas). */
    var initialEvents: List<DrawingEvent> = emptyList()
        private set

    /** True once the canvas reports at least one stroke; gates the "Done" button. */
    var somethingDrawn by mutableStateOf(false)

    private val _ready = MutableStateFlow(false)
    /** Becomes true after [prepare] has resolved the drawing key + initial events. */
    val ready: StateFlow<Boolean> = _ready.asStateFlow()

    private val _countdown = MutableStateFlow<Int?>(null)
    /** Remaining seconds while the finish countdown runs, else null. */
    val countdown: StateFlow<Int?> = _countdown.asStateFlow()

    private val _finished = MutableStateFlow(false)
    /** True once the drawing has been committed via finishDrawing. */
    val finished: StateFlow<Boolean> = _finished.asStateFlow()

    private var prepared = false
    private var countdownJob: Job? = null

    /** Run once: resolve the drawing ref (create if absent) and mark the atom STARTED. */
    fun prepare() {
        if (prepared) return
        prepared = true
        viewModelScope.launch {
            val game = container.games.observeGame(gameId).first()
            val atom = game.threads[address.threadIndex].gameAtoms[address.atomIndex]
            val key = atom.drawingRef
            if (key == null) {
                val created = container.drawings.createDrawing(uid)
                container.games.setAtomDrawingRef(gameId, address, created)
                drawingKey = created
                initialEvents = emptyList()
            } else {
                drawingKey = key
                initialEvents = container.drawings.loadEvents(key)
                if (initialEvents.isNotEmpty()) somethingDrawn = true
            }
            container.games.setAtomState(gameId, address, GameAtomState.STARTED)
            _ready.value = true
        }
    }

    /** Persist a single recorded drawing event at its sequence index. */
    fun appendEvent(seq: Int, event: DrawingEvent) {
        val key = drawingKey ?: return
        viewModelScope.launch { container.drawings.appendEvent(key, seq, event) }
    }

    /** Toggle the 5-second finish countdown: starts it, or cancels it if already running. */
    fun toggleCountdown() {
        if (countdownJob?.isActive == true) {
            countdownJob?.cancel()
            countdownJob = null
            _countdown.value = null
            return
        }
        countdownJob = viewModelScope.launch {
            for (remaining in 5 downTo 1) {
                _countdown.value = remaining
                delay(1_000)
            }
            _countdown.value = 0
            container.games.finishDrawing(gameId, address, uid)
            _finished.value = true
        }
    }
}
