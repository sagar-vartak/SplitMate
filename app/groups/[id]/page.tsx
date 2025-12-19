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
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = supabaseAuth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push('/');
        return;
      }

      try {
        setCurrentUser(user);
        
        // Load group
        const foundGroup = await supabaseStorage.getGroup(groupId);
        if (!foundGroup) {
          router.push('/dashboard');
          return;
        }
        setGroup(foundGroup);

        // Load all users
        const allUsers = await supabaseStorage.getUsers();
        setUsers(allUsers);

        // Load expenses
        const groupExpenses = await supabaseStorage.getExpensesByGroup(groupId);
        setExpenses(groupExpenses);
        const groupBalances = calculateGroupBalances(groupExpenses, foundGroup.members);
        setBalances(groupBalances);
        const groupSettlements = calculateSettlements(groupBalances);
        setSettlements(groupSettlements);

        // Subscribe to expenses for real-time updates
        const unsubscribeExpenses = supabaseStorage.subscribeToExpenses(groupId, (updatedExpenses) => {
          setExpenses(updatedExpenses);
          const groupBalances = calculateGroupBalances(updatedExpenses, foundGroup.members);
          setBalances(groupBalances);
          const groupSettlements = calculateSettlements(groupBalances);
          setSettlements(groupSettlements);
        });

        // Subscribe to group updates
        const unsubscribeGroup = supabaseStorage.subscribeToGroups(user.id, (groups) => {
          const updatedGroup = groups.find(g => g.id === groupId);
          if (updatedGroup) {
            setGroup(updatedGroup);
            // Recalculate with new members
            const groupBalances = calculateGroupBalances(expenses, updatedGroup.members);
            setBalances(groupBalances);
            const groupSettlements = calculateSettlements(groupBalances);
            setSettlements(groupSettlements);
          }
        });

        setLoading(false);

        return () => {
          unsubscribeExpenses();
          unsubscribeGroup();
        };
      } catch (error) {
        console.error('Error loading group data:', error);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [groupId, router, expenses]);

  const getUserName = (userId: string) => {
    return users.find(u => u.id === userId)?.name || 'Unknown';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(amount));
  };

  if (loading || !currentUser || !group) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard" className="text-2xl font-bold text-gray-800">
              Splitwise Clone
            </Link>
            <span className="text-gray-600">{group.name}</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-3xl font-bold text-gray-800">{group.name}</h2>
          <button
            onClick={() => setShowExpenseForm(true)}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Add Expense
          </button>
        </div>

        {showExpenseForm && (
          <ExpenseForm
            groupId={groupId}
            groupMembers={group.members}
            users={users}
            onClose={() => {
              setShowExpenseForm(false);
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Expenses</h3>
              {expenses.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No expenses yet. Add one to get started!</p>
              ) : (
                <div className="space-y-4">
                  {expenses.map(expense => (
                    <div key={expense.id} className="border-b pb-4 last:border-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-800">{expense.description}</div>
                          <div className="text-sm text-gray-500 mt-1">
                            Paid by {getUserName(expense.paidBy)} • Split among {expense.splitAmong.length} people
                          </div>
                        </div>
                        <div className="text-lg font-semibold text-gray-800">
                          {formatCurrency(expense.amount)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800">Members</h3>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setShowAddMemberForm(true);
                  }}
                  className="text-sm bg-indigo-600 text-white px-3 py-1 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                  type="button"
                >
                  Add Member
                </button>
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

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Balances</h3>
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
                            : `owes ${formatCurrency(balance.amount)}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Settlements</h3>
              {settlements.length === 0 ? (
                <p className="text-gray-500 text-sm">All settled up! 🎉</p>
              ) : (
                <div className="space-y-3">
                  {settlements.map((settlement, index) => (
                    <div key={index} className="text-sm">
                      <span className="text-gray-700">{getUserName(settlement.from)}</span>
                      <span className="text-gray-500 mx-2">owes</span>
                      <span className="text-gray-700">{getUserName(settlement.to)}</span>
                      <span className="font-semibold text-indigo-600 ml-2">
                        {formatCurrency(settlement.amount)}
                      </span>
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
  onClose,
}: {
  groupId: string;
  groupMembers: string[];
  users: User[];
  onClose: () => void;
}) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(groupMembers[0] || '');
  const [splitType, setSplitType] = useState<'equal' | 'unequal' | 'percentage'>('equal');
  const [selectedMembers, setSelectedMembers] = useState<string[]>(groupMembers);
  const [unequalSplits, setUnequalSplits] = useState<{ userId: string; amount: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (splitType === 'unequal' || splitType === 'percentage') {
      const splits = selectedMembers.map(userId => ({
        userId,
        amount: splitType === 'unequal' ? '' : '0',
      }));
      setUnequalSplits(splits);
    }
  }, [splitType, selectedMembers]);

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
        id: Date.now().toString(),
        groupId,
        description: description.trim(),
        amount: expenseAmount,
        paidBy,
        splitAmong: selectedMembers,
        splitType,
        splits,
        createdAt: new Date().toISOString(),
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
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Add Expense</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g., Dinner at restaurant"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Paid by *</label>
          <select
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
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
                  className="w-4 h-4 text-indigo-600"
                />
                <span className="text-gray-700">
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
                    <span className="w-32 text-sm text-gray-600">
                      {users.find(u => u.id === split.userId)?.name || 'Unknown'}:
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={split.amount}
                      onChange={(e) => handleSplitChange(split.userId, e.target.value)}
                      className="flex-1 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                      placeholder={splitType === 'unequal' ? '0.00' : '0'}
                    />
                    {splitType === 'percentage' && <span className="text-gray-500">%</span>}
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="flex gap-4 pt-4">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Add Expense'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300"
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
            <p className="text-gray-500 mb-4">No other users found in the system.</p>
            <p className="text-sm text-gray-400 mb-4">
              Other users need to sign in with Google to appear here.
            </p>
          </div>
        ) : (
          <p className="text-gray-500 mb-4">All users are already members of this group.</p>
        )}
        <button
          onClick={onClose}
          className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Add Members to Group</h3>
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
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
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
                    <div className="text-sm text-gray-500">{user.email}</div>
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
            className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {saving ? 'Adding...' : `Add ${selectedUsers.length > 0 ? `${selectedUsers.length} ` : ''}Member${selectedUsers.length !== 1 ? 's' : ''}`}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
