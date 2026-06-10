package com.negfeed.epyc.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.negfeed.epyc.LocalAppContainer
import com.negfeed.epyc.core.DrawingEvent
import com.negfeed.epyc.core.Game
import com.negfeed.epyc.core.GameAtom
import com.negfeed.epyc.core.GameAtomType
import com.negfeed.epyc.drawing.ReplayCanvas

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ThreadResultsScreen(nav: NavController, gameId: String, threadIndex: Int) {
    val container = LocalAppContainer.current
    val vm: ThreadResultsViewModel = viewModel { ThreadResultsViewModel(container, gameId) }
    val game by vm.game.collectAsStateWithLifecycle()
    val drawings by vm.drawings.collectAsStateWithLifecycle()

    Scaffold(
        topBar = { TopAppBar(title = { Text("Thread") }) },
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

        if (threadIndex !in g.threads.indices) {
            Column(modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp)) {
                Text("Thread not found.", style = MaterialTheme.typography.bodyLarge)
            }
            return@Scaffold
        }

        val thread = g.threads[threadIndex]

        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            item {
                Text("The word", style = MaterialTheme.typography.labelMedium)
                Text(thread.word, style = MaterialTheme.typography.headlineSmall)
            }
            itemsIndexed(thread.gameAtoms) { _, atom ->
                AtomResult(g, atom, drawings, vm::loadDrawing)
            }
        }
    }
}

@Composable
private fun AtomResult(
    game: Game,
    atom: GameAtom,
    drawings: Map<String, List<DrawingEvent>>,
    loadDrawing: (String) -> Unit,
) {
    val author = game.users[atom.authorUid]?.displayName ?: "—"
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            when (atom.type) {
                GameAtomType.DRAWING -> {
                    Text("Drawing by $author", style = MaterialTheme.typography.titleSmall)
                    Spacer(Modifier.height(8.dp))
                    val ref = atom.drawingRef
                    if (ref == null) {
                        Text("No drawing.", style = MaterialTheme.typography.bodyMedium)
                    } else {
                        LaunchedEffect(ref) { loadDrawing(ref) }
                        val events = drawings[ref]
                        if (events == null) {
                            Box(
                                modifier = Modifier.fillMaxWidth().height(200.dp),
                                contentAlignment = Alignment.Center,
                            ) { CircularProgressIndicator() }
                        } else {
                            ReplayCanvas(
                                events = events,
                                onFinished = {},
                                modifier = Modifier.fillMaxWidth(),
                            )
                        }
                    }
                }
                GameAtomType.GUESS -> {
                    Text("Guess by $author", style = MaterialTheme.typography.titleSmall)
                    Spacer(Modifier.height(8.dp))
                    Text(atom.guess ?: "—", style = MaterialTheme.typography.bodyLarge)
                }
            }
        }
    }
}
