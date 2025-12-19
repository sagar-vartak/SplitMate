'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabaseAuth } from '@/lib/supabase-auth';
import { supabaseStorage } from '@/lib/supabase-storage';
import { calculateGroupBalances, calculateSettlements } from '@/lib/calculations';
import { User, Group, Expense, Balance, Settlement } from '@/types';

export default function GroupPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let expensesUnsubscribe: (() => void) | null = null;
    let groupsUnsubscribe: (() => void) | null = null;
    let authUnsubscribe: (() => void) | null = null;
    let initialized = false;

    const loadGroupData = async (user: User) => {
      if (!mounted || initialized) return;
      
      try {
        console.log('GroupPage: Loading group data for:', groupId);
        setCurrentUser(user);
        
        // Load group
        const foundGroup = await supabaseStorage.getGroup(groupId);
        if (!foundGroup) {
          console.log('GroupPage: Group not found, redirecting to dashboard');
          if (mounted) {
            router.push('/dashboard');
          }
          return;
        }
        if (!mounted) return;
        
        setGroup(foundGroup);

        // Load all users
        const allUsers = await supabaseStorage.getUsers();
        if (!mounted) return;
        setUsers(allUsers);

        // Load expenses
        const groupExpenses = await supabaseStorage.getExpensesByGroup(groupId);
        if (!mounted) return;
        setExpenses(groupExpenses);
        const groupBalances = calculateGroupBalances(groupExpenses, foundGroup.members);
        setBalances(groupBalances);
        const groupSettlements = calculateSettlements(groupBalances).map(s => ({
          ...s,
          createdAt: new Date().toISOString(),
        }));
        setSettlements(groupSettlements);

        // Subscribe to expenses for real-time updates
        expensesUnsubscribe = supabaseStorage.subscribeToExpenses(groupId, (updatedExpenses) => {
          if (!mounted) return;
          setExpenses(updatedExpenses);
          const currentGroup = foundGroup; // Use the group from closure, not state
          const groupBalances = calculateGroupBalances(updatedExpenses, currentGroup.members);
          setBalances(groupBalances);
          const groupSettlements = calculateSettlements(groupBalances).map(s => ({
            ...s,
            createdAt: new Date().toISOString(),
          }));
          setSettlements(groupSettlements);
        });

        // Subscribe to group updates
        groupsUnsubscribe = supabaseStorage.subscribeToGroups(user.id, (groups) => {
          if (!mounted) return;
          const updatedGroup = groups.find(g => g.id === groupId);
          if (updatedGroup) {
            setGroup(updatedGroup);
            // Recalculate with new members - use current expenses from state
            // We'll get the latest expenses from the subscription
            setExpenses(prevExpenses => {
              const groupBalances = calculateGroupBalances(prevExpenses, updatedGroup.members);
              setBalances(groupBalances);
              const groupSettlements = calculateSettlements(groupBalances).map(s => ({
                ...s,
                createdAt: new Date().toISOString(),
              }));
              setSettlements(groupSettlements);
              return prevExpenses;
            });
          }
        });

        initialized = true;
        setLoading(false);
        console.log('GroupPage: Group data loaded successfully');
      } catch (error) {
        console.error('Error loading group data:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Set up auth state listener
    authUnsubscribe = supabaseAuth.onAuthStateChanged(async (user) => {
      if (!mounted) return;
      
      if (!user) {
        console.log('GroupPage: No user, redirecting to login');
        router.push('/');
        return;
      }

      // Only load data once
      if (!initialized) {
        await loadGroupData(user);
      }
    });

    return () => {
      mounted = false;
      initialized = false;
      if (authUnsubscribe) {
        authUnsubscribe();
      }
      if (expensesUnsubscribe) {
        expensesUnsubscribe();
      }
      if (groupsUnsubscribe) {
        groupsUnsubscribe();
      }
    };
  }, [groupId, router]);

  const getUserName = (userId: string) => {
    return users.find(u => u.id === userId)?.name || 'Unknown';
  };

  const formatCurrency = (amount: number) => {
    const currency = group?.currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleMarkSettlement = async (settlement: Settlement, index: number) => {
    if (!currentUser) return;
    
    const updatedSettlements = [...settlements];
    updatedSettlements[index] = {
      ...settlement,
      markedAsPaid: !settlement.markedAsPaid,
      markedBy: !settlement.markedAsPaid ? currentUser.id : undefined,
      markedAt: !settlement.markedAsPaid ? new Date().toISOString() : undefined,
    };
    setSettlements(updatedSettlements);
    
    // In a real app, you'd save this to the database
    // For now, we'll just update the local state
  };

  const handleExitGroup = async () => {
    if (!currentUser || !group) return;
    
    if (!confirm(`Are you sure you want to exit "${group.name}"?`)) {
      return;
    }

    try {
      const updatedMembers = group.members.filter(m => m !== currentUser.id);
      const updatedGroup: Group = {
        ...group,
        members: updatedMembers,
      };
      
      await supabaseStorage.saveGroup(updatedGroup);
      router.push('/dashboard');
    } catch (error) {
      console.error('Error exiting group:', error);
      alert('Failed to exit group. Please try again.');
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setExpenseToEdit(expense);
    setShowExpenseForm(true);
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense? This action cannot be undone.')) {
      return;
    }

    try {
      await supabaseStorage.deleteExpense(expenseId);
      // Expenses will update automatically via subscription
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Failed to delete expense. Please try again.');
    }
  };

  if (loading || !currentUser || !group) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-money-green-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-green-100">
      <nav className="bg-white shadow-md border-b-2 border-money-green-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard" className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <div className="w-8 h-8 bg-money-green-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              SplitMate
            </Link>
            <div className="flex items-center gap-4">
            <span className="text-gray-800 font-semibold">{group.name}</span>
            <button
              onClick={() => setShowGroupSettings(true)}
              className="text-sm text-gray-800 hover:text-money-green-700 px-3 py-1 rounded-lg hover:bg-green-50 transition-colors font-medium"
            >
              Settings
            </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-3xl font-bold text-gray-800">{group.name}</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowExpenseForm(true)}
              className="bg-money-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-money-green-700 transition-colors shadow-md hover:shadow-lg"
            >
              Add Expense
            </button>
            <button
              onClick={handleExitGroup}
              className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-600 transition-colors shadow-md"
            >
              Exit Group
            </button>
          </div>
        </div>

        {showExpenseForm && (
          <ExpenseForm
            groupId={groupId}
            groupMembers={group.members}
            users={users}
            currency={group.currency || 'USD'}
            expenseToEdit={expenseToEdit}
            onClose={() => {
              setShowExpenseForm(false);
              setExpenseToEdit(null);
            }}
          />
        )}

        {showAddMemberForm && group && (
          <div className="mb-6">
            <AddMemberForm
              group={group}
              allUsers={users}
              onClose={() => {
                setShowAddMemberForm(false);
              }}
            />
          </div>
        )}

        {showInviteForm && group && (
          <div className="mb-6">
            <InviteMemberForm
              group={group}
              onClose={() => {
                setShowInviteForm(false);
              }}
            />
          </div>
        )}

        {showGroupSettings && group && (
          <div className="mb-6">
            <GroupSettingsForm
              group={group}
              onClose={() => {
                setShowGroupSettings(false);
              }}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-md border border-green-100 p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-money-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Expenses
              </h3>
              {expenses.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No expenses yet. Add one to get started!</p>
              ) : (
                <div className="space-y-4">
                  {expenses.map(expense => (
                    <div key={expense.id} className="border-b pb-4 last:border-0">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-gray-800">{expense.description}</div>
                          <div className="text-sm text-gray-500 mt-1">
                            Paid by {getUserName(expense.paidBy)} • Split among {expense.splitAmong.length} people
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {formatDate(expense.createdAt)}
                            {expense.updatedAt && expense.updatedAt !== expense.createdAt && (
                              <span className="ml-2">• Updated {formatDate(expense.updatedAt)}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-lg font-semibold text-gray-800">
                            {formatCurrency(expense.amount)}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditExpense(expense)}
                              className="p-2 text-money-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Edit expense"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete expense"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md border border-green-100 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-money-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Members
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setShowAddMemberForm(true);
                    }}
                    className="text-sm bg-money-green-600 text-white px-3 py-1 rounded-lg font-semibold hover:bg-money-green-700 transition-colors shadow-sm"
                    type="button"
                  >
                    Add
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setShowInviteForm(true);
                    }}
                    className="text-sm bg-money-green-500 text-white px-3 py-1 rounded-lg font-semibold hover:bg-money-green-600 transition-colors shadow-sm"
                    type="button"
                  >
                    Invite
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {group.members.length === 0 ? (
                  <p className="text-gray-500 text-sm">No members yet</p>
                ) : (
                  group.members.map(memberId => {
                    const member = users.find(u => u.id === memberId);
                    return (
                      <div key={memberId} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center gap-3">
                          {member?.avatar && (
                            <img
                              src={member.avatar}
                              alt={member.name}
                              className="w-8 h-8 rounded-full"
                            />
                          )}
                          <div>
                            <div className="font-medium text-gray-800">{member?.name || 'Unknown'}</div>
                            <div className="text-sm text-gray-500">{member?.email || ''}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md border border-green-100 p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-money-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Balances
              </h3>
              {balances.length === 0 ? (
                <p className="text-gray-500 text-sm">No balances to show</p>
              ) : (
                <div className="space-y-3">
                  {balances.map(balance => {
                    if (Math.abs(balance.amount) < 0.01) return null;
                    return (
                      <div key={balance.userId} className="flex justify-between items-center">
                        <span className="text-gray-700">{getUserName(balance.userId)}</span>
                        <span
                          className={`font-medium ${
                            balance.amount > 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {balance.amount > 0
                            ? `gets back ${formatCurrency(balance.amount)}`
                            : `owes ${formatCurrency(Math.abs(balance.amount))}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-md border border-green-100 p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-money-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Settlements
              </h3>
              {settlements.length === 0 ? (
                <p className="text-gray-500 text-sm">All settled up! 🎉</p>
              ) : (
                <div className="space-y-3">
                  {settlements.map((settlement, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 text-sm">
                        <div>
                          <span className="text-gray-800 font-medium">{getUserName(settlement.from)}</span>
                          <span className="text-gray-500 mx-2">owes</span>
                          <span className="text-gray-800 font-medium">{getUserName(settlement.to)}</span>
                          <span className="font-semibold text-money-green-600 ml-2">
                            {formatCurrency(settlement.amount)}
                          </span>
                        </div>
                        {settlement.createdAt && (
                          <div className="text-xs text-gray-400 mt-1">
                            Created: {formatDate(settlement.createdAt)}
                          </div>
                        )}
                        {settlement.markedAsPaid && settlement.markedAt && (
                          <div className="text-xs text-green-600 mt-1">
                            ✓ Paid on {formatDate(settlement.markedAt)} by {getUserName(settlement.markedBy || '')}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleMarkSettlement(settlement, index)}
                        className={`ml-4 px-3 py-1 rounded text-sm font-semibold transition-colors shadow-sm ${
                          settlement.markedAsPaid
                            ? 'bg-money-green-100 text-money-green-800 hover:bg-money-green-200 border border-money-green-300'
                            : 'bg-gray-200 text-gray-800 hover:bg-gray-300 border border-gray-300'
                        }`}
                      >
                        {settlement.markedAsPaid ? '✓ Paid' : 'Mark Paid'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function ExpenseForm({
  groupId,
  groupMembers,
  users,
  currency,
  expenseToEdit,
  onClose,
}: {
  groupId: string;
  groupMembers: string[];
  users: User[];
  currency: string;
  expenseToEdit?: Expense | null;
  onClose: () => void;
}) {
  const [description, setDescription] = useState(expenseToEdit?.description || '');
  const [amount, setAmount] = useState(expenseToEdit?.amount.toString() || '');
  const [paidBy, setPaidBy] = useState(expenseToEdit?.paidBy || groupMembers[0] || '');
  const [splitType, setSplitType] = useState<'equal' | 'unequal' | 'percentage'>(expenseToEdit?.splitType || 'equal');
  const [selectedMembers, setSelectedMembers] = useState<string[]>(expenseToEdit?.splitAmong || groupMembers);
  const [unequalSplits, setUnequalSplits] = useState<{ userId: string; amount: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [initializedFromEdit, setInitializedFromEdit] = useState(false);

  // Initialize form with expense data if editing
  useEffect(() => {
    if (expenseToEdit) {
      setDescription(expenseToEdit.description);
      setAmount(expenseToEdit.amount.toString());
      setPaidBy(expenseToEdit.paidBy);
      setSplitType(expenseToEdit.splitType);
      setSelectedMembers(expenseToEdit.splitAmong);
      
      if (expenseToEdit.splits && expenseToEdit.splits.length > 0) {
        // For percentage splits, the amount in splits is already the percentage (0-100)
        // For unequal splits, the amount is the actual dollar amount
        const splits = expenseToEdit.splits.map(split => ({
          userId: split.userId,
          amount: split.amount.toString(),
        }));
        setUnequalSplits(splits);
        setInitializedFromEdit(true);
      } else {
        setUnequalSplits([]);
        setInitializedFromEdit(false);
      }
    } else {
      // Reset form for new expense
      setDescription('');
      setAmount('');
      setPaidBy(groupMembers[0] || '');
      setSplitType('equal');
      setSelectedMembers(groupMembers);
      setUnequalSplits([]);
      setInitializedFromEdit(false);
    }
  }, [expenseToEdit, groupMembers]);

  useEffect(() => {
    // Initialize splits when split type or selected members change
    // But skip if we just initialized from editing an expense
    if ((splitType === 'unequal' || splitType === 'percentage') && !initializedFromEdit) {
      // Check if we need to update splits (new members added/removed)
      const needsUpdate = selectedMembers.some(memberId => 
        !unequalSplits.some(split => split.userId === memberId)
      ) || unequalSplits.some(split => 
        !selectedMembers.includes(split.userId)
      );

      if (needsUpdate || unequalSplits.length === 0) {
        const splits = selectedMembers.map(userId => {
          const existing = unequalSplits.find(s => s.userId === userId);
          return {
            userId,
            amount: existing?.amount || (splitType === 'unequal' ? '' : '0'),
          };
        });
        setUnequalSplits(splits);
      }
    } else if (initializedFromEdit) {
      // Reset the flag after first render
      setInitializedFromEdit(false);
    }
  }, [splitType, selectedMembers, initializedFromEdit]);

  const handleToggleMember = (userId: string) => {
    if (selectedMembers.includes(userId)) {
      setSelectedMembers(selectedMembers.filter(id => id !== userId));
    } else {
      setSelectedMembers([...selectedMembers, userId]);
    }
  };

  const handleSplitChange = (userId: string, value: string) => {
    setUnequalSplits(
      unequalSplits.map(split =>
        split.userId === userId ? { ...split, amount: value } : split
      )
    );
  };

  const handleSubmit = async () => {
    if (!description.trim() || !amount || parseFloat(amount) <= 0 || selectedMembers.length === 0) {
      return;
    }

    const expenseAmount = parseFloat(amount);
    let splits: { userId: string; amount: number }[] | undefined;

    if (splitType === 'unequal') {
      const total = unequalSplits.reduce((sum, split) => sum + (parseFloat(split.amount) || 0), 0);
      if (Math.abs(total - expenseAmount) > 0.01) {
        alert('Unequal split amounts must equal the total expense amount');
        return;
      }
      splits = unequalSplits.map(split => ({
        userId: split.userId,
        amount: parseFloat(split.amount) || 0,
      }));
    } else if (splitType === 'percentage') {
      const total = unequalSplits.reduce((sum, split) => sum + (parseFloat(split.amount) || 0), 0);
      if (Math.abs(total - 100) > 0.01) {
        alert('Percentages must add up to 100%');
        return;
      }
      splits = unequalSplits.map(split => ({
        userId: split.userId,
        amount: parseFloat(split.amount) || 0,
      }));
    }

    try {
      setSaving(true);
      const expense: Expense = {
        id: expenseToEdit?.id || Date.now().toString(),
        groupId,
        description: description.trim(),
        amount: expenseAmount,
        paidBy,
        splitAmong: selectedMembers,
        splitType,
        splits,
        createdAt: expenseToEdit?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await supabaseStorage.saveExpense(expense);
      onClose();
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Failed to save expense. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border-2 border-money-green-200 p-6 mb-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <svg className="w-6 h-6 text-money-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        {expenseToEdit ? 'Edit Expense' : 'Add Expense'}
      </h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-money-green-500 text-gray-800"
            placeholder="e.g., Dinner at restaurant"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount ({currency}) *</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-money-green-500 text-gray-800"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Paid by *</label>
          <select
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-money-green-500 text-gray-800 bg-white"
          >
            {groupMembers.map(userId => (
              <option key={userId} value={userId}>
                {users.find(u => u.id === userId)?.name || 'Unknown'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Split type *</label>
          <select
            value={splitType}
            onChange={(e) => setSplitType(e.target.value as 'equal' | 'unequal' | 'percentage')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-money-green-500 text-gray-800 bg-white"
          >
            <option value="equal">Equally</option>
            <option value="unequal">Unequally</option>
            <option value="percentage">By percentage</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Split among *</label>
          <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
            {groupMembers.map(userId => (
              <label
                key={userId}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedMembers.includes(userId)}
                  onChange={() => handleToggleMember(userId)}
                  className="w-4 h-4 text-money-green-600"
                />
                <span className="text-gray-800">
                  {users.find(u => u.id === userId)?.name || 'Unknown'}
                </span>
              </label>
            ))}
          </div>
        </div>

        {(splitType === 'unequal' || splitType === 'percentage') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {splitType === 'unequal' ? 'Amounts' : 'Percentages'} *
            </label>
            <div className="space-y-2">
              {unequalSplits
                .filter(split => selectedMembers.includes(split.userId))
                .map(split => (
                  <div key={split.userId} className="flex items-center gap-2">
                    <span className="w-32 text-sm text-gray-700">
                      {users.find(u => u.id === split.userId)?.name || 'Unknown'}:
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={split.amount}
                      onChange={(e) => handleSplitChange(split.userId, e.target.value)}
                      className="flex-1 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-money-green-500 text-gray-800"
                      placeholder={splitType === 'unequal' ? '0.00' : '0'}
                    />
                    {splitType === 'percentage' && <span className="text-gray-600">%</span>}
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="flex gap-4 pt-4">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 bg-money-green-600 text-white py-2 rounded-lg font-semibold hover:bg-money-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md"
          >
            {saving ? 'Saving...' : expenseToEdit ? 'Update Expense' : 'Add Expense'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg font-medium hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function AddMemberForm({
  group,
  allUsers,
  onClose,
}: {
  group: Group;
  allUsers: User[];
  onClose: () => void;
}) {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Get users who are not already in the group
  const availableUsers = allUsers.filter(user => !group.members.includes(user.id));
  
  // Reset selected users when available users change
  useEffect(() => {
    setSelectedUsers([]);
  }, [availableUsers.length]);

  const handleToggleUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) {
      alert('Please select at least one user to add');
      return;
    }

    // Prevent adding duplicate members
    const newMembers = selectedUsers.filter(userId => !group.members.includes(userId));
    
    if (newMembers.length === 0) {
      alert('Selected users are already members of this group');
      return;
    }

    try {
      setSaving(true);
      const updatedGroup: Group = {
        ...group,
        members: [...group.members, ...newMembers],
      };

      await supabaseStorage.saveGroup(updatedGroup);
      alert(`Successfully added ${newMembers.length} member(s) to the group!`);
      onClose();
    } catch (error) {
      console.error('Error adding members:', error);
      alert('Failed to add members. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (availableUsers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Add Members</h3>
        {allUsers.length === 0 ? (
          <div>
            <p className="text-gray-600 mb-4">No other users found in the system.</p>
            <p className="text-sm text-gray-500 mb-4">
              Other users need to sign in with Google to appear here.
            </p>
          </div>
        ) : (
          <p className="text-gray-600 mb-4">All users are already members of this group.</p>
        )}
        <button
          onClick={onClose}
          className="w-full bg-gray-200 text-gray-800 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border-2 border-money-green-200 p-6 mb-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <svg className="w-6 h-6 text-money-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Members to Group
      </h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select users to add
          </label>
          <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4">
            {availableUsers.map(user => (
              <label
                key={user.id}
                className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded"
              >
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(user.id)}
                  onChange={() => handleToggleUser(user.id)}
                  className="w-4 h-4 text-money-green-600 focus:ring-money-green-500 border-gray-300 rounded"
                />
                <div className="flex items-center gap-3">
                  {user.avatar && (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <div>
                    <div className="font-medium text-gray-800">{user.name}</div>
                    <div className="text-sm text-gray-600">{user.email}</div>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            onClick={handleAddMembers}
            disabled={selectedUsers.length === 0 || saving}
            className="flex-1 bg-money-green-600 text-white py-2 rounded-lg font-semibold hover:bg-money-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md"
          >
            {saving ? 'Adding...' : `Add ${selectedUsers.length > 0 ? `${selectedUsers.length} ` : ''}Member${selectedUsers.length !== 1 ? 's' : ''}`}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function InviteMemberForm({
  group,
  onClose,
}: {
  group: Group;
  onClose: () => void;
}) {
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const handleInvite = async () => {
    if (!email.trim() || !email.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    try {
      setSaving(true);
      // In a real app, you'd send an email invitation
      // For now, we'll just show a success message
      alert(`Invitation email sent to ${email}! (Note: Email functionality requires backend setup)`);
      setEmail('');
      onClose();
    } catch (error) {
      console.error('Error sending invitation:', error);
      alert('Failed to send invitation. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border-2 border-money-green-200 p-6 mb-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <svg className="w-6 h-6 text-money-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        Invite Member by Email
      </h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-money-green-500 text-gray-800"
            placeholder="friend@example.com"
          />
          <p className="text-xs text-gray-500 mt-1">
            They'll receive an email invitation to join this group
          </p>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            onClick={handleInvite}
            disabled={saving || !email.trim()}
            className="flex-1 bg-money-green-600 text-white py-2 rounded-lg font-semibold hover:bg-money-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md"
          >
            {saving ? 'Sending...' : 'Send Invitation'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function GroupSettingsForm({
  group,
  onClose,
}: {
  group: Group;
  onClose: () => void;
}) {
  const [currency, setCurrency] = useState(group.currency || 'USD');
  const [saving, setSaving] = useState(false);
  
  // Update currency when group changes
  useEffect(() => {
    setCurrency(group.currency || 'USD');
  }, [group.currency]);

  const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  ];

  const handleSave = async () => {
    try {
      setSaving(true);
      const updatedGroup: Group = {
        ...group,
        currency: currency,
      };

      await supabaseStorage.saveGroup(updatedGroup);
      alert('Group settings saved!');
      onClose();
    } catch (error) {
      console.error('Error saving group settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border-2 border-money-green-200 p-6 mb-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <svg className="w-6 h-6 text-money-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Group Settings
      </h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Currency *</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-money-green-500 text-gray-800 bg-white"
          >
            {currencies.map(curr => (
              <option key={curr.code} value={curr.code}>
                {curr.symbol} {curr.name} ({curr.code})
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-money-green-600 text-white py-2 rounded-lg font-semibold hover:bg-money-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
