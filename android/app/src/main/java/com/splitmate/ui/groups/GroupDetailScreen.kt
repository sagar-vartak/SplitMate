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
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GroupDetailScreen(
    groupId: String,
    currentUserId: String,
    onNavigateBack: () -> Unit,
    onNavigateToExpense: (String?) -> Unit
) {
    val groupRepository = GroupRepository()
    val expenseRepository = ExpenseRepository()
    val settlementRepository = SettlementRepository()
    val userRepository = UserRepository()
    val scope = rememberCoroutineScope()

    var group by remember { mutableStateOf<Group?>(null) }
    var expenses by remember { mutableStateOf<List<Expense>>(emptyList()) }
    var balances by remember { mutableStateOf<List<Balance>>(emptyList()) }
    var settlements by remember { mutableStateOf<List<Settlement>>(emptyList()) }
    var savedSettlements by remember { mutableStateOf<List<Settlement>>(emptyList()) }
    var users by remember { mutableStateOf<List<User>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var showExpenseForm by remember { mutableStateOf(false) }
    var expenseToEdit by remember { mutableStateOf<Expense?>(null) }

    fun loadGroupData() {
        scope.launch {
            try {
                isLoading = true
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
                }
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(groupId) {
        loadGroupData()
    }

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
                    IconButton(onClick = { /* Settings */ }) {
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
        if (isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else if (group == null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                Text("Group not found")
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
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
                                val updatedSettlement = settlement.copy(
                                    markedAsPaid = true,
                                    markedBy = currentUserId,
                                    markedAt = java.time.Instant.now().toString()
                                )
                                settlementRepository.saveSettlement(updatedSettlement)
                                loadGroupData()
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
                            scope.launch {
                                expenseRepository.deleteExpense(expense.id)
                                loadGroupData()
                            }
                        }
                    )
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
                    expenseRepository.saveExpense(expense)
                    loadGroupData()
                    showExpenseForm = false
                    expenseToEdit = null
                }
            }
        )
    }
}

@Composable
fun BalanceCard(balance: Balance, users: List<User>) {
    val user = users.find { it.id == balance.userId }
    val userName = user?.name ?: "User ${balance.userId.take(8)}"
    val isPositive = balance.amount > 0.001
    val isNegative = balance.amount < -0.001
    
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = when {
                isPositive -> MaterialTheme.colorScheme.primaryContainer
                isNegative -> MaterialTheme.colorScheme.errorContainer
                else -> MaterialTheme.colorScheme.surface
            }
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = userName,
                fontSize = 16.sp,
                fontWeight = FontWeight.Medium
            )
            Text(
                text = when {
                    isPositive -> "Gets back ${formatCurrency(balance.amount)}"
                    isNegative -> "Owes ${formatCurrency(-balance.amount)}"
                    else -> "Settled up"
                },
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = when {
                    isPositive -> MaterialTheme.colorScheme.primary
                    isNegative -> MaterialTheme.colorScheme.error
                    else -> MaterialTheme.colorScheme.onSurface
                }
            )
        }
    }
}

@Composable
fun SettlementCard(
    settlement: Settlement,
    users: List<User>,
    currency: String,
    onMarkPaid: () -> Unit
) {
    val fromUser = users.find { it.id == settlement.from }
    val toUser = users.find { it.id == settlement.to }
    val fromName = fromUser?.name ?: "User ${settlement.from.take(8)}"
    val toName = toUser?.name ?: "User ${settlement.to.take(8)}"
    
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = if (settlement.markedAsPaid) {
                MaterialTheme.colorScheme.surfaceVariant
            } else {
                MaterialTheme.colorScheme.surface
            }
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Text(
                text = "$fromName owes $toName",
                fontSize = 16.sp,
                fontWeight = FontWeight.Medium
            )
            Text(
                text = formatCurrency(settlement.amount, currency),
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
            if (!settlement.markedAsPaid) {
                Spacer(modifier = Modifier.height(8.dp))
                Button(
                    onClick = onMarkPaid,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Mark Paid")
                }
            } else {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "✓ Paid",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}

@Composable
fun ExpenseCard(
    expense: Expense,
    users: List<User>,
    currency: String,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    val paidByUser = users.find { it.id == expense.paidBy }
    val paidByName = paidByUser?.name ?: "User ${expense.paidBy.take(8)}"
    
    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = expense.description,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Paid by $paidByName",
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                    )
                }
                Text(
                    text = formatCurrency(expense.amount, currency),
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            Row {
                TextButton(onClick = onEdit) {
                    Text("Edit")
                }
                Spacer(modifier = Modifier.width(8.dp))
                TextButton(
                    onClick = onDelete,
                    colors = ButtonDefaults.textButtonColors(
                        contentColor = MaterialTheme.colorScheme.error
                    )
                ) {
                    Text("Delete")
                }
            }
        }
    }
}

fun formatCurrency(amount: Double, currency: String = "USD"): String {
    val formatter = NumberFormat.getCurrencyInstance(Locale.US)
    // Simple currency formatting - you can enhance this
    return when (currency) {
        "USD" -> "$${String.format("%.2f", amount)}"
        "EUR" -> "€${String.format("%.2f", amount)}"
        "GBP" -> "£${String.format("%.2f", amount)}"
        "INR" -> "₹${String.format("%.2f", amount)}"
        else -> "${String.format("%.2f", amount)} $currency"
    }
}

