package com.negfeed.epyc.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.navigation.NavController
import com.negfeed.epyc.AppContainer
import com.negfeed.epyc.core.Destination
import com.negfeed.epyc.core.Game
import com.negfeed.epyc.core.GameNavigation
import com.negfeed.epyc.core.TurnEngine

/** Route string builders (parameters carried in the path). */
object Routes {
    const val HOME = "home"
    fun waitingRoom(id: String) = "waitingRoom/$id"
    fun draw(id: String, t: Int, a: Int) = "draw/$id/$t/$a"
    fun guess(id: String, t: Int, a: Int) = "guess/$id/$t/$a"
    fun waitTurn(id: String) = "waitTurn/$id"
    fun waitGameToEnd(id: String) = "waitGameToEnd/$id"
    fun gameResults(id: String) = "gameResults/$id"
    fun threadResults(id: String, t: Int) = "threadResults/$id/$t"

    // patterns
    const val WAITING_ROOM = "waitingRoom/{gameId}"
    const val DRAW = "draw/{gameId}/{threadIndex}/{atomIndex}"
    const val GUESS = "guess/{gameId}/{threadIndex}/{atomIndex}"
    const val WAIT_TURN = "waitTurn/{gameId}"
    const val WAIT_GAME_TO_END = "waitGameToEnd/{gameId}"
    const val GAME_RESULTS = "gameResults/{gameId}"
    const val THREAD_RESULTS = "threadResults/{gameId}/{threadIndex}"
}

/** Concrete route for a destination, deriving the draw/guess atom address. */
fun routeFor(dest: Destination, game: Game, uid: String): String? = when (dest) {
    Destination.WAITING_ROOM -> Routes.waitingRoom(game.id)
    Destination.WAIT_TURN -> Routes.waitTurn(game.id)
    Destination.WAIT_GAME_TO_END -> Routes.waitGameToEnd(game.id)
    Destination.GAME_RESULTS -> Routes.gameResults(game.id)
    Destination.DRAW -> TurnEngine.getNextAtom(game.threads, game.usersOrder, uid).address
        ?.let { Routes.draw(game.id, it.threadIndex, it.atomIndex) }
    Destination.GUESS -> TurnEngine.getNextAtom(game.threads, game.usersOrder, uid).address
        ?.let { Routes.guess(game.id, it.threadIndex, it.atomIndex) }
}

/**
 * The state-driven navigator — Compose analogue of GameNavigationController. Each game
 * screen calls this with its own `source`; when the game state implies a different
 * screen, it navigates there. Cancels automatically when the screen leaves composition.
 */
@Composable
fun ObserveGameNavigation(
    container: AppContainer,
    nav: NavController,
    gameId: String,
    source: Destination,
) {
    LaunchedEffect(gameId, source) {
        val uid = container.auth.current()?.uid ?: return@LaunchedEffect
        container.games.observeGame(gameId).collect { game ->
            val dest = GameNavigation.destination(game.state, game.threads, game.usersOrder, uid)
            if (dest != source) {
                val route = routeFor(dest, game, uid) ?: return@collect
                nav.navigate(route) { launchSingleTop = true }
                return@collect
            }
        }
    }
}
