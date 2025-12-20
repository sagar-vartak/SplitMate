package com.splitmate.data.model

import kotlinx.serialization.Serializable

@Serializable
data class Settlement(
    val id: String? = null,
    val groupId: String,
    val from: String,
    val to: String,
    val amount: Double,
    val markedAsPaid: Boolean = false,
    val markedBy: String? = null,
    val markedAt: String? = null,
    val createdAt: String? = null
)

