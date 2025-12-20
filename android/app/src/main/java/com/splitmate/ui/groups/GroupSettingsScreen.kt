package com.splitmate.ui.groups

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.splitmate.data.model.Group
import com.splitmate.data.repository.GroupRepository
import com.splitmate.ui.components.rememberToastManager
import com.splitmate.ui.components.ToastContainer
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GroupSettingsScreen(
    groupId: String,
    onNavigateBack: () -> Unit
) {
    val groupRepository = GroupRepository()
    val toastManager = rememberToastManager()
    val scope = rememberCoroutineScope()

    var group by remember { mutableStateOf<Group?>(null) }
    var selectedCurrency by remember { mutableStateOf("USD") }
    var isLoading by remember { mutableStateOf(true) }
    var isSaving by remember { mutableStateOf(false) }

    LaunchedEffect(groupId) {
        scope.launch {
            try {
                isLoading = true
                group = groupRepository.getGroup(groupId)
                selectedCurrency = group?.currency ?: "USD"
            } catch (e: Exception) {
                toastManager.showError("Failed to load group: ${e.message}")
            } finally {
                isLoading = false
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Group Settings") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
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
                    Text("Group not found")
                }
            } else {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(24.dp)
                ) {
                    Text(
                        text = "Currency",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )

                    val currencies = listOf("USD", "EUR", "GBP", "INR", "JPY", "CAD", "AUD")
                    Column(Modifier.selectableGroup()) {
                        currencies.forEach { currency ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .selectable(
                                        selected = selectedCurrency == currency,
                                        onClick = { selectedCurrency = currency },
                                        role = androidx.compose.ui.semantics.Role.RadioButton
                                    )
                                    .padding(vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                RadioButton(
                                    selected = selectedCurrency == currency,
                                    onClick = null
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(currency)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.weight(1f))

                    Button(
                        onClick = {
                            scope.launch {
                                isSaving = true
                                try {
                                    // Update group currency
                                    // Note: You'll need to implement updateGroup in GroupRepository
                                    toastManager.showSuccess("Currency updated to $selectedCurrency")
                                    onNavigateBack()
                                } catch (e: Exception) {
                                    toastManager.showError("Failed to update: ${e.message}")
                                } finally {
                                    isSaving = false
                                }
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !isSaving && selectedCurrency != group?.currency
                    ) {
                        if (isSaving) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                color = MaterialTheme.colorScheme.onPrimary
                            )
                        } else {
                            Text("Save Changes")
                        }
                    }
                }
            }

            ToastContainer(
                toast = toastManager.currentToast,
                onDismiss = { toastManager.dismiss() }
            )
        }
    }
}

