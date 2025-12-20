package com.splitmate.utils

import com.splitmate.data.model.Balance
import com.splitmate.data.model.Expense
import com.splitmate.data.model.Settlement

object Calculations {
    /**
     * Calculate balances for all members in a group based on expenses
     * Positive amount = gets back money
     * Negative amount = owes money
     */
    fun calculateGroupBalances(expenses: List<Expense>, members: List<String>): List<Balance> {
        val balances = mutableMapOf<String, Double>()
        
        // Initialize all members with 0 balance
        members.forEach { member ->
            balances[member] = 0.0
        }
        
        // Calculate balances from expenses
        expenses.forEach { expense ->
            val paidBy = expense.paidBy
            val totalAmount = expense.amount
            
            // Add to paidBy's balance (they paid, so they get money back)
            balances[paidBy] = (balances[paidBy] ?: 0.0) + totalAmount
            
            // Subtract from splitAmong members' balances
            when (expense.splitType) {
                "equal" -> {
                    val sharePerPerson = totalAmount / expense.splitAmong.size
                    expense.splitAmong.forEach { memberId ->
                        if (memberId != paidBy) {
                            balances[memberId] = (balances[memberId] ?: 0.0) - sharePerPerson
                        } else {
                            // PaidBy already got the full amount, subtract their share
                            balances[memberId] = (balances[memberId] ?: 0.0) - sharePerPerson
                        }
                    }
                }
                "unequal" -> {
                    expense.splits?.forEach { split ->
                        balances[split.userId] = (balances[split.userId] ?: 0.0) - split.amount
                    }
                }
                "percentage" -> {
                    expense.splits?.forEach { split ->
                        val share = totalAmount * (split.amount / 100.0)
                        balances[split.userId] = (balances[split.userId] ?: 0.0) - share
                    }
                }
            }
        }
        
        return balances.map { (userId, amount) ->
            Balance(userId = userId, amount = roundToThreeDecimals(amount))
        }
    }
    
    /**
     * Calculate settlements using a greedy algorithm to minimize transactions
     * Similar to Splitwise's simplify payments
     */
    fun calculateSettlements(balances: List<Balance>): List<Settlement> {
        val settlements = mutableListOf<Settlement>()
        val balanceMap = balances.associate { it.userId to it.amount }.toMutableMap()
        
        // Separate creditors (positive balance) and debtors (negative balance)
        val creditors = balanceMap.filter { it.value > 0.001 }.toMutableMap()
        val debtors = balanceMap.filter { it.value < -0.001 }.toMutableMap()
        
        // Greedy algorithm: match largest creditor with largest debtor
        while (creditors.isNotEmpty() && debtors.isNotEmpty()) {
            val largestCreditor = creditors.maxByOrNull { it.value }!!
            val largestDebtor = debtors.maxByOrNull { kotlin.math.abs(it.value) }!!
            
            val creditorId = largestCreditor.key
            val debtorId = largestDebtor.key
            val creditorAmount = largestCreditor.value
            val debtorAmount = kotlin.math.abs(largestDebtor.value)
            
            val settlementAmount = kotlin.math.min(creditorAmount, debtorAmount)
            
            settlements.add(
                Settlement(
                    groupId = "", // Will be set by caller
                    from = debtorId,
                    to = creditorId,
                    amount = roundToThreeDecimals(settlementAmount)
                )
            )
            
            // Update balances
            creditors[creditorId] = roundToThreeDecimals(creditorAmount - settlementAmount)
            debtors[debtorId] = roundToThreeDecimals(debtorAmount - settlementAmount)
            
            // Remove if settled
            if (creditors[creditorId]!! < 0.001) {
                creditors.remove(creditorId)
            }
            if (debtors[debtorId]!! < 0.001) {
                debtors.remove(debtorId)
            }
        }
        
        return settlements
    }
    
    private fun roundToThreeDecimals(value: Double): Double {
        return kotlin.math.round(value * 1000.0) / 1000.0
    }
}

