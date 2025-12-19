import { supabase } from './supabase';
import { User, Group, Expense } from '@/types';

export const supabaseStorage = {
  // Users
  getUsers: async (): Promise<User[]> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name');

      if (error) throw error;
      return (data || []).map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar || undefined,
      })) as User[];
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  },

  getUser: async (userId: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      // 404 or PGRST205 means user doesn't exist - that's OK, return null
      if (error) {
        // Check if it's a "not found" error (404 or PGRST205)
        if (error.code === 'PGRST116' || error.code === 'PGRST205' || error.message?.includes('No rows')) {
          return null; // User doesn't exist yet, that's fine
        }
        // For other errors, log and return null
        console.error('Error getting user:', error);
        return null;
      }

      if (!data) return null;

      return {
        id: data.id,
        name: data.name,
        email: data.email,
        avatar: data.avatar || undefined,
      } as User;
    } catch (error: any) {
      // Handle 404 errors gracefully
      if (error?.code === 'PGRST116' || error?.code === 'PGRST205' || error?.message?.includes('No rows') || error?.status === 404) {
        return null; // User doesn't exist yet
      }
      console.error('Error getting user:', error);
      return null;
    }
  },

  saveUser: async (user: User): Promise<void> => {
    try {
      const { error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id',
        });

      if (error) {
        // Log the error but don't throw - we'll still use the user data
        console.error('Error saving user to database:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        // Don't throw - allow the app to continue with the user data
        // The user profile will be created on next sign-in if RLS allows
      }
    } catch (error) {
      console.error('Error saving user:', error);
      // Don't throw - allow the app to continue
    }
  },

  // Groups
  getGroups: async (userId?: string): Promise<Group[]> => {
    try {
      let query = supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.contains('members', [userId]);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).map(group => ({
        id: group.id,
        name: group.name,
        description: group.description || undefined,
        members: group.members || [],
        createdAt: group.created_at,
        currency: group.currency || 'USD',
        createdBy: group.created_by || undefined,
      })) as Group[];
    } catch (error) {
      console.error('Error getting groups:', error);
      return [];
    }
  },

  getGroup: async (groupId: string): Promise<Group | null> => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        name: data.name,
        description: data.description || undefined,
        members: data.members || [],
        createdAt: data.created_at,
        currency: data.currency || 'USD',
        createdBy: data.created_by || undefined,
      } as Group;
    } catch (error) {
      console.error('Error getting group:', error);
      return null;
    }
  },

  saveGroup: async (group: Group, createdBy?: string): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = createdBy || user?.id;

      const { error } = await supabase
        .from('groups')
        .upsert({
          id: group.id,
          name: group.name,
          description: group.description || null,
          members: group.members,
          currency: group.currency || 'USD',
          created_by: userId || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id',
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving group:', error);
      throw error;
    }
  },

  deleteGroup: async (groupId: string): Promise<void> => {
    try {
      // Delete expenses first (cascade should handle this, but being explicit)
      await supabase
        .from('expenses')
        .delete()
        .eq('group_id', groupId);

      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting group:', error);
      throw error;
    }
  },

  // Expenses
  getExpenses: async (): Promise<Expense[]> => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(expense => ({
        id: expense.id,
        groupId: expense.group_id,
        description: expense.description,
        amount: parseFloat(expense.amount),
        paidBy: expense.paid_by,
        splitAmong: expense.split_among || [],
        splitType: expense.split_type,
        splits: expense.splits || undefined,
        createdAt: expense.created_at,
      })) as Expense[];
    } catch (error) {
      console.error('Error getting expenses:', error);
      return [];
    }
  },

  getExpensesByGroup: async (groupId: string): Promise<Expense[]> => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(expense => ({
        id: expense.id,
        groupId: expense.group_id,
        description: expense.description,
        amount: parseFloat(expense.amount),
        paidBy: expense.paid_by,
        splitAmong: expense.split_among || [],
        splitType: expense.split_type,
        splits: expense.splits || undefined,
        createdAt: expense.created_at,
      })) as Expense[];
    } catch (error) {
      console.error('Error getting expenses by group:', error);
      return [];
    }
  },

  saveExpense: async (expense: Expense): Promise<void> => {
    try {
      const { error } = await supabase
        .from('expenses')
        .upsert({
          id: expense.id,
          group_id: expense.groupId,
          description: expense.description,
          amount: expense.amount,
          paid_by: expense.paidBy,
          split_among: expense.splitAmong,
          split_type: expense.splitType,
          splits: expense.splits || null,
          created_at: expense.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id',
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving expense:', error);
      throw error;
    }
  },

  deleteExpense: async (expenseId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  },

  // Real-time subscriptions
  subscribeToGroups: (
    userId: string,
    callback: (groups: Group[]) => void
  ): (() => void) => {
    const channel = supabase
      .channel('groups-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'groups',
        },
        async () => {
          const groups = await supabaseStorage.getGroups(userId);
          callback(groups);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  subscribeToExpenses: (
    groupId: string,
    callback: (expenses: Expense[]) => void
  ): (() => void) => {
    const channel = supabase
      .channel('expenses-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `group_id=eq.${groupId}`,
        },
        async () => {
          const expenses = await supabaseStorage.getExpensesByGroup(groupId);
          callback(expenses);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};

