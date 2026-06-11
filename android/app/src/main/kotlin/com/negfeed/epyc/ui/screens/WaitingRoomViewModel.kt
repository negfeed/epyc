package com.negfeed.epyc.ui.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.negfeed.epyc.AppContainer
import com.negfeed.epyc.core.Game
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/** Drives the Waiting Room: observes the game, auto-registers as a watcher, join/leave/start. */
class WaitingRoomViewModel(
    private val container: AppContainer,
    private val gameId: String,
) : ViewModel() {

    val uid: String = container.auth.current()?.uid ?: ""

    val game: StateFlow<Game?> =
        container.games.observeGame(gameId).stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = null,
        )

    // Ensures we only attempt the watcher upsert once per VM lifetime.
    private var ensuredMembership = false

    /** If the current user isn't yet in the game's users map, register them as a watcher. */
    fun ensureMembership(current: Game) {
        if (ensuredMembership || uid.isEmpty()) return
        if (uid !in current.users) {
            val user = container.auth.current() ?: return
            ensuredMembership = true
            viewModelScope.launch {
                try {
                    container.games.upsertGameUser(gameId, user, joined = false)
                } catch (_: Exception) {
                    ensuredMembership = false
                }
            }
        } else {
            ensuredMembership = true
        }
    }

    fun setJoined(joined: Boolean) {
        if (uid.isEmpty()) return
        viewModelScope.launch {
            try {
                container.games.setJoined(gameId, uid, joined)
            } catch (_: Exception) {
            }
        }
    }

    fun start() {
        viewModelScope.launch {
            try {
                container.games.start(gameId)
            } catch (_: Exception) {
            }
        }
    }
}
