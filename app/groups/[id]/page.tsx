'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabaseAuth } from '@/lib/supabase-auth';
import { supabaseStorage } from '@/lib/supabase-storage';
import { supabase } from '@/lib/supabase';
import { calculateGroupBalances, calculateSettlements } from '@/lib/calculations';
import { User, Group, Expense, Balance, Settlement } from '@/types';
import { useToast } from '@/components/ToastContainer';

export default function GroupPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;
  const toast = useToast();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const welcomeShownRef = { current: false };

  useEffect(() => {
    let mounted = true;
    let expensesUnsubscribe: (() => void) | null = null;
    let groupsUnsubscribe: (() => void) | null = null;
    let settlementsUnsubscribe: (() => void) | null = null;
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

        // Load users who are in the same groups as current user
        const allUsers = await supabaseStorage.getUsers(user.id);
        if (!mounted) return;
        setUsers(allUsers);

        // Load expenses
        const groupExpenses = await supabaseStorage.getExpensesByGroup(groupId);
        if (!mounted) return;
        setExpenses(groupExpenses);
        const groupBalances = calculateGroupBalances(groupExpenses, foundGroup.members);
        setBalances(groupBalances);
        
        // Load saved settlements from database
        const savedSettlements = await supabaseStorage.getSettlementsByGroup(groupId);
        if (!mounted) return;
        
        // Calculate new settlements from current balances
        const calculatedSettlements = calculateSettlements(groupBalances);
        
        // Merge saved settlements with calculated ones
        // Strategy:
        // 1. Keep all marked (paid) settlements as historical records
        // 2. Always show current calculated settlements (they represent what needs to be paid NOW)
        // 3. Only use saved settlement ID if it matches exactly and is unmarked
        const markedSettlements = savedSettlements.filter(s => s.markedAsPaid);
        const mergedSettlements: Settlement[] = [];
        
        // First, add all marked settlements (historical records)
        mergedSettlements.push(...markedSettlements);
        
        // Then, ALWAYS add calculated settlements (they represent current balances)
        // Even if there's a marked settlement with the same amount, we still need to show
        // the current calculated settlement because balances may have changed after marking
        calculatedSettlements.forEach(calcSettlement => {
          // Round amounts for comparison to avoid floating point precision issues
          const calcAmountRounded = Math.round(calcSettlement.amount * 100) / 100;
          
          // Check if this calculated settlement matches any unmarked saved settlement
          // (to reuse the ID for consistency)
          const savedSettlement = savedSettlements.find(
            s => {
              if (s.markedAsPaid) return false; // Don't match marked settlements
              const savedAmountRounded = Math.round(s.amount * 100) / 100;
              return s.from === calcSettlement.from &&
                     s.to === calcSettlement.to &&
                     Math.abs(savedAmountRounded - calcAmountRounded) < 0.005 // Use 0.5 cents tolerance
            }
          );
          
          // Always add calculated settlements - they represent what needs to be paid now
          // Use saved settlement ID if it exists and is unmarked (for consistency)
          mergedSettlements.push({
            ...calcSettlement,
            amount: calcAmountRounded, // Use rounded amount
            id: savedSettlement?.id || calcSettlement.id,
            createdAt: savedSettlement?.createdAt || calcSettlement.createdAt || new Date().toISOString(),
          });
        });
        
        setSettlements(mergedSettlements);

        // Subscribe to expenses for real-time updates
        expensesUnsubscribe = supabaseStorage.subscribeToExpenses(groupId, async (updatedExpenses) => {
          if (!mounted) return;
          console.log('Expenses subscription triggered, updating balances...', updatedExpenses.length);
          setExpenses(updatedExpenses);
          
          // Get current group members from state (or use foundGroup as fallback)
          // We need to access the current group state, so we'll use a ref or get it from state
          setGroup(currentGroup => {
            const groupToUse = currentGroup || foundGroup;
            const groupBalances = calculateGroupBalances(updatedExpenses, groupToUse.members);
            setBalances(groupBalances);
            
            // Reload saved settlements and merge with calculated ones
            supabaseStorage.getSettlementsByGroup(groupId).then(savedSettlements => {
              if (!mounted) return;
              
              // Calculate new settlements from current balances
              const calculatedSettlements = calculateSettlements(groupBalances);
              
              // Merge strategy: keep marked settlements, always add current calculated ones
              const markedSettlements = savedSettlements.filter(s => s.markedAsPaid);
              const mergedSettlements: Settlement[] = [];
              
              // Add all marked settlements (historical records)
              mergedSettlements.push(...markedSettlements);
              
              // Always add calculated settlements (they represent current balances)
              calculatedSettlements.forEach(calcSettlement => {
                // Round amounts for comparison to avoid floating point precision issues
                const calcAmountRounded = Math.round(calcSettlement.amount * 100) / 100;
                
                const savedSettlement = savedSettlements.find(
                  s => {
                    if (s.markedAsPaid) return false; // Don't match marked settlements
                    const savedAmountRounded = Math.round(s.amount * 100) / 100;
                    return s.from === calcSettlement.from &&
                           s.to === calcSettlement.to &&
                           Math.abs(savedAmountRounded - calcAmountRounded) < 0.005
                  }
                );
                
                // Always add calculated settlements
                mergedSettlements.push({
                  ...calcSettlement,
                  amount: calcAmountRounded, // Use rounded amount
                  id: savedSettlement?.id || calcSettlement.id,
                  createdAt: savedSettlement?.createdAt || calcSettlement.createdAt || new Date().toISOString(),
                });
              });
              
              setSettlements(mergedSettlements);
            });
            
            return currentGroup || foundGroup;
          });
        });

        // Subscribe to settlements for real-time updates
        settlementsUnsubscribe = supabaseStorage.subscribeToSettlements(groupId, async (updatedSettlements) => {
          if (!mounted) return;
          console.log('Settlements subscription triggered, updating settlements...', updatedSettlements.length);
          
          // Get current expenses and group to recalculate balances
          setExpenses(prevExpenses => {
            setGroup(currentGroup => {
              const groupToUse = currentGroup || foundGroup;
              if (groupToUse) {
                const groupBalances = calculateGroupBalances(prevExpenses, groupToUse.members);
                setBalances(groupBalances);
                
                // Merge updated settlements with calculated ones
                const calculatedSettlements = calculateSettlements(groupBalances);
                const markedSettlements = updatedSettlements.filter(s => s.markedAsPaid);
                const mergedSettlements: Settlement[] = [];
                
                // Add all marked settlements (historical records)
                mergedSettlements.push(...markedSettlements);
                
                // Always add calculated settlements (they represent current balances)
                calculatedSettlements.forEach(calcSettlement => {
                  // Round amounts for comparison to avoid floating point precision issues
                  const calcAmountRounded = Math.round(calcSettlement.amount * 100) / 100;
                  
                  const savedSettlement = updatedSettlements.find(
                    s => {
                      if (s.markedAsPaid) return false; // Don't match marked settlements
                      const savedAmountRounded = Math.round(s.amount * 100) / 100;
                      return s.from === calcSettlement.from &&
                             s.to === calcSettlement.to &&
                             Math.abs(savedAmountRounded - calcAmountRounded) < 0.005
                    }
                  );
                  
                  // Always add calculated settlements
                  mergedSettlements.push({
                    ...calcSettlement,
                    amount: calcAmountRounded, // Use rounded amount
                    id: savedSettlement?.id || calcSettlement.id,
                    createdAt: savedSettlement?.createdAt || calcSettlement.createdAt || new Date().toISOString(),
                  });
                });
                
                setSettlements(mergedSettlements);
              }
              return currentGroup || foundGroup;
            });
            return prevExpenses;
          });
        });

        // Subscribe to group updates
        groupsUnsubscribe = supabaseStorage.subscribeToGroups(user.id, async (groups) => {
          if (!mounted) return;
          const updatedGroup = groups.find(g => g.id === groupId);
          if (updatedGroup) {
            setGroup(updatedGroup);
            // Recalculate with new members - use current expenses from state
            setExpenses(prevExpenses => {
              const groupBalances = calculateGroupBalances(prevExpenses, updatedGroup.members);
              setBalances(groupBalances);
              
              // Reload saved settlements and merge with calculated ones
              supabaseStorage.getSettlementsByGroup(groupId).then(savedSettlements => {
                if (!mounted) return;
                const calculatedSettlements = calculateSettlements(groupBalances);
                
                // Merge strategy: keep marked settlements, add new calculated ones
                const markedSettlements = savedSettlements.filter(s => s.markedAsPaid);
                const mergedSettlements: Settlement[] = [];
                
                // Add all marked settlements (historical records)
                mergedSettlements.push(...markedSettlements);
                
                // Always add calculated settlements (they represent current balances)
                calculatedSettlements.forEach(calcSettlement => {
                  // Round amounts for comparison to avoid floating point precision issues
                  const calcAmountRounded = Math.round(calcSettlement.amount * 100) / 100;
                  
                  const savedSettlement = savedSettlements.find(
                    s => {
                      if (s.markedAsPaid) return false; // Don't match marked settlements
                      const savedAmountRounded = Math.round(s.amount * 100) / 100;
                      return s.from === calcSettlement.from &&
                             s.to === calcSettlement.to &&
                             Math.abs(savedAmountRounded - calcAmountRounded) < 0.005
                    }
                  );
                  
                  // Always add calculated settlements
                  mergedSettlements.push({
                    ...calcSettlement,
                    amount: calcAmountRounded, // Use rounded amount
                    id: savedSettlement?.id || calcSettlement.id,
                    createdAt: savedSettlement?.createdAt || calcSettlement.createdAt || new Date().toISOString(),
                  });
                });
                
                setSettlements(mergedSettlements);
              });
              
              return prevExpenses;
            });
          }
        });

        initialized = true;
        setLoading(false);
        console.log('GroupPage: Group data loaded successfully');
        
        // Show welcome message when group loads (only once per page load)
        if (foundGroup && !welcomeShownRef.current) {
          toast.showInfo(`Welcome to "${foundGroup.name}"! 👋`);
          welcomeShownRef.current = true;
        }
        
        // Debug: Log settlements for troubleshooting
        console.log('🔍 Initial settlements DEBUG:', {
          total: mergedSettlements.length,
          calculated: calculatedSettlements.length,
          marked: markedSettlements.length,
          saved: savedSettlements.length,
          balances: groupBalances.map(b => ({ userId: b.userId, amount: b.amount })),
          calculatedSettlements: calculatedSettlements,
          savedSettlements: savedSettlements,
          mergedSettlements: mergedSettlements
        });
        
        // Additional check: Are balances actually non-zero?
        const hasNonZeroBalances = groupBalances.some(b => Math.abs(b.amount) > 0.01);
        console.log('💰 Has non-zero balances?', hasNonZeroBalances);
        console.log('📊 All balances:', groupBalances);
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
      console.log('Cleaning up subscriptions...');
      if (authUnsubscribe) {
        authUnsubscribe();
      }
      if (expensesUnsubscribe) {
        expensesUnsubscribe();
      }
      if (groupsUnsubscribe) {
        groupsUnsubscribe();
      }
      if (settlementsUnsubscribe) {
        settlementsUnsubscribe();
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

  // Function to manually refresh all data (fallback if subscriptions don't work)
  const refreshGroupData = async () => {
    if (!group || !currentUser) return;
    
    try {
      // Reload expenses
      const groupExpenses = await supabaseStorage.getExpensesByGroup(groupId);
      setExpenses(groupExpenses);
      
      // Recalculate balances
      const groupBalances = calculateGroupBalances(groupExpenses, group.members);
      setBalances(groupBalances);
      
      // Reload settlements
      const savedSettlements = await supabaseStorage.getSettlementsByGroup(groupId);
      const calculatedSettlements = calculateSettlements(groupBalances);
      
      console.log('🔄 Refresh: Calculated settlements:', calculatedSettlements.length, calculatedSettlements);
      console.log('🔄 Refresh: Saved settlements:', savedSettlements.length, savedSettlements);
      console.log('🔄 Refresh: Balances:', groupBalances.map(b => ({ userId: b.userId, amount: b.amount })));
      console.log('🔄 Refresh: Expenses count:', groupExpenses.length);
      
      // Merge settlements
      const markedSettlements = savedSettlements.filter(s => s.markedAsPaid);
      const mergedSettlements: Settlement[] = [];
      
      // First, add all marked settlements (historical records)
      mergedSettlements.push(...markedSettlements);
      
      // Always add calculated settlements (they represent current balances)
      calculatedSettlements.forEach(calcSettlement => {
        // Round amounts for comparison to avoid floating point precision issues
        const calcAmountRounded = Math.round(calcSettlement.amount * 100) / 100;
        
        const savedSettlement = savedSettlements.find(
          s => {
            if (s.markedAsPaid) return false; // Don't match marked settlements
            const savedAmountRounded = Math.round(s.amount * 100) / 100;
            return s.from === calcSettlement.from &&
                   s.to === calcSettlement.to &&
                   Math.abs(savedAmountRounded - calcAmountRounded) < 0.005
          }
        );
        
        // Always add calculated settlements
        mergedSettlements.push({
          ...calcSettlement,
          amount: calcAmountRounded, // Use rounded amount
          id: savedSettlement?.id || calcSettlement.id || `settlement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: savedSettlement?.createdAt || calcSettlement.createdAt || new Date().toISOString(),
        });
      });
      
      console.log('Refresh: Merged settlements:', mergedSettlements.length, mergedSettlements);
      setSettlements(mergedSettlements);
    } catch (error) {
      console.error('Error refreshing group data:', error);
    }
  };

  const handleMarkSettlement = async (settlement: Settlement, index: number) => {
    if (!currentUser || !group) return;
    
    // If already marked as paid, don't allow unmarking (settlements are one-way)
    if (settlement.markedAsPaid) {
      return;
    }
    
    try {
      // Mark settlement as paid
      const updatedSettlement: Settlement = {
        ...settlement,
        id: settlement.id || `settlement-${Date.now()}-${index}`,
        markedAsPaid: true,
        markedBy: currentUser.id,
        markedAt: new Date().toISOString(),
        createdAt: settlement.createdAt || new Date().toISOString(),
      };
      
      // Save settlement to database
      await supabaseStorage.saveSettlement(updatedSettlement);
      
      // Create an expense entry for the settlement
      // This expense represents the settlement payment and will appear in the expenses list
      // The expense is structured to offset the existing debt:
      // - The payer (from) pays the full amount and their share is 0 (net: +amount to offset their negative balance)
      // - The receiver (to) pays nothing but their share is the full amount (net: -amount to offset their positive balance)
      const fromUserName = getUserName(settlement.from);
      const toUserName = getUserName(settlement.to);
      const currency = group.currency || 'USD';
      const amountFormatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(settlement.amount);
      
      const settlementExpense: Expense = {
        id: `settlement-expense-${Date.now()}-${index}`,
        groupId: group.id,
        description: `Settled: ${fromUserName} paid ${toUserName} ${amountFormatted}`,
        amount: settlement.amount,
        paidBy: settlement.from, // The person who paid
        splitAmong: [settlement.from, settlement.to], // Both parties involved
        splitType: 'unequal',
        splits: [
          { userId: settlement.from, amount: 0 }, // Paid the amount, but their share is 0 (net: +amount offsets their debt)
          { userId: settlement.to, amount: settlement.amount }, // Their share is the full amount (net: -amount offsets what they're owed)
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Save the settlement expense
      await supabaseStorage.saveExpense(settlementExpense);
      
      // Create notifications for settlement marked
      try {
        const users = await supabaseStorage.getUsers();
        const fromUser = users.find(u => u.id === settlement.from);
        const toUser = users.find(u => u.id === settlement.to);
        const fromName = fromUser?.name || 'Someone';
        const toName = toUser?.name || 'Someone';
        const currency = group.currency || 'USD';
        const amountFormatted = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(settlement.amount);

        // Notify the person who received the payment
        await supabaseStorage.createNotification({
          userId: settlement.to,
          type: 'settlement_marked',
          title: 'Settlement Received',
          message: `${fromName} paid you ${amountFormatted} in "${group.name}"`,
          groupId: group.id,
          settlementId: updatedSettlement.id,
        });

        // Notify the person who made the payment (optional - they initiated it)
        if (settlement.from !== currentUser.id) {
          await supabaseStorage.createNotification({
            userId: settlement.from,
            type: 'settlement_marked',
            title: 'Settlement Recorded',
            message: `You paid ${toName} ${amountFormatted} in "${group.name}"`,
            groupId: group.id,
            settlementId: updatedSettlement.id,
          });
        }
      } catch (notifError) {
        console.error('Error creating settlement notifications:', notifError);
        // Don't throw - notifications are non-critical
      }
      
      // Manually refresh data to ensure UI updates immediately
      await refreshGroupData();
      
      // Check if all balances are now settled
      const updatedExpenses = await supabaseStorage.getExpensesByGroup(groupId);
      const updatedBalances = calculateGroupBalances(updatedExpenses, group.members);
      const allSettled = updatedBalances.every(b => Math.abs(b.amount) < 0.01);
      
      if (allSettled && updatedBalances.length > 0) {
        toast.showSuccess('All settled up! 🎉', 5000);
      } else {
        toast.showSuccess('Settlement marked as paid and added to expenses! ✅');
      }
    } catch (error) {
      console.error('Error marking settlement as paid:', error);
      toast.showError('Failed to mark settlement as paid. Please try again.');
    }
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
      toast.showInfo(`You have exited "${group.name}". 👋`);
      router.push('/dashboard');
    } catch (error) {
      console.error('Error exiting group:', error);
      toast.showError('Failed to exit group. Please try again.');
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
      // Manually refresh data to ensure UI updates immediately
      await refreshGroupData();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.showError('Failed to delete expense. Please try again.');
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
              <div className="flex items-center gap-2 px-4 py-2 bg-money-green-50 border border-money-green-200 rounded-lg">
                <svg className="w-5 h-5 text-money-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="text-money-green-800 font-bold text-lg">{group.name}</span>
              </div>
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
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-money-green-600 rounded-xl flex items-center justify-center shadow-md">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">{group.name}</h2>
              {group.description && (
                <p className="text-sm text-gray-500 mt-1">{group.description}</p>
              )}
            </div>
          </div>
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
            onSave={refreshGroupData}
          />
        )}

               {showInviteForm && group && currentUser && (
                 <div className="mb-6">
                   <ShareLinkForm
                     group={group}
                     currentUser={currentUser}
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
                <div className="space-y-3">
                  {expenses.map(expense => {
                    const isSettlement = expense.description.startsWith('Settled:');
                    return (
                      <div 
                        key={expense.id} 
                        className={`${
                          isSettlement 
                            ? 'bg-gradient-to-r from-money-green-50 to-emerald-50 border-2 border-money-green-200 rounded-lg p-4 shadow-sm' 
                            : 'bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {isSettlement && (
                                <div className="flex-shrink-0 w-6 h-6 bg-money-green-600 rounded-full flex items-center justify-center">
                                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              )}
                              <div className={`font-semibold text-base ${isSettlement ? 'text-money-green-800' : 'text-gray-900'}`}>
                                {expense.description}
                              </div>
                            </div>
                            {!isSettlement && (
                              <div className="text-sm text-gray-600 mt-1">
                                Paid by <span className="font-medium">{getUserName(expense.paidBy)}</span> • Split among {expense.splitAmong.length} {expense.splitAmong.length === 1 ? 'person' : 'people'}
                              </div>
                            )}
                            <div className={`text-xs mt-2 ${isSettlement ? 'text-money-green-600' : 'text-gray-400'}`}>
                              {formatDate(expense.createdAt)}
                              {expense.updatedAt && expense.updatedAt !== expense.createdAt && (
                                <span className="ml-2">• Updated {formatDate(expense.updatedAt)}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 ml-4">
                            <div className={`text-lg font-bold ${isSettlement ? 'text-money-green-700' : 'text-gray-900'}`}>
                              {formatCurrency(expense.amount)}
                            </div>
                            {!isSettlement && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleEditExpense(expense)}
                                  className="p-2 text-money-green-600 hover:bg-money-green-50 rounded-lg transition-colors"
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
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setShowInviteForm(true);
                  }}
                  className="text-sm bg-money-green-600 text-white px-3 py-1 rounded-lg font-semibold hover:bg-money-green-700 transition-colors shadow-sm"
                  type="button"
                >
                  Invite
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

            <div className="bg-white rounded-lg shadow-md border border-green-100 p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-money-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Balances
              </h3>
              {!group || group.members.length === 0 ? (
                <p className="text-gray-500 text-sm">No members in this group</p>
              ) : (
                <div className="space-y-3">
                  {group.members.map(memberId => {
                    // Find balance for this member
                    const balance = balances.find(b => b.userId === memberId);
                    const amount = balance?.amount || 0;
                    const isSettled = Math.abs(amount) < 0.01;
                    
                    return (
                      <div key={memberId} className="flex justify-between items-center py-1">
                        <span className="text-gray-700">{getUserName(memberId)}</span>
                        <span
                          className={`font-medium ${
                            isSettled
                              ? 'text-gray-500'
                              : balance && balance.amount > 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {isSettled
                            ? 'settled up'
                            : amount > 0
                            ? `gets back ${formatCurrency(amount)}`
                            : `owes ${formatCurrency(Math.abs(amount))}`}
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
                <span className="text-xs text-gray-500 ml-2">({settlements.length})</span>
              </h3>
              {(() => {
                // Debug: Log current state
                const hasNonZeroBalances = balances.some(b => Math.abs(b.amount) > 0.01);
                const calculatedSettlements = calculateSettlements(balances);
                console.log('🎯 UI Render - Settlements state:', {
                  settlementsLength: settlements.length,
                  balancesLength: balances.length,
                  hasNonZeroBalances,
                  calculatedSettlementsCount: calculatedSettlements.length,
                  balances: balances.map(b => ({ userId: b.userId, amount: b.amount })),
                  settlements: settlements
                });
                
                if (settlements.length === 0) {
                  return (
                    <div>
                      <p className="text-gray-500 text-sm">All settled up! 🎉</p>
                      {/* Debug info in development */}
                      {process.env.NODE_ENV === 'development' && (
                        <div className="text-xs text-gray-400 mt-2 space-y-1">
                          <p>Debug: Balances = {balances.length}, Expenses = {expenses.length}</p>
                          <p>Has non-zero balances: {hasNonZeroBalances ? 'Yes' : 'No'}</p>
                          <p>Calculated settlements: {calculatedSettlements.length}</p>
                          {balances.length > 0 && (
                            <details className="mt-2">
                              <summary className="cursor-pointer">View balances</summary>
                              <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto">
                                {JSON.stringify(balances.map(b => ({ userId: b.userId, amount: b.amount })), null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-3">
                  {[...settlements]
                    .sort((a, b) => {
                      // Sort: unsettled settlements first, then marked/paid settlements
                      // If one is marked and other isn't, unmarked goes to top
                      if (!a.markedAsPaid && b.markedAsPaid) return -1;
                      if (a.markedAsPaid && !b.markedAsPaid) return 1;
                      
                      // Both are same type, sort by date (newest first)
                      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                      return bDate - aDate;
                    })
                    .map((settlement, index) => {
                      // Find original index for handleMarkSettlement
                      const originalIndex = settlements.findIndex(
                        s => s.id === settlement.id || 
                        (s.from === settlement.from && 
                         s.to === settlement.to && 
                         Math.abs(s.amount - settlement.amount) < 0.01)
                      );
                      return (
                    <div key={settlement.id || `${settlement.from}-${settlement.to}-${settlement.amount}-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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
                        onClick={() => handleMarkSettlement(settlement, originalIndex >= 0 ? originalIndex : index)}
                        className={`ml-4 px-3 py-1 rounded text-sm font-semibold transition-colors shadow-sm ${
                          settlement.markedAsPaid
                            ? 'bg-money-green-100 text-money-green-800 hover:bg-money-green-200 border border-money-green-300'
                            : 'bg-gray-200 text-gray-800 hover:bg-gray-300 border border-gray-300'
                        }`}
                      >
                        {settlement.markedAsPaid ? '✓ Paid' : 'Mark Paid'}
                      </button>
                    </div>
                    );
                  })}
                </div>
                );
              })()}
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
  onSave,
}: {
  groupId: string;
  groupMembers: string[];
  users: User[];
  currency: string;
  expenseToEdit?: Expense | null;
  onClose: () => void;
  onSave?: () => Promise<void>;
}) {
  const toast = useToast();
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
        toast.showWarning('Unequal split amounts must equal the total expense amount');
        return;
      }
      splits = unequalSplits.map(split => ({
        userId: split.userId,
        amount: parseFloat(split.amount) || 0,
      }));
    } else if (splitType === 'percentage') {
      const total = unequalSplits.reduce((sum, split) => sum + (parseFloat(split.amount) || 0), 0);
      if (Math.abs(total - 100) > 0.01) {
        toast.showWarning('Percentages must add up to 100%');
        return;
      }
      splits = unequalSplits.map(split => ({
        userId: split.userId,
        amount: parseFloat(split.amount) || 0,
      }));
    }

    try {
      setSaving(true);
      // Generate a unique ID for new expenses
      const expenseId = expenseToEdit?.id || `expense-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const expense: Expense = {
        id: expenseId,
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
      console.log('Expense saved, subscription should trigger balance update');
      
      // Manually refresh data to ensure UI updates immediately
      if (onSave) {
        await onSave();
      }
      
      // Show success notification
      toast.showSuccess(expenseToEdit ? 'Expense updated successfully! ✏️' : 'Expense added successfully! 💰');
      onClose();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.showError('Failed to save expense. Please try again.');
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

function ShareLinkForm({
  group,
  currentUser,
  onClose,
}: {
  group: Group;
  currentUser: User;
  onClose: () => void;
}) {
  const toast = useToast();
  const [inviteLink, setInviteLink] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const hasGeneratedRef = useRef(false);

  // Generate link automatically when form opens
  useEffect(() => {
    if (!hasGeneratedRef.current) {
      hasGeneratedRef.current = true;
      generateInviteLink();
    }
  }, []);

  const generateInviteLink = async () => {
    try {
      setGenerating(true);
      
      // Check if user is the creator or a member
      if (!group.members.includes(currentUser.id)) {
        toast.showError('Only group members can generate invitation links');
        return;
      }

      // Generate a unique token
      const token = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Save invitation to database (no email required)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 3); // 3 days expiry

      const invitationId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const { error } = await supabase
        .from('group_invites')
        .insert({
          id: invitationId,
          group_id: group.id,
          email: '[email protected]', // Placeholder - not used for magic links
          invited_by: currentUser.id,
          token: token,
          status: 'pending',
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error creating invitation:', error);
        toast.showError('Failed to generate invitation link');
        return;
      }

      // Generate the invitation link
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const link = `${baseUrl}/invite/${token}`;
      setInviteLink(link);
      toast.showSuccess('Invitation link generated! 🔗');
    } catch (error: any) {
      console.error('Error generating invite link:', error);
      toast.showError('Failed to generate invitation link. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.showSuccess('Invitation link copied to clipboard! 📋');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.showError('Failed to copy link. Please copy it manually.');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border-2 border-money-green-200 p-6 mb-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <svg className="w-6 h-6 text-money-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        Share Invitation Link
      </h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Invitation Link</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inviteLink}
              readOnly
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-800 text-sm"
              placeholder={generating ? 'Generating link...' : inviteLink ? inviteLink : 'Click "Generate Link" to create an invitation'}
            />
            <button
              onClick={handleCopy}
              disabled={!inviteLink || copied}
              className="px-4 py-2 bg-money-green-600 text-white rounded-lg font-semibold hover:bg-money-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Share this link with anyone you want to invite. They can use it to join the group.
          </p>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
          <p className="text-sm text-blue-800">
            <strong>How it works:</strong> Anyone with this link can join your group. The link expires in 3 days. Share it via any method you prefer (messaging, email, etc.).
          </p>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            onClick={generateInviteLink}
            disabled={generating}
            className="flex-1 bg-money-green-600 text-white py-2 rounded-lg font-semibold hover:bg-money-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md"
          >
            {generating ? 'Generating...' : 'Generate New Link'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg font-medium hover:bg-gray-300 shadow-sm"
          >
            Close
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
  const toast = useToast();
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
      toast.showSuccess('Group settings saved! ✅');
      onClose();
    } catch (error) {
      console.error('Error saving group settings:', error);
      toast.showError('Failed to save settings. Please try again.');
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
