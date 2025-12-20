package com.splitmate.ui.components

import androidx.compose.runtime.*

@Composable
fun rememberToastManager(): ToastManager {
    return remember { ToastManager() }
}

class ToastManager {
    var currentToast by mutableStateOf<ToastMessage?>(null)
        private set

    fun showSuccess(message: String, duration: Long = 3000L) {
        currentToast = ToastMessage(message, ToastType.SUCCESS, duration)
    }

    fun showError(message: String, duration: Long = 3000L) {
        currentToast = ToastMessage(message, ToastType.ERROR, duration)
    }

    fun showInfo(message: String, duration: Long = 3000L) {
        currentToast = ToastMessage(message, ToastType.INFO, duration)
    }

    fun showWarning(message: String, duration: Long = 3000L) {
        currentToast = ToastMessage(message, ToastType.WARNING, duration)
    }

    fun dismiss() {
        currentToast = null
    }
}

