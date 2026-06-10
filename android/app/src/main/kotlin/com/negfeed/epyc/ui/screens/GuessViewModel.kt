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
import com.negfeed.epyc.core.GameNavigation
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

/**
 * Backs the Guess screen: marks the atom STARTED, loads the previous atom's drawing for
 * replay, holds the in-progress guess text, and commits the guess once the replay has
 * finished and the field is non-blank.
 */
class GuessViewModel(
    private val container: AppContainer,
    private val gameId: String,
    threadIndex: Int,
    atomIndex: Int,
) : ViewModel() {

    private val address = AtomAddress(threadIndex, atomIndex)
    private val uid: String get() = container.auth.current()?.uid ?: ""

    /** Replay events for the drawing this guess responds to; empty until [prepare] resolves. */
    var events: List<DrawingEvent> = emptyList()
        private set

    /** Current text in the guess field. */
    var guess by mutableStateOf("")

    /** Set true by ReplayCanvas once the playback completes; gates submission. */
    var drawingFinished by mutableStateOf(false)

    private val _ready = MutableStateFlow(false)
    /** True after [prepare] has loaded the replay events. */
    val ready: StateFlow<Boolean> = _ready.asStateFlow()

    private val _submitted = MutableStateFlow(false)
    /** True once the guess has been committed via finishGuess. */
    val submitted: StateFlow<Boolean> = _submitted.asStateFlow()

    /** Submission is allowed once there's a non-blank guess and the replay has played out. */
    val canSubmit: Boolean
        get() = guess.isNotBlank() && drawingFinished && !_submitted.value

    private var prepared = false

    /** Run once: mark the atom STARTED and load the drawing to replay. */
    fun prepare() {
        if (prepared) return
        prepared = true
        viewModelScope.launch {
            container.games.setAtomState(gameId, address, GameAtomState.STARTED)
            val game = container.games.observeGame(gameId).first()
            val drawingKey = GameNavigation.guessDrawingRef(game.threads, address)
            events = drawingKey?.let { container.drawings.loadEvents(it) } ?: emptyList()
            _ready.value = true
        }
    }

    /** Commit the guess; no-op unless [canSubmit]. */
    fun submit() {
        if (!canSubmit) return
        val value = guess.trim()
        viewModelScope.launch {
            container.games.finishGuess(gameId, address, value, uid)
            _submitted.value = true
        }
    }
}
