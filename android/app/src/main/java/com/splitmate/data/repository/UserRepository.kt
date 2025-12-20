package com.splitmate.data.repository

import com.splitmate.data.SupabaseClient
import com.splitmate.data.model.User
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import kotlinx.serialization.Serializable

@Serializable
data class UserRow(
    val id: String,
    val email: String,
    val name: String,
    val avatar: String?
)

class UserRepository {
    private val supabase = SupabaseClient.client

    suspend fun getUsers(userIds: List<String>): List<User> {
        return try {
            if (userIds.isEmpty()) return emptyList()
            
            val users = supabase.postgrest.from("users")
                .select(columns = Columns.ALL) {
                    filter {
                        `in`("id", userIds)
                    }
                }
                .decodeList<UserRow>()

            users.map { row ->
                User(
                    id = row.id,
                    email = row.email,
                    name = row.name,
                    avatar = row.avatar
                )
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun getUser(userId: String): User? {
        return try {
            val row = supabase.postgrest.from("users")
                .select(columns = Columns.ALL) {
                    filter {
                        eq("id", userId)
                    }
                }
                .decodeSingle<UserRow>()

            User(
                id = row.id,
                email = row.email,
                name = row.name,
                avatar = row.avatar
            )
        } catch (e: Exception) {
            null
        }
    }
}

