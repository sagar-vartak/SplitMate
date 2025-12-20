package com.splitmate.data.repository

import com.splitmate.data.SupabaseClient
import com.splitmate.data.model.Group
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import kotlinx.serialization.Serializable

@Serializable
data class GroupRow(
    val id: String,
    val name: String,
    val description: String?,
    val members: List<String>,
    val currency: String?,
    val created_by: String?,
    val created_at: String
)

class GroupRepository {
    private val supabase = SupabaseClient.client

    suspend fun getGroups(userId: String): List<Group> {
        return try {
            // Get groups where user is a member
            // Note: Supabase array contains uses cs operator
            val groups = supabase.postgrest.from("groups")
                .select(columns = Columns.ALL) {
                    filter {
                        // Check if userId is in members array
                        // Using a workaround: fetch all and filter, or use RPC
                    }
                }
                .decodeList<GroupRow>()
                .filter { it.members.contains(userId) }

            groups.map { row ->
                Group(
                    id = row.id,
                    name = row.name,
                    description = row.description,
                    members = row.members,
                    currency = row.currency ?: "USD",
                    createdBy = row.created_by,
                    createdAt = row.created_at
                )
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun getGroup(groupId: String): Group? {
        return try {
            val row = supabase.postgrest.from("groups")
                .select(columns = Columns.ALL) {
                    filter {
                        eq("id", groupId)
                    }
                }
                .decodeSingle<GroupRow>()

            Group(
                id = row.id,
                name = row.name,
                description = row.description,
                members = row.members,
                currency = row.currency ?: "USD",
                createdBy = row.created_by,
                createdAt = row.created_at
            )
        } catch (e: Exception) {
            null
        }
    }

    suspend fun createGroup(group: Group, userId: String): Result<Group> {
        return try {
            supabase.postgrest.from("groups")
                .insert(
                    mapOf(
                        "id" to group.id,
                        "name" to group.name,
                        "description" to (group.description ?: ""),
                        "members" to group.members,
                        "currency" to group.currency,
                        "created_by" to userId,
                        "created_at" to group.createdAt
                    )
                )

            Result.success(group)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

