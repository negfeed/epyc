package com.negfeed.epyc.ui.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.negfeed.epyc.AppContainer
import com.negfeed.epyc.core.Game
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn

/** Data-only view model: observes the finished game so threads can be listed. */
class GameResultsViewModel(
    private val container: AppContainer,
    private val gameId: String,
) : ViewModel() {

    val game: StateFlow<Game?> = container.games.observeGame(gameId)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)
}
