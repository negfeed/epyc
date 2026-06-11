package com.negfeed.epyc.ui.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.negfeed.epyc.AppContainer
import com.negfeed.epyc.core.DrawingEvent
import com.negfeed.epyc.core.Game
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/**
 * Data-only view model: observes the game and lazily loads recorded drawing events,
 * caching them by drawingRef so each replay is fetched only once.
 */
class ThreadResultsViewModel(
    private val container: AppContainer,
    private val gameId: String,
) : ViewModel() {

    val game: StateFlow<Game?> = container.games.observeGame(gameId)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)

    private val _drawings = MutableStateFlow<Map<String, List<DrawingEvent>>>(emptyMap())
    val drawings: StateFlow<Map<String, List<DrawingEvent>>> = _drawings.asStateFlow()

    private val requested = HashSet<String>()

    /** Loads (once) the events for a drawingRef; results surface via [drawings]. */
    fun loadDrawing(ref: String) {
        if (!requested.add(ref)) return
        viewModelScope.launch {
            val events = container.drawings.loadEvents(ref)
            _drawings.value = _drawings.value + (ref to events)
        }
    }
}
