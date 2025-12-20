package com.splitmate.data.model

import kotlinx.serialization.Serializable

@Serializable
data class Notification(
    val id: String,
    val userId: String,
    val type: String, // "expense_added", "member_added", "settlement_marked", etc.
    val title: String,
    val message: String,
    val groupId: String? = null,
    val expenseId: String? = null,
    val settlementId: String? = null,
    val read: Boolean = false,
    val createdAt: String
)

