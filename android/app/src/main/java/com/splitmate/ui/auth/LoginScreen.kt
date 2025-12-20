package com.splitmate.ui.auth

import android.content.Context
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.splitmate.data.repository.AuthRepository
import com.splitmate.ui.components.rememberToastManager
import com.splitmate.ui.components.ToastContainer
import kotlinx.coroutines.launch

@Composable
fun LoginScreen(onSignInSuccess: () -> Unit) {
    val authRepository = AuthRepository()
    val toastManager = rememberToastManager()
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var isLoading by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        // Check if user is already signed in
        val currentUser = authRepository.getCurrentUser()
        if (currentUser != null) {
            onSignInSuccess()
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // App Logo/Title
            Text(
                text = "SplitMate",
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = "Split expenses with friends",
                fontSize = 16.sp,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.7f)
            )

            Spacer(modifier = Modifier.height(48.dp))

            // Sign in button
            Button(
                onClick = {
                    scope.launch {
                        isLoading = true
                        try {
                            val result = authRepository.signInWithGoogle(context)
                            if (result.isSuccess) {
                                toastManager.showSuccess("Signing in...")
                                // Wait a bit for OAuth to complete
                                kotlinx.coroutines.delay(1000)
                                val user = authRepository.getCurrentUser()
                                if (user != null) {
                                    toastManager.showSuccess("Welcome, ${user.name}! 👋")
                                    onSignInSuccess()
                                }
                            } else {
                                toastManager.showError("Failed to sign in. Please try again.")
                            }
                        } catch (e: Exception) {
                            toastManager.showError("Error: ${e.message ?: "Unknown error"}")
                        } finally {
                            isLoading = false
                        }
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                enabled = !isLoading
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Text("Sign in with Google")
                }
            }
        }
        
        // Toast Container
        ToastContainer(
            toast = toastManager.currentToast,
            onDismiss = { toastManager.dismiss() }
        )
    }
}
