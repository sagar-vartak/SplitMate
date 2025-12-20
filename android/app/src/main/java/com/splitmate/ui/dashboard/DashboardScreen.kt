package com.splitmate.ui.dashboard

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.splitmate.data.model.Group
import com.splitmate.data.repository.AuthRepository
import com.splitmate.data.repository.GroupRepository
import com.splitmate.ui.notifications.NotificationDropdown
import com.splitmate.ui.components.rememberToastManager
import com.splitmate.ui.components.ToastContainer
import kotlinx.coroutines.launch
import com.google.accompanist.swiperefresh.SwipeRefresh
import com.google.accompanist.swiperefresh.rememberSwipeRefreshState

@Composable
fun DashboardScreen(
    onNavigateToGroup: (String) -> Unit,
    onNavigateToCreateGroup: () -> Unit
) {
    val authRepository = AuthRepository()
    val groupRepository = GroupRepository()
    val scope = rememberCoroutineScope()
    val toastManager = rememberToastManager()

    var currentUser by remember { mutableStateOf<com.splitmate.data.model.User?>(null) }
    var groups by remember { mutableStateOf<List<Group>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var isRefreshing by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val swipeRefreshState = rememberSwipeRefreshState(isRefreshing)

    fun loadGroups() {
        scope.launch {
            try {
                errorMessage = null
                currentUser = authRepository.getCurrentUser()
                if (currentUser != null) {
                    groups = groupRepository.getGroups(currentUser!!.id)
                    toastManager.showSuccess("Refreshed")
                } else {
                    errorMessage = "Not signed in"
                }
            } catch (e: Exception) {
                errorMessage = e.message ?: "Failed to load groups"
                toastManager.showError("Error: ${e.message ?: "Unknown error"}")
            } finally {
                isLoading = false
                isRefreshing = false
            }
        }
    }

    LaunchedEffect(Unit) {
        loadGroups()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("SplitMate") },
                actions = {
                    if (currentUser != null) {
                        NotificationDropdown(
                            userId = currentUser!!.id,
                            onNotificationClick = { notification ->
                                if (notification.groupId != null) {
                                    onNavigateToGroup(notification.groupId)
                                }
                            }
                        )
                    }
                    TextButton(onClick = {
                        scope.launch {
                            try {
                                authRepository.signOut()
                                toastManager.showInfo("Signed out")
                                // Navigate back to login - will be handled by navigation
                            } catch (e: Exception) {
                                toastManager.showError("Failed to sign out: ${e.message}")
                            }
                        }
                    }) {
                        Text("Sign Out")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = onNavigateToCreateGroup) {
                Icon(
                    imageVector = androidx.compose.material.icons.Icons.Default.Add,
                    contentDescription = "Create Group"
                )
            }
        }
    ) { padding ->
        SwipeRefresh(
            state = swipeRefreshState,
            onRefresh = {
                isRefreshing = true
                loadGroups()
            }
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
            ) {
            if (isLoading && !isRefreshing) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            } else if (errorMessage != null && currentUser == null) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = errorMessage ?: "Error",
                            color = MaterialTheme.colorScheme.error
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(onClick = { loadGroups() }) {
                            Text("Retry")
                        }
                    }
                }
            } else if (groups.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "No groups yet",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Medium
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Create your first group to get started",
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.7f)
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(groups) { group ->
                    GroupCard(
                        group = group,
                        onClick = { onNavigateToGroup(group.id) }
                    )
                }
            }
        }
        
        ToastContainer(
            toast = toastManager.currentToast,
            onDismiss = { toastManager.dismiss() }
        )
    }
}

@Composable
fun GroupCard(
    group: Group,
    onClick: () -> Unit
) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = group.name,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold
            )
            if (!group.description.isNullOrEmpty()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = group.description,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.7f)
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "${group.members.size} members",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f)
            )
        }
    }
}

