package com.splitmate.data.model

import kotlinx.serialization.Serializable

@Serializable
data class Balance(
    val userId: String,
    val amount: Double
)

