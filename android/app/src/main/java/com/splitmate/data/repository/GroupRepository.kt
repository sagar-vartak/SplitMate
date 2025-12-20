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

    suspend fun updateGroup(group: Group): Result<Unit> {
        return try {
            supabase.postgrest.from("groups")
                .update(
                    mapOf(
                        "name" to group.name,
                        "description" to (group.description ?: ""),
                        "currency" to group.currency,
                        "members" to group.members
                    )
                ) {
                    filter {
                        eq("id", group.id)
                    }
                }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getGroupInviteByToken(token: String): Map<String, Any>? {
        return try {
            val result = supabase.postgrest.from("group_invites")
                .select(columns = Columns.ALL) {
                    filter {
                        eq("token", token)
                    }
                }
                .decodeSingle<Map<String, Any>>()
            result
        } catch (e: Exception) {
            null
        }
    }

    suspend fun acceptInvitation(token: String, userId: String): Result<Group> {
        return try {
            // Try RPC function first (if available in Supabase)
            try {
                supabase.postgrest.rpc(
                    "accept_invitation_and_join_group",
                    mapOf(
                        "invite_token" to token,
                        "user_id" to userId
                    )
                )
                // If RPC succeeds, get the updated group
                val invitation = getGroupInviteByToken(token)
                if (invitation != null) {
                    val groupId = invitation["group_id"] as String
                    val group = getGroup(groupId)
                    if (group != null) {
                        return Result.success(group)
                    }
                }
            } catch (rpcError: Exception) {
                // RPC not available, fallback to manual update
                println("RPC not available, using manual update: ${rpcError.message}")
            }
            
            // Manual update fallback
            val invitation = getGroupInviteByToken(token)
            if (invitation == null) {
                return Result.failure(Exception("Invitation not found"))
            }
            
            val groupId = invitation["group_id"] as? String ?: return Result.failure(Exception("Invalid invitation"))
            val group = getGroup(groupId)
            if (group == null) {
                return Result.failure(Exception("Group not found"))
            }
            
            if (userId in group.members) {
                // User already a member
                return Result.success(group)
            }
            
            // Add user to group
            val updatedGroup = group.copy(members = group.members + userId)
            val updateResult = updateGroup(updatedGroup)
            if (updateResult.isSuccess) {
                Result.success(updatedGroup)
            } else {
                Result.failure(Exception("Failed to update group"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

