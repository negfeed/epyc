package com.negfeed.epyc

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.negfeed.epyc.ui.navigation.EpycApp
import com.negfeed.epyc.ui.theme.EpycTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val container = (application as? EpycApplication)?.let { AppContainer() } ?: AppContainer()
        val startGameId = parseInviteGameId(intent)

        setContent {
            EpycTheme {
                EpycApp(container = container, startGameId = startGameId)
            }
        }
    }

    /** Parses com.negfeed.epycnative://game/{id} and https://<domain>/game/{id} invite links. */
    private fun parseInviteGameId(intent: Intent?): String? {
        val data = intent?.data ?: return null
        val segments = data.pathSegments
        val idx = segments.indexOf("game")
        if (idx >= 0 && idx + 1 < segments.size) return segments[idx + 1]
        if (data.host == "game") return segments.firstOrNull()
        return null
    }
}
