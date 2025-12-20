package com.splitmate.data.model

import kotlinx.serialization.Serializable

@Serializable
data class Group(
    val id: String,
    val name: String,
    val description: String? = null,
    val members: List<String>,
    val currency: String = "USD",
    val createdBy: String? = null,
    val createdAt: String
)

