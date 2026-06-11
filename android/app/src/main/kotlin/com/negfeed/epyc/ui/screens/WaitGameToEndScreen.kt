package com.negfeed.epyc.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.negfeed.epyc.LocalAppContainer
import com.negfeed.epyc.core.Destination
import com.negfeed.epyc.core.GameAtomState
import com.negfeed.epyc.core.GameThread
import com.negfeed.epyc.ui.navigation.ObserveGameNavigation

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WaitGameToEndScreen(nav: NavController, gameId: String) {
    val container = LocalAppContainer.current
    ObserveGameNavigation(container, nav, gameId, Destination.WAIT_GAME_TO_END)

    val vm: WaitGameToEndViewModel = viewModel { WaitGameToEndViewModel(container, gameId) }
    val game by vm.game.collectAsStateWithLifecycle()

    Scaffold(
        topBar = { TopAppBar(title = { Text("Almost there") }) },
    ) { padding ->
        val g = game
        if (g == null) {
            Column(
                modifier = Modifier.fillMaxSize().padding(padding),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                CircularProgressIndicator()
            }
            return@Scaffold
        }

        Column(
            modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp),
        ) {
            Text(
                "Waiting for everyone to finish.",
                style = MaterialTheme.typography.titleMedium,
            )
            Spacer(Modifier.height(16.dp))
            LazyColumn(modifier = Modifier.fillMaxWidth()) {
                itemsIndexed(g.threads) { index, thread ->
                    ThreadProgressRow(index, thread)
                }
            }
        }
    }
}

@Composable
private fun ThreadProgressRow(index: Int, thread: GameThread) {
    val total = thread.gameAtoms.size
    val done = thread.gameAtoms.count { it.state == GameAtomState.DONE }
    val progress = if (total > 0) done.toFloat() / total.toFloat() else 0f
    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
        Text("Thread ${index + 1}: $done/$total", style = MaterialTheme.typography.bodyMedium)
        Spacer(Modifier.height(4.dp))
        LinearProgressIndicator(
            progress = { progress },
            modifier = Modifier.fillMaxWidth(),
        )
    }
}
