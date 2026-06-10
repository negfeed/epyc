package com.negfeed.epyc.ui.screens

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.negfeed.epyc.AppContainer
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/** Drives the Login screen: launches the Google sign-in flow and surfaces errors. */
class LoginViewModel(private val container: AppContainer) : ViewModel() {

    private val _signingIn = MutableStateFlow(false)
    val signingIn: StateFlow<Boolean> = _signingIn.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    fun signIn(context: Context) {
        if (_signingIn.value) return
        viewModelScope.launch {
            _signingIn.value = true
            _error.value = null
            try {
                container.auth.signInWithGoogle(context)
                // On success the root swaps automatically via authState.
            } catch (e: Exception) {
                _error.value = e.message ?: "Sign-in failed. Please try again."
            } finally {
                _signingIn.value = false
            }
        }
    }

    fun clearError() {
        _error.value = null
    }
}
