package com.negfeed.epyc.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.negfeed.epyc.LocalAppContainer
import com.negfeed.epyc.core.AtomAddress
import com.negfeed.epyc.core.Destination
import com.negfeed.epyc.core.GameNavigation
import com.negfeed.epyc.drawing.DrawingControlBar
import com.negfeed.epyc.drawing.DrawingController
import com.negfeed.epyc.drawing.RecordingCanvas
import com.negfeed.epyc.ui.navigation.ObserveGameNavigation
import com.negfeed.epyc.ui.navigation.Routes

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DrawScreen(nav: NavController, gameId: String, threadIndex: Int, atomIndex: Int) {
    val container = LocalAppContainer.current

    // Router: leave the moment the game state no longer maps to DRAW for this player.
    ObserveGameNavigation(container, nav, gameId, Destination.DRAW)

    val vm: DrawViewModel = viewModel {
        DrawViewModel(container, gameId, threadIndex, atomIndex)
    }

    // Word to draw, derived from the observed game.
    val game by container.games.observeGame(gameId).collectAsStateWithLifecycle(initialValue = null)
    val word = game?.let { GameNavigation.drawWord(it.threads, AtomAddress(threadIndex, atomIndex)) }

    val ready by vm.ready.collectAsStateWithLifecycle()
    val countdown by vm.countdown.collectAsStateWithLifecycle()
    val finished by vm.finished.collectAsStateWithLifecycle()

    val controller = remember { DrawingController() }
    var showLeaveDialog by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { vm.prepare() }

    fun goHome() {
        nav.navigate(Routes.HOME) { popUpTo(Routes.HOME) { inclusive = true } }
    }

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Draw: ${word ?: "…"}") })
        },
    ) { inner ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(inner)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            val key = vm.drawingKey
            if (!ready || key == null) {
                CircularProgressIndicator()
            } else {
                RecordingCanvas(
                    controller = controller,
                    initialEvents = vm.initialEvents,
                    onEvent = { seq, e -> vm.appendEvent(seq, e) },
                    onSomethingDrawn = { vm.somethingDrawn = it },
                    modifier = Modifier.fillMaxWidth(),
                )

                DrawingControlBar(controller)

                val counting = countdown != null
                Button(
                    onClick = { vm.toggleCountdown() },
                    enabled = (vm.somethingDrawn || counting) && !finished,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        when {
                            finished -> "Done"
                            counting -> "Finishing in ${countdown}s (tap to cancel)"
                            else -> "Done"
                        }
                    )
                }

                OutlinedButton(
                    onClick = { showLeaveDialog = true },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text("Leave")
                }
            }
        }
    }

    if (showLeaveDialog) {
        AlertDialog(
            onDismissRequest = { showLeaveDialog = false },
            title = { Text("Leave drawing?") },
            text = { Text("Your progress is saved, but you'll return to the home screen.") },
            confirmButton = {
                TextButton(onClick = { showLeaveDialog = false; goHome() }) { Text("Leave") }
            },
            dismissButton = {
                TextButton(onClick = { showLeaveDialog = false }) { Text("Cancel") }
            },
        )
    }
}
