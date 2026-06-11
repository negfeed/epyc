package com.negfeed.epyc.auth

import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import com.negfeed.epyc.R
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

/** Minimal user identity (ports AuthUserInfo from auth.ts). */
data class AuthUser(val uid: String, val displayName: String, val photoURL: String?)

/**
 * Firebase Auth with Google sign-in via Credential Manager (Facebook removed).
 * Apple-on-Android can be added later via a Firebase OAuth provider flow.
 */
class AuthRepository(private val auth: FirebaseAuth = FirebaseAuth.getInstance()) {

    val authState: Flow<AuthUser?> = callbackFlow {
        val listener = FirebaseAuth.AuthStateListener { fb ->
            trySend(fb.currentUser?.let(::map))
        }
        auth.addAuthStateListener(listener)
        awaitClose { auth.removeAuthStateListener(listener) }
    }

    fun current(): AuthUser? = auth.currentUser?.let(::map)

    private fun map(u: com.google.firebase.auth.FirebaseUser): AuthUser =
        AuthUser(
            uid = u.uid,
            displayName = u.displayName ?: u.providerData.firstOrNull()?.displayName ?: "Player",
            photoURL = (u.photoUrl ?: u.providerData.firstOrNull()?.photoUrl)?.toString(),
        )

    /**
     * Launches the Google credential flow and signs into Firebase. Uses
     * `GetGoogleIdOption` (returns an ID token directly) rather than the assisted
     * `GetSignInWithGoogleOption` flow, which fails on its final
     * UPDATE_DEFAULT_GOOGLE_ACCOUNT step ("Developer console is not set up correctly").
     * Falls back to showing all accounts if no previously-authorized one is found.
     */
    suspend fun signInWithGoogle(context: Context) {
        val credentialManager = CredentialManager.create(context)
        val webClientId = context.getString(R.string.default_web_client_id)

        suspend fun request(filterByAuthorized: Boolean): GoogleIdTokenCredential {
            val option = GetGoogleIdOption.Builder()
                .setServerClientId(webClientId)
                .setFilterByAuthorizedAccounts(filterByAuthorized)
                .setAutoSelectEnabled(false)
                .build()
            val request = GetCredentialRequest.Builder().addCredentialOption(option).build()
            val result = credentialManager.getCredential(context, request)
            return GoogleIdTokenCredential.createFrom(result.credential.data)
        }

        // First try only previously-authorized accounts; if none, show all accounts.
        val googleId = try {
            request(filterByAuthorized = true)
        } catch (e: androidx.credentials.exceptions.NoCredentialException) {
            request(filterByAuthorized = false)
        }

        val firebaseCredential = GoogleAuthProvider.getCredential(googleId.idToken, null)
        auth.signInWithCredential(firebaseCredential).await()
    }

    fun signOut() = auth.signOut()
}
