import { supabase } from './supabase';
import { User, Group, Expense, Settlement, GroupInvite, Notification } from '@/types';

// Simple UUID generator (fallback if uuid package not available)
function generateUUID(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`;
}

export const supabaseStorage = {
  // Users
  getUsers: async (userId?: string): Promise<User[]> => {
    try {
      // If userId is provided, only return users who are in at least one group with this user
      if (userId) {
        // Get all groups the user is a member of
        const userGroups = await supabaseStorage.getGroups(userId);
        const allMemberIds = new Set<string>();
        
        // Collect all member IDs from user's groups
        userGroups.forEach(group => {
          group.members.forEach(memberId => {
            allMemberIds.add(memberId);
          });
        });

        // Get users who are in the same groups
        if (allMemberIds.size === 0) {
          return [];
        }

        const { data, error } = await supabase
          .from('users')
          .select('*')
          .in('id', Array.from(allMemberIds))
          .order('name');

        if (error) throw error;
        return (data || []).map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar || undefined,
        })) as User[];
      } else {
        // If no userId, return all users (for backward compatibility)
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
      }
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
      const isUpdate = expense.updatedAt && expense.createdAt !== expense.updatedAt;
      
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

      // Create notifications for expense added (only for new expenses, not updates)
      if (!isUpdate) {
        try {
          // Get group to find all members
          const group = await supabaseStorage.getGroup(expense.groupId);
          if (group) {
            // Get user who paid to get their name
            const users = await supabaseStorage.getUsers();
            const paidByUser = users.find(u => u.id === expense.paidBy);
            const paidByName = paidByUser?.name || 'Someone';

            // Notify all group members except the person who added the expense
            const membersToNotify = group.members.filter(memberId => memberId !== expense.paidBy);
            
            for (const memberId of membersToNotify) {
              await supabaseStorage.createNotification({
                userId: memberId,
                type: 'expense_added',
                title: 'New Expense Added',
                message: `${paidByName} added "${expense.description}" (${expense.amount.toFixed(2)})`,
                groupId: expense.groupId,
                expenseId: expense.id,
              });
            }
          }
        } catch (notifError) {
          console.error('Error creating expense notifications:', notifError);
          // Don't throw - notifications are non-critical
        }
      }
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

  // Settlements
  saveSettlement: async (settlement: Settlement): Promise<void> => {
    try {
      const { error } = await supabase
        .from('settlements')
        .upsert({
          id: settlement.id || `settlement-${Date.now()}`,
          group_id: settlement.groupId,
          from_user_id: settlement.from,
          to_user_id: settlement.to,
          amount: settlement.amount,
          marked_as_paid: settlement.markedAsPaid || false,
          marked_by: settlement.markedBy || null,
          marked_at: settlement.markedAt || null,
          created_at: settlement.createdAt || new Date().toISOString(),
        }, {
          onConflict: 'id',
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving settlement:', error);
      throw error;
    }
  },

  getSettlementsByGroup: async (groupId: string): Promise<Settlement[]> => {
    try {
      const { data, error } = await supabase
        .from('settlements')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(s => ({
        id: s.id,
        groupId: s.group_id,
        from: s.from_user_id,
        to: s.to_user_id,
        amount: parseFloat(s.amount),
        markedAsPaid: s.marked_as_paid,
        markedBy: s.marked_by || undefined,
        markedAt: s.marked_at || undefined,
        createdAt: s.created_at,
      })) as Settlement[];
    } catch (error) {
      console.error('Error getting settlements by group:', error);
      return [];
    }
  },

  // Real-time subscriptions
  subscribeToGroups: (
    userId: string,
    callback: (groups: Group[]) => void
  ): (() => void) => {
    const channelName = `groups-changes-${userId}`;
    console.log('Setting up groups subscription:', channelName);
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'groups',
        },
        async (payload) => {
          console.log('Groups subscription triggered:', payload.eventType, payload.new || payload.old);
          try {
            const groups = await supabaseStorage.getGroups(userId);
            callback(groups);
          } catch (error) {
            console.error('Error in groups subscription callback:', error);
          }
        }
      )
      .subscribe((status, err) => {
        console.log('Groups subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to groups changes');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          // Don't log as error - this is expected if Realtime isn't enabled
          // The app will still work with manual refreshes
          console.info('ℹ️ Groups subscription not active (Realtime may not be enabled). App will use manual refreshes.');
          if (err) {
            console.info('Subscription details:', err);
          }
        }
      });

    return () => {
      console.log('Unsubscribing from groups:', channelName);
      supabase.removeChannel(channel);
    };
  },

  subscribeToExpenses: (
    groupId: string,
    callback: (expenses: Expense[]) => void
  ): (() => void) => {
    const channelName = `expenses-changes-${groupId}`;
    console.log('Setting up expenses subscription:', channelName);
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          console.log('Expenses subscription triggered:', payload.eventType, payload.new || payload.old);
          try {
            const expenses = await supabaseStorage.getExpensesByGroup(groupId);
            callback(expenses);
          } catch (error) {
            console.error('Error in expenses subscription callback:', error);
          }
        }
      )
      .subscribe((status, err) => {
        console.log('Expenses subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to expenses changes');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          // Don't log as error - this is expected if Realtime isn't enabled
          // The app will still work with manual refreshes
          console.info('ℹ️ Expenses subscription not active (Realtime may not be enabled). App will use manual refreshes.');
          if (err) {
            console.info('Subscription details:', err);
          }
        }
      });

    return () => {
      console.log('Unsubscribing from expenses:', channelName);
      supabase.removeChannel(channel);
    };
  },

  subscribeToSettlements: (
    groupId: string,
    callback: (settlements: Settlement[]) => void
  ): (() => void) => {
    const channelName = `settlements-changes-${groupId}`;
    console.log('Setting up settlements subscription:', channelName);
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'settlements',
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          console.log('Settlements subscription triggered:', payload.eventType, payload.new || payload.old);
          try {
            const settlements = await supabaseStorage.getSettlementsByGroup(groupId);
            callback(settlements);
          } catch (error) {
            console.error('Error in settlements subscription callback:', error);
          }
        }
      )
      .subscribe((status, err) => {
        console.log('Settlements subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to settlements changes');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          // Don't log as error - this is expected if Realtime isn't enabled
          // The app will still work with manual refreshes
          console.info('ℹ️ Settlements subscription not active (Realtime may not be enabled). App will use manual refreshes.');
          if (err) {
            console.info('Subscription details:', err);
          }
        }
      });

    return () => {
      console.log('Unsubscribing from settlements:', channelName);
      supabase.removeChannel(channel);
    };
  },

  // Group Invitations
  createInvitation: async (
    groupId: string,
    email: string,
    invitedBy: string
  ): Promise<GroupInvite> => {
    try {
      const token = generateUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

      const invitation: GroupInvite = {
        id: generateUUID(),
        groupId,
        email: email.toLowerCase().trim(),
        invitedBy,
        status: 'pending',
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
      };

      const { error } = await supabase
        .from('group_invites')
        .insert({
          id: invitation.id,
          group_id: groupId,
          email: invitation.email,
          invited_by: invitedBy,
          token: token,
          status: invitation.status,
          expires_at: invitation.expiresAt,
          created_at: invitation.createdAt,
        });

      if (error) throw error;

      return { ...invitation, token } as GroupInvite & { token: string };
    } catch (error) {
      console.error('Error creating invitation:', error);
      throw error;
    }
  },

  getInvitationByToken: async (token: string): Promise<(GroupInvite & { token: string }) | null> => {
    try {
      const { data, error } = await supabase
        .from('group_invites')
        .select('*')
        .eq('token', token)
        .single();

      if (error) {
        if (error.code === 'PGRST116' || error.code === 'PGRST205') {
          return null;
        }
        throw error;
      }

      if (!data) return null;

      // Check if expired
      const expiresAt = new Date(data.expires_at);
      if (expiresAt < new Date() && data.status === 'pending') {
        // Mark as expired
        await supabase
          .from('group_invites')
          .update({ status: 'expired' })
          .eq('id', data.id);
        return null;
      }

      return {
        id: data.id,
        groupId: data.group_id,
        email: data.email,
        invitedBy: data.invited_by,
        status: data.status,
        createdAt: data.created_at,
        expiresAt: data.expires_at,
        token: data.token,
      } as GroupInvite & { token: string };
    } catch (error) {
      console.error('Error getting invitation by token:', error);
      return null;
    }
  },

  acceptInvitation: async (token: string, acceptedBy: string): Promise<Group | null> => {
    try {
      // First, get the group before adding the user (to know who to notify)
      const { data: groupBeforeArray } = await supabase
        .rpc('get_group_by_invite_token', { invite_token: token });

      const groupBefore = groupBeforeArray && groupBeforeArray.length > 0 ? groupBeforeArray[0] : null;
      const existingMembers = groupBefore?.members || [];

      // Use the function to accept invitation and add user to group (bypasses RLS)
      const { data: groupDataArray, error: functionError } = await supabase
        .rpc('accept_invitation_and_join_group', {
          invite_token: token,
          user_id: acceptedBy,
        });

      if (functionError) {
        console.error('Error accepting invitation:', functionError);
        throw new Error(functionError.message || 'Failed to accept invitation');
      }

      if (!groupDataArray || groupDataArray.length === 0) {
        throw new Error('Invalid or expired invitation');
      }

      const groupData = groupDataArray[0];
      const updatedGroup: Group = {
        id: groupData.id,
        name: groupData.name,
        description: groupData.description || undefined,
        members: groupData.members || [],
        createdAt: groupData.created_at,
        currency: groupData.currency || 'USD',
        createdBy: groupData.created_by || undefined,
      };

      // Create notifications for member added
      try {
        const users = await supabaseStorage.getUsers();
        const newMember = users.find(u => u.id === acceptedBy);
        const newMemberName = newMember?.name || 'Someone';

        // Notify all existing group members (before the new member was added)
        for (const memberId of existingMembers) {
          await supabaseStorage.createNotification({
            userId: memberId,
            type: 'member_added',
            title: 'New Member Joined',
            message: `${newMemberName} joined "${updatedGroup.name}"`,
            groupId: updatedGroup.id,
          });
        }
      } catch (notifError) {
        console.error('Error creating member added notifications:', notifError);
        // Don't throw - notifications are non-critical
      }

      return updatedGroup;
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw error;
    }
  },

  getInvitationsByGroup: async (groupId: string): Promise<GroupInvite[]> => {
    try {
      const { data, error } = await supabase
        .from('group_invites')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(inv => ({
        id: inv.id,
        groupId: inv.group_id,
        email: inv.email,
        invitedBy: inv.invited_by,
        status: inv.status,
        createdAt: inv.created_at,
        expiresAt: inv.expires_at,
      })) as GroupInvite[];
    } catch (error) {
      console.error('Error getting invitations by group:', error);
      return [];
    }
  },

  // Notifications
  createNotification: async (notification: {
    userId: string;
    type: 'expense_added' | 'member_added' | 'settlement_marked' | 'group_invite' | 'member_left';
    title: string;
    message: string;
    groupId?: string;
    expenseId?: string;
    settlementId?: string;
  }): Promise<void> => {
    try {
      const notificationId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const { error } = await supabase
        .from('notifications')
        .insert({
          id: notificationId,
          user_id: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          group_id: notification.groupId || null,
          expense_id: notification.expenseId || null,
          settlement_id: notification.settlementId || null,
          read: false,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error creating notification:', error);
      // Don't throw - notifications are non-critical
    }
  },

  getNotifications: async (userId: string): Promise<Notification[]> => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return (data || []).map(notif => ({
        id: notif.id,
        userId: notif.user_id,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        groupId: notif.group_id || undefined,
        expenseId: notif.expense_id || undefined,
        settlementId: notif.settlement_id || undefined,
        read: notif.read,
        createdAt: notif.created_at,
      })) as Notification[];
    } catch (error) {
      console.error('Error getting notifications:', error);
      return [];
    }
  },

  getUnreadNotificationCount: async (userId: string): Promise<number> => {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  },

  markNotificationAsRead: async (notificationId: string, userId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  markAllNotificationsAsRead: async (userId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  },

  deleteNotification: async (notificationId: string, userId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  },

  subscribeToNotifications: (
    userId: string,
    callback: (notifications: Notification[]) => void
  ): (() => void) => {
    const channelName = `notifications:${userId}`;
    console.log('Setting up notifications subscription:', channelName);
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          console.log('Notifications subscription triggered:', payload.eventType);
          try {
            // Reload notifications when changes occur
            const notifications = await supabaseStorage.getNotifications(userId);
            callback(notifications);
          } catch (error) {
            console.error('Error in notifications subscription callback:', error);
          }
        }
      )
      .subscribe((status, err) => {
        console.log('Notifications subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to notifications changes');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.info('ℹ️ Notifications subscription not active (Realtime may not be enabled). Will use polling fallback.');
          if (err) {
            console.info('Subscription details:', err);
          }
        }
      });

    // Fallback: Poll for notifications every 5 seconds if subscription fails
    let pollInterval: NodeJS.Timeout | null = null;
    const startPolling = () => {
      if (pollInterval) return; // Already polling
      pollInterval = setInterval(async () => {
        try {
          const notifications = await supabaseStorage.getNotifications(userId);
          callback(notifications);
        } catch (error) {
          console.error('Error polling notifications:', error);
        }
      }, 5000); // Poll every 5 seconds
    };

    // Check subscription status after a delay and start polling if needed
    setTimeout(() => {
      if (channel.state !== 'joined') {
        console.log('Subscription not active, starting polling fallback');
        startPolling();
      }
    }, 2000);

    return () => {
      console.log('Unsubscribing from notifications:', channelName);
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      supabase.removeChannel(channel);
    };
  },
};

