package com.splitmate.ui.groups

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.splitmate.data.model.Group
import com.splitmate.data.repository.AuthRepository
import com.splitmate.data.repository.GroupRepository
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateGroupScreen(
    onNavigateBack: () -> Unit,
    onGroupCreated: (String) -> Unit
) {
    val authRepository = AuthRepository()
    val groupRepository = GroupRepository()
    val scope = rememberCoroutineScope()

    var groupName by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var currency by remember { mutableStateOf("USD") }
    var isLoading by remember { mutableStateOf(false) }
    var currentUserId by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        val user = authRepository.getCurrentUser()
        currentUserId = user?.id
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Create Group") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            OutlinedTextField(
                value = groupName,
                onValueChange = { groupName = it },
                label = { Text("Group Name") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                label = { Text("Description (optional)") },
                modifier = Modifier.fillMaxWidth(),
                maxLines = 3
            )

            // Currency selector
            Text(
                text = "Currency",
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium
            )
            val currencies = listOf("USD", "EUR", "GBP", "INR", "JPY", "CAD", "AUD")
            currencies.forEach { curr ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = androidx.compose.ui.Alignment.CenterVertically
                ) {
                    RadioButton(
                        selected = currency == curr,
                        onClick = { currency = curr }
                    )
                    Text(
                        text = curr,
                        modifier = Modifier.padding(start = 8.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            Button(
                onClick = {
                    if (groupName.isNotBlank() && currentUserId != null) {
                        scope.launch {
                            isLoading = true
                            try {
                                val newGroup = Group(
                                    id = System.currentTimeMillis().toString(),
                                    name = groupName.trim(),
                                    description = description.takeIf { it.isNotBlank() },
                                    members = listOf(currentUserId!!),
                                    currency = currency,
                                    createdBy = currentUserId,
                                    createdAt = java.time.Instant.now().toString()
                                )
                                val result = groupRepository.createGroup(newGroup, currentUserId!!)
                                if (result.isSuccess) {
                                    onGroupCreated(newGroup.id)
                                }
                            } finally {
                                isLoading = false
                            }
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = groupName.isNotBlank() && !isLoading && currentUserId != null
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Text("Create Group")
                }
            }
        }
    }
}

