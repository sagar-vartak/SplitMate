package com.splitmate.ui.groups

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.splitmate.data.model.*
import com.splitmate.data.repository.*
import com.splitmate.utils.Calculations
import com.splitmate.ui.components.rememberToastManager
import com.splitmate.ui.components.ToastContainer
import com.splitmate.ui.components.ConfirmationDialog
import com.splitmate.ui.notifications.NotificationDropdown
import kotlinx.coroutines.launch
import com.google.accompanist.swiperefresh.SwipeRefresh
import com.google.accompanist.swiperefresh.rememberSwipeRefreshState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GroupDetailScreenEnhanced(
    groupId: String,
    currentUserId: String,
    onNavigateBack: () -> Unit,
    onNavigateToExpense: (String?) -> Unit,
    onNavigateToSettings: (String) -> Unit
) {
    val groupRepository = GroupRepository()
    val expenseRepository = ExpenseRepository()
    val settlementRepository = SettlementRepository()
    val userRepository = UserRepository()
    val scope = rememberCoroutineScope()
    val toastManager = rememberToastManager()

    var group by remember { mutableStateOf<Group?>(null) }
    var expenses by remember { mutableStateOf<List<Expense>>(emptyList()) }
    var balances by remember { mutableStateOf<List<Balance>>(emptyList()) }
    var settlements by remember { mutableStateOf<List<Settlement>>(emptyList()) }
    var savedSettlements by remember { mutableStateOf<List<Settlement>>(emptyList()) }
    var users by remember { mutableStateOf<List<User>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var isRefreshing by remember { mutableStateOf(false) }
    var showExpenseForm by remember { mutableStateOf(false) }
    var expenseToEdit by remember { mutableStateOf<Expense?>(null) }
    var showDeleteConfirm by remember { mutableStateOf<Expense?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val swipeRefreshState = rememberSwipeRefreshState(isRefreshing)

    fun loadGroupData() {
        scope.launch {
            try {
                errorMessage = null
                val loadedGroup = groupRepository.getGroup(groupId)
                if (loadedGroup != null) {
                    group = loadedGroup
                    
                    // Load expenses
                    val loadedExpenses = expenseRepository.getExpensesByGroup(groupId)
                    expenses = loadedExpenses
                    
                    // Calculate balances
                    val calculatedBalances = Calculations.calculateGroupBalances(
                        loadedExpenses,
                        loadedGroup.members
                    )
                    balances = calculatedBalances
                    
                    // Load saved settlements
                    savedSettlements = settlementRepository.getSettlementsByGroup(groupId)
                    
                    // Calculate settlements
                    val calculatedSettlements = Calculations.calculateSettlements(calculatedBalances)
                    settlements = calculatedSettlements.map { it.copy(groupId = groupId) }
                    
                    // Load users for display
                    val allUserIds = loadedGroup.members.toSet()
                    users = userRepository.getUsers(allUserIds.toList())
                    
                    toastManager.showSuccess("Data refreshed")
                } else {
                    errorMessage = "Group not found"
                    toastManager.showError("Group not found")
                }
            } catch (e: Exception) {
                errorMessage = e.message ?: "Failed to load data"
                toastManager.showError("Error: ${e.message ?: "Unknown error"}")
                e.printStackTrace()
            } finally {
                isLoading = false
                isRefreshing = false
            }
        }
    }

    LaunchedEffect(groupId) {
        loadGroupData()
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text(group?.name ?: "Group") },
                    navigationIcon = {
                        IconButton(onClick = onNavigateBack) {
                            Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                        }
                    },
                    actions = {
                        NotificationDropdown(
                            userId = currentUserId,
                            onNotificationClick = { notification ->
                                if (notification.groupId != null) {
                                    // Navigate to group if notification is group-related
                                }
                            }
                        )
                        IconButton(onClick = { onNavigateToSettings(groupId) }) {
                            Icon(Icons.Default.Settings, contentDescription = "Settings")
                        }
                    }
                )
            },
            floatingActionButton = {
                FloatingActionButton(
                    onClick = {
                        expenseToEdit = null
                        showExpenseForm = true
                    }
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Add Expense")
                }
            }
        ) { padding ->
            SwipeRefresh(
                state = swipeRefreshState,
                onRefresh = {
                    isRefreshing = true
                    loadGroupData()
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
                } else if (errorMessage != null && group == null) {
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
                            Button(onClick = { loadGroupData() }) {
                                Text("Retry")
                            }
                        }
                    }
                } else if (group != null) {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        // Balances Section
                        item {
                            Text(
                                text = "Balances",
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        items(balances) { balance ->
                            BalanceCard(balance = balance, users = users)
                        }

                        // Settlements Section
                        item {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Settlements",
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        items(settlements) { settlement ->
                            SettlementCard(
                                settlement = settlement,
                                users = users,
                                currency = group?.currency ?: "USD",
                                onMarkPaid = {
                                    scope.launch {
                                        try {
                                            val updatedSettlement = settlement.copy(
                                                markedAsPaid = true,
                                                markedBy = currentUserId,
                                                markedAt = java.time.Instant.now().toString()
                                            )
                                            settlementRepository.saveSettlement(updatedSettlement)
                                            toastManager.showSuccess("Settlement marked as paid")
                                            loadGroupData()
                                        } catch (e: Exception) {
                                            toastManager.showError("Failed to mark settlement: ${e.message}")
                                        }
                                    }
                                }
                            )
                        }

                        // Expenses Section
                        item {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Expenses",
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        items(expenses) { expense ->
                            ExpenseCard(
                                expense = expense,
                                users = users,
                                currency = group?.currency ?: "USD",
                                onEdit = {
                                    expenseToEdit = expense
                                    showExpenseForm = true
                                },
                                onDelete = {
                                    showDeleteConfirm = expense
                                }
                            )
                        }
                    }
                }
            }
        }

        // Expense Form Dialog
        if (showExpenseForm && group != null) {
            ExpenseFormDialog(
                group = group!!,
                users = users,
                expense = expenseToEdit,
                onDismiss = {
                    showExpenseForm = false
                    expenseToEdit = null
                },
                onSave = { expense ->
                    scope.launch {
                        try {
                            expenseRepository.saveExpense(expense)
                            toastManager.showSuccess(
                                if (expenseToEdit == null) "Expense added" else "Expense updated"
                            )
                            loadGroupData()
                            showExpenseForm = false
                            expenseToEdit = null
                        } catch (e: Exception) {
                            toastManager.showError("Failed to save expense: ${e.message}")
                        }
                    }
                }
            )
        }

        // Delete Confirmation Dialog
        showDeleteConfirm?.let { expense ->
            ConfirmationDialog(
                title = "Delete Expense",
                message = "Are you sure you want to delete '${expense.description}'?",
                confirmText = "Delete",
                dismissText = "Cancel",
                onConfirm = {
                    scope.launch {
                        try {
                            expenseRepository.deleteExpense(expense.id)
                            toastManager.showSuccess("Expense deleted")
                            loadGroupData()
                            showDeleteConfirm = null
                        } catch (e: Exception) {
                            toastManager.showError("Failed to delete expense: ${e.message}")
                        }
                    }
                },
                onDismiss = { showDeleteConfirm = null }
            )
        }

        // Toast Container
        ToastContainer(
            toast = toastManager.currentToast,
            onDismiss = { toastManager.dismiss() }
        )
    }
}

// Reuse card components from GroupDetailScreen.kt
// These are defined in the same package, so they're accessible

