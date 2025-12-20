package com.splitmate.data.model

import kotlinx.serialization.Serializable

@Serializable
data class Expense(
    val id: String,
    val groupId: String,
    val description: String,
    val amount: Double,
    val paidBy: String,
    val splitAmong: List<String>,
    val splitType: String, // "equal", "unequal", "percentage"
    val splits: List<ExpenseSplit>? = null,
    val createdAt: String,
    val updatedAt: String? = null
)

@Serializable
data class ExpenseSplit(
    val userId: String,
    val amount: Double
)

