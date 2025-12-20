package com.splitmate.data.repository

import com.splitmate.data.SupabaseClient
import com.splitmate.data.model.Notification
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import kotlinx.serialization.Serializable

@Serializable
data class NotificationRow(
    val id: String,
    val user_id: String,
    val type: String,
    val title: String,
    val message: String,
    val group_id: String?,
    val expense_id: String?,
    val settlement_id: String?,
    val read: Boolean,
    val created_at: String
)

class NotificationRepository {
    private val supabase = SupabaseClient.client

    suspend fun getNotifications(userId: String): List<Notification> {
        return try {
            val notifications = supabase.postgrest.from("notifications")
                .select(columns = Columns.ALL) {
                    filter {
                        eq("user_id", userId)
                    }
                }
                .order("created_at", ascending = false)
                .limit(50)
                .decodeList<NotificationRow>()

            notifications.map { row ->
                Notification(
                    id = row.id,
                    userId = row.user_id,
                    type = row.type,
                    title = row.title,
                    message = row.message,
                    groupId = row.group_id,
                    expenseId = row.expense_id,
                    settlementId = row.settlement_id,
                    read = row.read,
                    createdAt = row.created_at
                )
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun getUnreadCount(userId: String): Int {
        return try {
            val result = supabase.postgrest.from("notifications")
                .select(columns = Columns.ALL) {
                    filter {
                        eq("user_id", userId)
                        eq("read", false)
                    }
                }
                .count()
            result ?: 0
        } catch (e: Exception) {
            0
        }
    }

    suspend fun markAsRead(notificationId: String, userId: String): Result<Unit> {
        return try {
            supabase.postgrest.from("notifications")
                .update(mapOf("read" to true)) {
                    filter {
                        eq("id", notificationId)
                        eq("user_id", userId)
                    }
                }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun markAllAsRead(userId: String): Result<Unit> {
        return try {
            supabase.postgrest.from("notifications")
                .update(mapOf("read" to true)) {
                    filter {
                        eq("user_id", userId)
                        eq("read", false)
                    }
                }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deleteNotification(notificationId: String, userId: String): Result<Unit> {
        return try {
            supabase.postgrest.from("notifications")
                .delete {
                    filter {
                        eq("id", notificationId)
                        eq("user_id", userId)
                    }
                }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

