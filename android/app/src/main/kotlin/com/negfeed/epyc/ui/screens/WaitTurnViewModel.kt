package com.negfeed.epyc.ui.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.negfeed.epyc.AppContainer
import com.negfeed.epyc.core.Game
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn

/** Observes the game while the player waits for a thread to become ready to play. */
class WaitTurnViewModel(
    private val container: AppContainer,
    private val gameId: String,
) : ViewModel() {

    val uid: String = container.auth.current()?.uid ?: ""

    val game: StateFlow<Game?> = container.games.observeGame(gameId)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)
}
