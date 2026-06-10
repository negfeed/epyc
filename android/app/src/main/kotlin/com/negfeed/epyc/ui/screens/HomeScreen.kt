package com.negfeed.epyc.ui.screens

import android.text.format.DateUtils
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Button
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.negfeed.epyc.LocalAppContainer
import com.negfeed.epyc.core.Game
import com.negfeed.epyc.ui.navigation.Routes

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(nav: NavController) {
    val container = LocalAppContainer.current
    val vm: HomeViewModel = viewModel { HomeViewModel(container) }

    val recentGames by vm.recentGames.collectAsStateWithLifecycle()
    val creating by vm.creating.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) { vm.onEnter() }

    val user = container.auth.current()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("EPYC") },
                actions = {
                    TextButton(onClick = { vm.signOut() }) {
                        Text("Sign out")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
        ) {
            // Header: avatar + display name.
            Row(verticalAlignment = Alignment.CenterVertically) {
                AsyncImage(
                    model = user?.photoURL,
                    contentDescription = null,
                    modifier = Modifier
                        .size(56.dp)
                        .clip(CircleShape),
                )
                Spacer(Modifier.width(12.dp))
                Text(
                    text = user?.displayName ?: "Player",
                    style = MaterialTheme.typography.headlineSmall,
                )
            }

            Button(
                onClick = { vm.newGame { id -> nav.navigate(Routes.waitingRoom(id)) } },
                enabled = !creating,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 16.dp),
            ) {
                if (creating) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp))
                } else {
                    Text("New Game")
                }
            }

            // Join an existing game by entering its code (the game id from an invite).
            var joinCode by remember { mutableStateOf("") }
            Row(verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(
                    value = joinCode,
                    onValueChange = { joinCode = it },
                    singleLine = true,
                    label = { Text("Game code") },
                    modifier = Modifier.weight(1f),
                )
                Spacer(Modifier.width(8.dp))
                OutlinedButton(
                    onClick = {
                        val code = joinCode.trim()
                        if (code.isNotEmpty()) {
                            joinCode = ""
                            nav.navigate(Routes.waitingRoom(code))
                        }
                    },
                    enabled = joinCode.isNotBlank(),
                ) {
                    Text("Join")
                }
            }

            Spacer(Modifier.padding(top = 8.dp))

            Text(
                text = "Recent games",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(bottom = 8.dp),
            )

            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(recentGames, key = { it.id }) { game ->
                    RecentGameRow(
                        game = game,
                        onClick = { nav.navigate(Routes.waitingRoom(game.id)) },
                    )
                }
            }
        }
    }
}

@Composable
private fun RecentGameRow(game: Game, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "Game ${game.id.take(6)}",
                style = MaterialTheme.typography.bodyLarge,
                modifier = Modifier.weight(1f),
            )
            Text(
                text = relativeTime(game.createdAtMs),
                style = MaterialTheme.typography.bodyMedium,
            )
        }
    }
}

private fun relativeTime(createdAtMs: Double): String =
    DateUtils.getRelativeTimeSpanString(
        createdAtMs.toLong(),
        System.currentTimeMillis(),
        DateUtils.MINUTE_IN_MILLIS,
    ).toString()
