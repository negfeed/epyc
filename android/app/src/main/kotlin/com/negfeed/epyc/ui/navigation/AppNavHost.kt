package com.negfeed.epyc.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import androidx.compose.runtime.CompositionLocalProvider
import com.negfeed.epyc.AppContainer
import com.negfeed.epyc.LocalAppContainer
import com.negfeed.epyc.ui.screens.DrawScreen
import com.negfeed.epyc.ui.screens.GameResultsScreen
import com.negfeed.epyc.ui.screens.GuessScreen
import com.negfeed.epyc.ui.screens.HomeScreen
import com.negfeed.epyc.ui.screens.LoginScreen
import com.negfeed.epyc.ui.screens.ThreadResultsScreen
import com.negfeed.epyc.ui.screens.WaitGameToEndScreen
import com.negfeed.epyc.ui.screens.WaitTurnScreen
import com.negfeed.epyc.ui.screens.WaitingRoomScreen

/**
 * App root: auth gate + the single NavHost. The `composable` block is the canonical
 * screen contract — each screen composable is constructed here with its parsed args.
 */
@Composable
fun EpycApp(container: AppContainer, startGameId: String? = null) {
    CompositionLocalProvider(LocalAppContainer provides container) {
        val user by container.auth.authState.collectAsStateWithLifecycle(initialValue = container.auth.current())

        if (user == null) {
            LoginScreen()
        } else {
            val nav = rememberNavController()

            LaunchedEffect(startGameId) {
                if (startGameId != null) nav.navigate(Routes.waitingRoom(startGameId))
            }

            NavHost(navController = nav, startDestination = Routes.HOME) {
                composable(Routes.HOME) { HomeScreen(nav) }

                composable(
                    Routes.WAITING_ROOM,
                    arguments = listOf(navArgument("gameId") { type = NavType.StringType }),
                ) { entry ->
                    WaitingRoomScreen(nav, entry.arguments!!.getString("gameId")!!)
                }

                composable(
                    Routes.DRAW,
                    arguments = listOf(
                        navArgument("gameId") { type = NavType.StringType },
                        navArgument("threadIndex") { type = NavType.IntType },
                        navArgument("atomIndex") { type = NavType.IntType },
                    ),
                ) { entry ->
                    val a = entry.arguments!!
                    DrawScreen(nav, a.getString("gameId")!!, a.getInt("threadIndex"), a.getInt("atomIndex"))
                }

                composable(
                    Routes.GUESS,
                    arguments = listOf(
                        navArgument("gameId") { type = NavType.StringType },
                        navArgument("threadIndex") { type = NavType.IntType },
                        navArgument("atomIndex") { type = NavType.IntType },
                    ),
                ) { entry ->
                    val a = entry.arguments!!
                    GuessScreen(nav, a.getString("gameId")!!, a.getInt("threadIndex"), a.getInt("atomIndex"))
                }

                composable(
                    Routes.WAIT_TURN,
                    arguments = listOf(navArgument("gameId") { type = NavType.StringType }),
                ) { entry -> WaitTurnScreen(nav, entry.arguments!!.getString("gameId")!!) }

                composable(
                    Routes.WAIT_GAME_TO_END,
                    arguments = listOf(navArgument("gameId") { type = NavType.StringType }),
                ) { entry -> WaitGameToEndScreen(nav, entry.arguments!!.getString("gameId")!!) }

                composable(
                    Routes.GAME_RESULTS,
                    arguments = listOf(navArgument("gameId") { type = NavType.StringType }),
                ) { entry -> GameResultsScreen(nav, entry.arguments!!.getString("gameId")!!) }

                composable(
                    Routes.THREAD_RESULTS,
                    arguments = listOf(
                        navArgument("gameId") { type = NavType.StringType },
                        navArgument("threadIndex") { type = NavType.IntType },
                    ),
                ) { entry ->
                    val a = entry.arguments!!
                    ThreadResultsScreen(nav, a.getString("gameId")!!, a.getInt("threadIndex"))
                }
            }
        }
    }
}
