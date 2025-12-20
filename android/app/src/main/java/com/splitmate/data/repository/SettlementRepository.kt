package com.splitmate.data.repository

import com.splitmate.data.SupabaseClient
import com.splitmate.data.model.Settlement
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import kotlinx.serialization.Serializable

@Serializable
data class SettlementRow(
    val id: String,
    val group_id: String,
    val from_user_id: String,
    val to_user_id: String,
    val amount: String, // Stored as string in DB
    val marked_as_paid: Boolean,
    val marked_by: String?,
    val marked_at: String?,
    val created_at: String
)

class SettlementRepository {
    private val supabase = SupabaseClient.client

    suspend fun getSettlementsByGroup(groupId: String): List<Settlement> {
        return try {
            val settlements = supabase.postgrest.from("settlements")
                .select(columns = Columns.ALL) {
                    filter {
                        eq("group_id", groupId)
                    }
                }
                .decodeList<SettlementRow>()

            settlements.map { row ->
                Settlement(
                    id = row.id,
                    groupId = row.group_id,
                    from = row.from_user_id,
                    to = row.to_user_id,
                    amount = row.amount.toDoubleOrNull() ?: 0.0,
                    markedAsPaid = row.marked_as_paid,
                    markedBy = row.marked_by,
                    markedAt = row.marked_at,
                    createdAt = row.created_at
                )
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun saveSettlement(settlement: Settlement): Result<Unit> {
        return try {
            supabase.postgrest.from("settlements")
                .upsert(
                    mapOf(
                        "id" to (settlement.id ?: "settlement-${System.currentTimeMillis()}"),
                        "group_id" to settlement.groupId,
                        "from_user_id" to settlement.from,
                        "to_user_id" to settlement.to,
                        "amount" to settlement.amount,
                        "marked_as_paid" to settlement.markedAsPaid,
                        "marked_by" to settlement.markedBy,
                        "marked_at" to settlement.markedAt,
                        "created_at" to (settlement.createdAt ?: java.time.Instant.now().toString())
                    )
                )
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

