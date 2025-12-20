package com.splitmate.ui.notifications

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.splitmate.data.model.Notification
import com.splitmate.data.repository.NotificationRepository
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.format.DateTimeFormatter

@Composable
fun NotificationDropdown(
    userId: String,
    onNotificationClick: (Notification) -> Unit
) {
    val notificationRepository = NotificationRepository()
    val scope = rememberCoroutineScope()
    
    var notifications by remember { mutableStateOf<List<Notification>>(emptyList()) }
    var unreadCount by remember { mutableStateOf(0) }
    var isOpen by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(true) }

    LaunchedEffect(userId) {
        loadNotifications()
    }

    fun loadNotifications() {
        scope.launch {
            try {
                isLoading = true
                notifications = notificationRepository.getNotifications(userId)
                unreadCount = notificationRepository.getUnreadCount(userId)
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                isLoading = false
            }
        }
    }

    Box {
        IconButton(
            onClick = {
                isOpen = !isOpen
                if (isOpen && unreadCount > 0) {
                    scope.launch {
                        notificationRepository.markAllAsRead(userId)
                        unreadCount = 0
                        loadNotifications()
                    }
                }
            }
        ) {
            BadgedBox(
                badge = {
                    if (unreadCount > 0) {
                        Badge {
                            Text(if (unreadCount > 9) "9+" else unreadCount.toString())
                        }
                    }
                }
            ) {
                Icon(
                    Icons.Default.Notifications,
                    contentDescription = "Notifications"
                )
            }
        }

        DropdownMenu(
            expanded = isOpen,
            onDismissRequest = { isOpen = false },
            modifier = Modifier.width(320.dp)
        ) {
            if (isLoading) {
                DropdownMenuItem(
                    text = { Text("Loading...") },
                    onClick = {}
                )
            } else if (notifications.isEmpty()) {
                DropdownMenuItem(
                    text = { Text("No notifications") },
                    onClick = {}
                )
            } else {
                notifications.forEach { notification ->
                    DropdownMenuItem(
                        text = {
                            Column {
                                Text(
                                    text = notification.title,
                                    fontWeight = if (!notification.read) FontWeight.Bold else FontWeight.Normal,
                                    fontSize = 14.sp
                                )
                                Text(
                                    text = notification.message,
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                                )
                                Text(
                                    text = formatRelativeTime(notification.createdAt),
                                    fontSize = 10.sp,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                                )
                            }
                        },
                        onClick = {
                            scope.launch {
                                if (!notification.read) {
                                    notificationRepository.markAsRead(notification.id, userId)
                                }
                                isOpen = false
                                onNotificationClick(notification)
                            }
                        },
                        trailingIcon = {
                            if (!notification.read) {
                                Box(
                                    modifier = Modifier.size(8.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Card(
                                        modifier = Modifier.fillMaxSize(),
                                        colors = CardDefaults.cardColors(
                                            containerColor = MaterialTheme.colorScheme.primary
                                        )
                                    ) {}
                                }
                            }
                        }
                    )
                }
            }
        }
    }
}

fun formatRelativeTime(dateString: String): String {
    return try {
        val instant = Instant.parse(dateString)
        val now = Instant.now()
        val diffSeconds = now.epochSecond - instant.epochSecond
        
        when {
            diffSeconds < 60 -> "${diffSeconds}s ago"
            diffSeconds < 3600 -> "${diffSeconds / 60}m ago"
            diffSeconds < 86400 -> "${diffSeconds / 3600}h ago"
            diffSeconds < 604800 -> "${diffSeconds / 86400}d ago"
            else -> DateTimeFormatter.ofPattern("MMM d").format(instant)
        }
    } catch (e: Exception) {
        "Recently"
    }
}

