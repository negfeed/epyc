package com.negfeed.epyc.ui.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.negfeed.epyc.AppContainer
import com.negfeed.epyc.core.Game
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn

/** Observes the game while the player waits for everyone else to finish. */
class WaitGameToEndViewModel(
    private val container: AppContainer,
    private val gameId: String,
) : ViewModel() {

    val game: StateFlow<Game?> = container.games.observeGame(gameId)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)
}
