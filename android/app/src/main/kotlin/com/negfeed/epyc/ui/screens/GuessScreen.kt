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
import androidx.compose.material3.OutlinedTextField
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
import com.negfeed.epyc.core.Destination
import com.negfeed.epyc.drawing.ReplayCanvas
import com.negfeed.epyc.ui.navigation.ObserveGameNavigation
import com.negfeed.epyc.ui.navigation.Routes

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GuessScreen(nav: NavController, gameId: String, threadIndex: Int, atomIndex: Int) {
    val container = LocalAppContainer.current

    // Router: leave the moment the game state no longer maps to GUESS for this player.
    ObserveGameNavigation(container, nav, gameId, Destination.GUESS)

    val vm: GuessViewModel = viewModel {
        GuessViewModel(container, gameId, threadIndex, atomIndex)
    }

    val ready by vm.ready.collectAsStateWithLifecycle()
    val submitted by vm.submitted.collectAsStateWithLifecycle()

    var showLeaveDialog by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { vm.prepare() }

    fun goHome() {
        nav.navigate(Routes.HOME) { popUpTo(Routes.HOME) { inclusive = true } }
    }

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Guess the drawing") })
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
            if (!ready) {
                CircularProgressIndicator()
            } else {
                ReplayCanvas(
                    events = vm.events,
                    onFinished = { vm.drawingFinished = true },
                    modifier = Modifier.fillMaxWidth(),
                )

                OutlinedTextField(
                    value = vm.guess,
                    onValueChange = { vm.guess = it },
                    label = { Text("Your guess") },
                    singleLine = true,
                    enabled = !submitted,
                    modifier = Modifier.fillMaxWidth(),
                )

                Button(
                    onClick = { vm.submit() },
                    enabled = vm.canSubmit,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(if (submitted) "Submitted" else "Submit")
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
            title = { Text("Leave guessing?") },
            text = { Text("You'll return to the home screen.") },
            confirmButton = {
                TextButton(onClick = { showLeaveDialog = false; goHome() }) { Text("Leave") }
            },
            dismissButton = {
                TextButton(onClick = { showLeaveDialog = false }) { Text("Cancel") }
            },
        )
    }
}
