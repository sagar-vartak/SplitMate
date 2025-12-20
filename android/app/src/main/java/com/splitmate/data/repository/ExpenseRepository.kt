package com.splitmate.data.repository

import com.splitmate.data.SupabaseClient
import com.splitmate.data.model.Expense
import com.splitmate.data.model.ExpenseSplit
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import kotlinx.serialization.Serializable

@Serializable
data class ExpenseRow(
    val id: String,
    val group_id: String,
    val description: String,
    val amount: String, // Stored as string in DB, convert to Double
    val paid_by: String,
    val split_among: List<String>,
    val split_type: String,
    val splits: List<Map<String, Any>>?,
    val created_at: String,
    val updated_at: String?
)

class ExpenseRepository {
    private val supabase = SupabaseClient.client

    suspend fun getExpensesByGroup(groupId: String): List<Expense> {
        return try {
            val expenses = supabase.postgrest.from("expenses")
                .select(columns = Columns.ALL) {
                    filter {
                        eq("group_id", groupId)
                    }
                }
                .order("created_at", ascending = false)
                .decodeList<ExpenseRow>()

            expenses.map { row ->
                Expense(
                    id = row.id,
                    groupId = row.group_id,
                    description = row.description,
                    amount = row.amount.toDoubleOrNull() ?: 0.0,
                    paidBy = row.paid_by,
                    splitAmong = row.split_among,
                    splitType = row.split_type,
                    splits = row.splits?.map { splitMap ->
                        ExpenseSplit(
                            userId = splitMap["userId"] as? String ?: "",
                            amount = (splitMap["amount"] as? Number)?.toDouble() ?: 0.0
                        )
                    },
                    createdAt = row.created_at,
                    updatedAt = row.updated_at
                )
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun saveExpense(expense: Expense): Result<Unit> {
        return try {
            val splitsJson = expense.splits?.map { split ->
                mapOf("userId" to split.userId, "amount" to split.amount)
            }

            supabase.postgrest.from("expenses")
                .upsert(
                    mapOf(
                        "id" to expense.id,
                        "group_id" to expense.groupId,
                        "description" to expense.description,
                        "amount" to expense.amount,
                        "paid_by" to expense.paidBy,
                        "split_among" to expense.splitAmong,
                        "split_type" to expense.splitType,
                        "splits" to splitsJson,
                        "created_at" to expense.createdAt,
                        "updated_at" to (expense.updatedAt ?: expense.createdAt)
                    )
                )

            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deleteExpense(expenseId: String): Result<Unit> {
        return try {
            supabase.postgrest.from("expenses")
                .delete {
                    filter {
                        eq("id", expenseId)
                    }
                }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

