package com.negfeed.epyc

import androidx.compose.runtime.staticCompositionLocalOf
import com.negfeed.epyc.auth.AuthRepository
import com.negfeed.epyc.data.DrawingRepository
import com.negfeed.epyc.data.FirestoreRefs
import com.negfeed.epyc.data.GameRepository
import com.negfeed.epyc.data.UserRepository

/** Manual DI container (no Hilt needed for an app this size). */
class AppContainer {
    private val refs = FirestoreRefs()
    val auth = AuthRepository()
    val games = GameRepository(refs)
    val drawings = DrawingRepository(refs)
    val users = UserRepository(refs)
}

/** Provides the container to the composable tree. */
val LocalAppContainer = staticCompositionLocalOf<AppContainer> {
    error("AppContainer not provided")
}
