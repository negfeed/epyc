package com.negfeed.epyc.ui.screens

import android.content.Intent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.negfeed.epyc.LocalAppContainer
import com.negfeed.epyc.core.Destination
import com.negfeed.epyc.core.GameUser
import com.negfeed.epyc.ui.navigation.ObserveGameNavigation

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WaitingRoomScreen(nav: NavController, gameId: String) {
    val container = LocalAppContainer.current
    val context = LocalContext.current

    // Router: leaves this screen automatically when the game state requires it.
    ObserveGameNavigation(container, nav, gameId, Destination.WAITING_ROOM)

    val vm: WaitingRoomViewModel = viewModel { WaitingRoomViewModel(container, gameId) }
    val game by vm.game.collectAsStateWithLifecycle()

    // Register the current user as a watcher once the game is loaded.
    LaunchedEffect(game) {
        game?.let { vm.ensureMembership(it) }
    }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Waiting Room") }) },
    ) { padding ->
        val current = game
        if (current == null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator()
            }
            return@Scaffold
        }

        val uid = vm.uid
        val isHost = uid == current.creatorUid
        val isJoined = current.users[uid]?.joined == true

        val (joinedUsers, watchingUsers) = current.users.values.partition { it.joined }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
        ) {
            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                item {
                    Text(
                        text = "Joined (${joinedUsers.size})",
                        style = MaterialTheme.typography.titleMedium,
                    )
                }
                items(joinedUsers, key = { it.uid }) { user ->
                    UserRow(user = user, isHost = user.uid == current.creatorUid)
                }

                item {
                    Spacer(Modifier.padding(top = 8.dp))
                    Text(
                        text = "Watching (${watchingUsers.size})",
                        style = MaterialTheme.typography.titleMedium,
                    )
                }
                items(watchingUsers, key = { it.uid }) { user ->
                    UserRow(user = user, isHost = user.uid == current.creatorUid)
                }
            }

            // Action buttons.
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                // Game code — read it onto another device's "Join with code" field.
                Text(
                    text = "Code: $gameId",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )

                OutlinedButton(
                    onClick = {
                        val send = Intent(Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(
                                // https App Link — opens the app once assetlinks.json is
                                // hosted at https://epycnative.negfeed.com/.well-known/.
                                Intent.EXTRA_TEXT,
                                "https://epycnative.negfeed.com/game/$gameId",
                            )
                        }
                        context.startActivity(Intent.createChooser(send, "Invite"))
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text("Invite")
                }

                if (!isJoined && !isHost) {
                    Button(
                        onClick = { vm.setJoined(true) },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text("Join")
                    }
                }

                if (isJoined && !isHost) {
                    OutlinedButton(
                        onClick = { vm.setJoined(false) },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text("Leave")
                    }
                }

                if (isHost) {
                    Button(
                        onClick = { vm.start() },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text("Start Game")
                    }
                }
            }
        }
    }
}

@Composable
private fun UserRow(user: GameUser, isHost: Boolean) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AsyncImage(
            model = user.photoURL,
            contentDescription = null,
            modifier = Modifier
                .size(40.dp)
                .clip(CircleShape),
        )
        Spacer(Modifier.width(12.dp))
        Text(
            text = user.displayName,
            style = MaterialTheme.typography.bodyLarge,
            modifier = Modifier.weight(1f),
        )
        if (isHost) {
            Text(
                text = "Host",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.primary,
            )
        }
    }
}
