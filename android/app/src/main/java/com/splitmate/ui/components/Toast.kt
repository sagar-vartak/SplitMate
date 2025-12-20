package com.splitmate.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay

enum class ToastType {
    SUCCESS, ERROR, INFO, WARNING
}

data class ToastMessage(
    val message: String,
    val type: ToastType = ToastType.INFO,
    val duration: Long = 3000L
)

@Composable
fun ToastContainer(
    toast: ToastMessage?,
    onDismiss: () -> Unit
) {
    if (toast != null) {
        LaunchedEffect(toast) {
            delay(toast.duration)
            onDismiss()
        }
        
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            contentAlignment = Alignment.TopCenter
        ) {
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = when (toast.type) {
                        ToastType.SUCCESS -> MaterialTheme.colorScheme.primaryContainer
                        ToastType.ERROR -> MaterialTheme.colorScheme.errorContainer
                        ToastType.WARNING -> MaterialTheme.colorScheme.tertiaryContainer
                        ToastType.INFO -> MaterialTheme.colorScheme.surfaceVariant
                    }
                ),
                modifier = Modifier.fillMaxWidth(0.9f)
            ) {
                Text(
                    text = toast.message,
                    modifier = Modifier.padding(16.dp),
                    color = when (toast.type) {
                        ToastType.SUCCESS -> MaterialTheme.colorScheme.onPrimaryContainer
                        ToastType.ERROR -> MaterialTheme.colorScheme.onErrorContainer
                        ToastType.WARNING -> MaterialTheme.colorScheme.onTertiaryContainer
                        ToastType.INFO -> MaterialTheme.colorScheme.onSurfaceVariant
                    }
                )
            }
        }
    }
}

