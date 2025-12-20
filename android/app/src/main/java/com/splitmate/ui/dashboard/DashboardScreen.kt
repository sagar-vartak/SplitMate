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
import kotlinx.coroutines.launch

@Composable
fun DashboardScreen(
    onNavigateToGroup: (String) -> Unit,
    onNavigateToCreateGroup: () -> Unit
) {
    val authRepository = AuthRepository()
    val groupRepository = GroupRepository()
    val scope = rememberCoroutineScope()

    var currentUser by remember { mutableStateOf<com.splitmate.data.model.User?>(null) }
    var groups by remember { mutableStateOf<List<Group>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        currentUser = authRepository.getCurrentUser()
        if (currentUser != null) {
            groups = groupRepository.getGroups(currentUser!!.id)
        }
        isLoading = false
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("SplitMate") },
                actions = {
                    TextButton(onClick = {
                        scope.launch {
                            authRepository.signOut()
                            // Navigate back to login - will be handled by navigation
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
        if (isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
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

