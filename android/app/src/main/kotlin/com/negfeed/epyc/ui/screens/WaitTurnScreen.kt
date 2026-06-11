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
import com.negfeed.epyc.core.GameAtom
import com.negfeed.epyc.core.GameAtomState
import com.negfeed.epyc.core.GameAtomType
import com.negfeed.epyc.core.TurnEngine
import com.negfeed.epyc.ui.navigation.ObserveGameNavigation

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WaitTurnScreen(nav: NavController, gameId: String) {
    val container = LocalAppContainer.current
    ObserveGameNavigation(container, nav, gameId, Destination.WAIT_TURN)

    val vm: WaitTurnViewModel = viewModel { WaitTurnViewModel(container, gameId) }
    val game by vm.game.collectAsStateWithLifecycle()

    Scaffold(
        topBar = { TopAppBar(title = { Text("Waiting") }) },
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
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            CircularProgressIndicator()
            Spacer(Modifier.height(16.dp))
            Text("Waiting for your turn…", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(24.dp))

            val next = TurnEngine.getNextAtom(g.threads, g.usersOrder, vm.uid)
            val threadIndex = next.address?.threadIndex
            if (threadIndex != null && threadIndex in g.threads.indices) {
                val thread = g.threads[threadIndex]
                Text(
                    "Thread ${threadIndex + 1}",
                    style = MaterialTheme.typography.titleSmall,
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(8.dp))
                LazyColumn(modifier = Modifier.fillMaxWidth()) {
                    itemsIndexed(thread.gameAtoms) { index, atom ->
                        WaitTurnAtomRow(index, atom, authorName(g.users[atom.authorUid]?.displayName))
                    }
                }
            }
        }
    }
}

@Composable
private fun WaitTurnAtomRow(index: Int, atom: GameAtom, author: String) {
    val kind = if (atom.type == GameAtomType.DRAWING) "Draw" else "Guess"
    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
        Text(
            "${index + 1}. $kind — ${stateLabel(atom.state)}",
            style = MaterialTheme.typography.bodyLarge,
        )
        Text(
            "by $author",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

private fun authorName(name: String?): String = name ?: "—"

private fun stateLabel(state: GameAtomState): String = when (state) {
    GameAtomState.NOT_STARTED -> "Not started"
    GameAtomState.STARTED -> "In progress"
    GameAtomState.DONE -> "Done"
}
