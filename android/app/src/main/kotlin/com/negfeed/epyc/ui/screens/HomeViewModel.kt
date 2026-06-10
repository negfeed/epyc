package com.negfeed.epyc.ui.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.negfeed.epyc.AppContainer
import com.negfeed.epyc.core.Game
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/** Drives the Home screen: profile check-in, recent games, and new-game creation. */
class HomeViewModel(private val container: AppContainer) : ViewModel() {

    private val uid: String = container.auth.current()?.uid ?: ""

    val recentGames: StateFlow<List<Game>> =
        (if (uid.isNotEmpty()) container.games.observeRecentGames(uid) else flowOf(emptyList()))
            .stateIn(
                scope = viewModelScope,
                started = SharingStarted.WhileSubscribed(5_000),
                initialValue = emptyList(),
            )

    private val _creating = MutableStateFlow(false)
    val creating: StateFlow<Boolean> = _creating.asStateFlow()

    /** Records the signed-in user's profile and a check-in on first composition. */
    fun onEnter() {
        val user = container.auth.current() ?: return
        viewModelScope.launch {
            try {
                container.users.upsertProfile(user)
                container.users.checkIn(user.uid)
            } catch (_: Exception) {
                // Best-effort; ignore check-in failures.
            }
        }
    }

    /** Creates a new game and returns its id (via [onCreated]) so the caller can navigate. */
    fun newGame(onCreated: (String) -> Unit) {
        val user = container.auth.current() ?: return
        if (_creating.value) return
        viewModelScope.launch {
            _creating.value = true
            try {
                val id = container.games.createGame(user)
                onCreated(id)
            } catch (_: Exception) {
                // Surface nothing for now; button re-enables below.
            } finally {
                _creating.value = false
            }
        }
    }

    fun signOut() = container.auth.signOut()
}
