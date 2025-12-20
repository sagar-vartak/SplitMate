package com.splitmate.ui.invite

import androidx.compose.foundation.layout.*
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
import com.splitmate.ui.components.rememberToastManager
import com.splitmate.ui.components.ToastContainer
import kotlinx.coroutines.launch

@Composable
fun InviteAcceptScreen(
    token: String,
    onAcceptSuccess: (String) -> Unit,
    onNavigateBack: () -> Unit
) {
    val authRepository = AuthRepository()
    val groupRepository = GroupRepository()
    val toastManager = rememberToastManager()
    val scope = rememberCoroutineScope()

    var invitation by remember { mutableStateOf<Map<String, Any>?>(null) }
    var group by remember { mutableStateOf<Group?>(null) }
    var currentUser by remember { mutableStateOf<com.splitmate.data.model.User?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var isAccepting by remember { mutableStateOf(false) }

    LaunchedEffect(token) {
        scope.launch {
            try {
                isLoading = true
                // Get current user
                currentUser = authRepository.getCurrentUser()
                
                if (currentUser == null) {
                    toastManager.showError("Please sign in to accept invitation")
                    onNavigateBack()
                    return@launch
                }

                // Get invitation and group data
                // Note: You'll need to implement getGroupInviteByToken in GroupRepository
                // For now, this is a placeholder
                toastManager.showError("Invitation feature not fully implemented")
                onNavigateBack()
            } catch (e: Exception) {
                toastManager.showError("Failed to load invitation: ${e.message}")
                onNavigateBack()
            } finally {
                isLoading = false
            }
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        if (isLoading) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else if (group == null) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Invalid or expired invitation")
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(onClick = onNavigateBack) {
                        Text("Go Back")
                    }
                }
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    text = "Group Invitation",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(24.dp))
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = group!!.name,
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold
                        )
                        if (!group!!.description.isNullOrEmpty()) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(group!!.description!!)
                        }
                    }
                }
                Spacer(modifier = Modifier.height(24.dp))
                Button(
                    onClick = {
                        scope.launch {
                            isAccepting = true
                            try {
                                val result = groupRepository.acceptInvitation(token, currentUser!!.id)
                                if (result.isSuccess) {
                                    toastManager.showSuccess("Successfully joined group!")
                                    onAcceptSuccess(group!!.id)
                                } else {
                                    toastManager.showError("Failed to accept invitation")
                                }
                            } catch (e: Exception) {
                                toastManager.showError("Failed to accept: ${e.message}")
                            } finally {
                                isAccepting = false
                            }
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !isAccepting
                ) {
                    if (isAccepting) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = MaterialTheme.colorScheme.onPrimary
                        )
                    } else {
                        Text("Accept Invitation")
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
                TextButton(
                    onClick = onNavigateBack,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Cancel")
                }
            }
        }

        ToastContainer(
            toast = toastManager.currentToast,
            onDismiss = { toastManager.dismiss() }
        )
    }
}

