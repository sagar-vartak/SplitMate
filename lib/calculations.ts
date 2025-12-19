import { Expense, Balance, Settlement } from '@/types';

// Simple ID generator for settlements
function generateSettlementId(): string {
  return `settlement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function calculateBalances(expenses: Expense[]): Map<string, number> {
  const balances = new Map<string, number>();

  expenses.forEach(expense => {
    const { paidBy, amount, splitType, splitAmong, splits } = expense;

    // Initialize paidBy balance if not exists
    if (!balances.has(paidBy)) {
      balances.set(paidBy, 0);
    }

    let totalSplit = 0;
    const splitAmounts = new Map<string, number>();

    if (splitType === 'equal') {
      const perPerson = amount / splitAmong.length;
      splitAmong.forEach(userId => {
        splitAmounts.set(userId, perPerson);
        totalSplit += perPerson;
      });
    } else if (splitType === 'unequal' && splits) {
      splits.forEach(split => {
        splitAmounts.set(split.userId, split.amount);
        totalSplit += split.amount;
      });
    } else if (splitType === 'percentage' && splits) {
      splits.forEach(split => {
        const splitAmount = (amount * split.amount) / 100;
        splitAmounts.set(split.userId, splitAmount);
        totalSplit += splitAmount;
      });
    }

    // Adjust for rounding errors
    const difference = amount - totalSplit;
    if (Math.abs(difference) > 0.01 && splitAmong.length > 0) {
      const firstUser = splitAmong[0];
      splitAmounts.set(firstUser, (splitAmounts.get(firstUser) || 0) + difference);
    }

    // Update balances
    // Person who paid gets credited with the full amount
    balances.set(paidBy, (balances.get(paidBy) || 0) + amount);

    // People who owe get debited
    splitAmounts.forEach((splitAmount, userId) => {
      if (!balances.has(userId)) {
        balances.set(userId, 0);
      }
      balances.set(userId, (balances.get(userId) || 0) - splitAmount);
    });
  });

  return balances;
}

export function calculateGroupBalances(expenses: Expense[], groupMembers: string[]): Balance[] {
  const balances = calculateBalances(expenses);
  const groupBalances: Balance[] = [];

  groupMembers.forEach(userId => {
    const netBalance = balances.get(userId) || 0;
    // netBalance > 0 means they paid more than their share (should get money back)
    // netBalance < 0 means they paid less than their share (owes money)
    // For display: positive = gets back, negative = owes
    groupBalances.push({
      userId,
      groupId: expenses[0]?.groupId || '',
      amount: netBalance, // Positive = gets back, Negative = owes
    });
  });

  return groupBalances;
}

/**
 * Calculate simplified settlements using Splitwise's algorithm
 * This minimizes the number of transactions needed to settle all debts
 */
export function calculateSettlements(balances: Balance[]): Settlement[] {
  if (balances.length === 0) {
    console.log('📊 calculateSettlements: No balances provided');
    return [];
  }

  const balanceMap = new Map<string, number>();
  
  // Create a map of net balances
  // Positive = should receive money, Negative = should pay money
  balances.forEach(balance => {
    balanceMap.set(balance.userId, balance.amount);
  });

  // Separate into creditors (positive balance) and debtors (negative balance)
  const creditors: { userId: string; amount: number }[] = [];
  const debtors: { userId: string; amount: number }[] = [];

  balanceMap.forEach((amount, userId) => {
    // Use a smaller threshold to catch more balances (0.001 instead of 0.01)
    // This helps with floating point precision issues
    const roundedAmount = Math.round(amount * 1000) / 1000;
    if (roundedAmount > 0.001) {
      creditors.push({ userId, amount: roundedAmount });
    } else if (roundedAmount < -0.001) {
      debtors.push({ userId, amount: Math.abs(roundedAmount) });
    }
  });

  console.log('📊 calculateSettlements: Creditors:', creditors.length, creditors);
  console.log('📊 calculateSettlements: Debtors:', debtors.length, debtors);

  // If no creditors or debtors, everyone is settled
  if (creditors.length === 0 || debtors.length === 0) {
    console.log('📊 calculateSettlements: No creditors or debtors, returning empty array');
    return [];
  }

  // Sort by amount (largest first) for optimal matching
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const settlements: Settlement[] = [];
  const groupId = balances[0]?.groupId || '';

  // Use a greedy algorithm to minimize transactions
  // This is similar to Splitwise's "simplify payments" feature
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];

    // Calculate how much this debtor should pay to this creditor
    const settlementAmount = Math.min(creditor.amount, debtor.amount);

    // Use smaller threshold (0.001) to catch more settlements
    if (settlementAmount > 0.001) {
      // Round to 2 decimal places for currency
      const roundedAmount = Math.round(settlementAmount * 100) / 100;
      settlements.push({
        id: generateSettlementId(),
        from: debtor.userId,
        to: creditor.userId,
        amount: roundedAmount,
        groupId,
        createdAt: new Date().toISOString(),
      });

      // Update remaining amounts (use precise calculation)
      creditor.amount -= settlementAmount;
      debtor.amount -= settlementAmount;

      // Move to next creditor/debtor if fully settled (use smaller threshold)
      if (Math.abs(creditor.amount) < 0.001) {
        creditorIndex++;
      }
      if (Math.abs(debtor.amount) < 0.001) {
        debtorIndex++;
      }
    } else {
      break;
    }
  }

  return settlements;
}

