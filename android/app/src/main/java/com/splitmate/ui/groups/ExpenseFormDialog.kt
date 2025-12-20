package com.splitmate.ui.groups

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import com.splitmate.data.model.Expense
import com.splitmate.data.model.ExpenseSplit
import com.splitmate.data.model.Group
import com.splitmate.data.model.User

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExpenseFormDialog(
    group: Group,
    users: List<User>,
    expense: Expense?,
    onDismiss: () -> Unit,
    onSave: (Expense) -> Unit
) {
    var description by remember { mutableStateOf(expense?.description ?: "") }
    var amount by remember { mutableStateOf(expense?.amount?.toString() ?: "") }
    var paidBy by remember { mutableStateOf(expense?.paidBy ?: group.members.firstOrNull() ?: "") }
    var selectedMembers by remember { mutableStateOf(expense?.splitAmong ?: group.members) }
    var splitType by remember { mutableStateOf(expense?.splitType ?: "equal") }
    var customSplits by remember { mutableStateOf<Map<String, Double>>(emptyMap()) }
    var percentageSplits by remember { mutableStateOf<Map<String, Double>>(emptyMap()) }

    // Initialize custom splits if editing unequal expense
    LaunchedEffect(expense) {
        if (expense?.splitType == "unequal" && expense.splits != null) {
            customSplits = expense.splits.associate { it.userId to it.amount }
        } else if (expense?.splitType == "percentage" && expense.splits != null) {
            percentageSplits = expense.splits.associate { it.userId to it.amount }
        }
    }

    val groupUsers = users.filter { it.id in group.members }
    val totalAmount = amount.toDoubleOrNull() ?: 0.0

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (expense == null) "Add Expense" else "Edit Expense") },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("Description") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                OutlinedTextField(
                    value = amount,
                    onValueChange = { amount = it },
                    label = { Text("Amount") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    supportingText = {
                        if (totalAmount > 0) {
                            Text("${group.currency} ${String.format("%.2f", totalAmount)}")
                        }
                    }
                )

                // Paid By Dropdown
                Text("Paid By", style = MaterialTheme.typography.labelMedium)
                var expandedPaidBy by remember { mutableStateOf(false) }
                ExposedDropdownMenuBox(
                    expanded = expandedPaidBy,
                    onExpandedChange = { expandedPaidBy = !expandedPaidBy }
                ) {
                    OutlinedTextField(
                        value = groupUsers.find { it.id == paidBy }?.name ?: "Select",
                        onValueChange = {},
                        readOnly = true,
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedPaidBy) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .menuAnchor()
                    )
                    ExposedDropdownMenu(
                        expanded = expandedPaidBy,
                        onDismissRequest = { expandedPaidBy = false }
                    ) {
                        groupUsers.forEach { user ->
                            DropdownMenuItem(
                                text = { Text(user.name) },
                                onClick = {
                                    paidBy = user.id
                                    expandedPaidBy = false
                                }
                            )
                        }
                    }
                }

                // Split Type Selector
                Text("Split Type", style = MaterialTheme.typography.labelMedium)
                Column(Modifier.selectableGroup()) {
                    listOf("Equal", "Unequal", "Percentage").forEach { type ->
                        val typeValue = type.lowercase()
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .selectable(
                                    selected = splitType == typeValue,
                                    onClick = { splitType = typeValue },
                                    role = Role.RadioButton
                                )
                                .padding(vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            RadioButton(
                                selected = splitType == typeValue,
                                onClick = null
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(type)
                        }
                    }
                }

                // Split Among Checkboxes
                Text("Split Among", style = MaterialTheme.typography.labelMedium)
                groupUsers.forEach { user ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Checkbox(
                            checked = user.id in selectedMembers,
                            onCheckedChange = { checked ->
                                selectedMembers = if (checked) {
                                    selectedMembers + user.id
                                } else {
                                    selectedMembers - user.id
                                }
                            }
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(user.name)
                    }
                }

                // Custom Split Amounts (for unequal)
                if (splitType == "unequal" && totalAmount > 0) {
                    Text("Custom Amounts", style = MaterialTheme.typography.labelMedium)
                    selectedMembers.forEach { memberId ->
                        val user = groupUsers.find { it.id == memberId }
                        if (user != null) {
                            var customAmount by remember {
                                mutableStateOf(
                                    customSplits[memberId]?.toString() ?: ""
                                )
                            }
                            OutlinedTextField(
                                value = customAmount,
                                onValueChange = {
                                    customAmount = it
                                    val amountValue = it.toDoubleOrNull() ?: 0.0
                                    customSplits = customSplits + (memberId to amountValue)
                                },
                                label = { Text("${user.name}'s share") },
                                modifier = Modifier.fillMaxWidth(),
                                supportingText = {
                                    val share = customAmount.toDoubleOrNull() ?: 0.0
                                    val percentage = if (totalAmount > 0) {
                                        (share / totalAmount * 100).toInt()
                                    } else 0
                                    Text("${percentage}% of total")
                                }
                            )
                        }
                    }
                    val totalCustom = customSplits.values.sum()
                    if (totalCustom > 0) {
                        Text(
                            text = "Total: ${group.currency} ${String.format("%.2f", totalCustom)} / ${String.format("%.2f", totalAmount)}",
                            style = MaterialTheme.typography.bodySmall,
                            color = if (kotlin.math.abs(totalCustom - totalAmount) > 0.01) {
                                MaterialTheme.colorScheme.error
                            } else {
                                MaterialTheme.colorScheme.onSurface
                            }
                        )
                    }
                }

                // Percentage Splits
                if (splitType == "percentage" && totalAmount > 0) {
                    Text("Percentage Shares", style = MaterialTheme.typography.labelMedium)
                    selectedMembers.forEach { memberId ->
                        val user = groupUsers.find { it.id == memberId }
                        if (user != null) {
                            var percentage by remember {
                                mutableStateOf(
                                    percentageSplits[memberId]?.toString() ?: ""
                                )
                            }
                            OutlinedTextField(
                                value = percentage,
                                onValueChange = {
                                    percentage = it
                                    val pct = it.toDoubleOrNull() ?: 0.0
                                    percentageSplits = percentageSplits + (memberId to pct)
                                },
                                label = { Text("${user.name}'s percentage") },
                                modifier = Modifier.fillMaxWidth(),
                                suffix = { Text("%") },
                                supportingText = {
                                    val pct = percentage.toDoubleOrNull() ?: 0.0
                                    val share = totalAmount * (pct / 100.0)
                                    Text("${group.currency} ${String.format("%.2f", share)}")
                                }
                            )
                        }
                    }
                    val totalPercentage = percentageSplits.values.sum()
                    if (totalPercentage > 0) {
                        Text(
                            text = "Total: ${String.format("%.1f", totalPercentage)}%",
                            style = MaterialTheme.typography.bodySmall,
                            color = if (kotlin.math.abs(totalPercentage - 100.0) > 0.1) {
                                MaterialTheme.colorScheme.error
                            } else {
                                MaterialTheme.colorScheme.onSurface
                            }
                        )
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val expenseAmount = amount.toDoubleOrNull() ?: 0.0
                    val expenseId = expense?.id ?: "expense-${System.currentTimeMillis()}"

                    val splits = when (splitType) {
                        "unequal" -> customSplits.map { (userId, amount) ->
                            ExpenseSplit(userId, amount)
                        }
                        "percentage" -> percentageSplits.map { (userId, percentage) ->
                            ExpenseSplit(userId, percentage) // Store percentage, will calculate in backend
                        }
                        else -> null
                    }

                    onSave(
                        Expense(
                            id = expenseId,
                            groupId = group.id,
                            description = description.trim(),
                            amount = expenseAmount,
                            paidBy = paidBy,
                            splitAmong = selectedMembers,
                            splitType = splitType,
                            splits = splits,
                            createdAt = expense?.createdAt ?: java.time.Instant.now().toString(),
                            updatedAt = java.time.Instant.now().toString()
                        )
                    )
                },
                enabled = description.isNotBlank() &&
                        amount.toDoubleOrNull() != null &&
                        amount.toDoubleOrNull()!! > 0 &&
                        paidBy.isNotBlank() &&
                        selectedMembers.isNotEmpty() &&
                        when (splitType) {
                            "unequal" -> {
                                val total = customSplits.values.sum()
                                kotlin.math.abs(total - totalAmount) < 0.01
                            }
                            "percentage" -> {
                                val total = percentageSplits.values.sum()
                                kotlin.math.abs(total - 100.0) < 0.1
                            }
                            else -> true
                        }
            ) {
                Text("Save")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}

