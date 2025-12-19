export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  members: string[]; // User IDs
  createdAt: string;
  currency?: string; // Currency code (USD, EUR, etc.)
  createdBy?: string; // User ID of creator
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  paidBy: string; // User ID
  splitAmong: string[]; // User IDs
  splitType: 'equal' | 'unequal' | 'percentage';
  splits?: { userId: string; amount: number }[]; // For unequal splits
  createdAt: string;
  updatedAt?: string; // ISO timestamp when expense was last updated
}

export interface Balance {
  userId: string;
  groupId: string;
  amount: number; // Positive = gets back (paid more than share), Negative = owes (paid less than share)
}

export interface Settlement {
  id?: string; // Settlement ID (generated if not provided)
  from: string; // User ID
  to: string; // User ID
  amount: number;
  groupId: string;
  markedAsPaid?: boolean; // Whether this settlement has been marked as paid
  markedBy?: string; // User ID who marked it as paid
  markedAt?: string; // ISO timestamp when marked
  createdAt?: string; // ISO timestamp when settlement was created
}

export interface Notification {
  id: string;
  userId: string; // User ID who should see this notification
  type: 'expense_added' | 'member_added' | 'settlement_marked' | 'group_invite' | 'member_left';
  title: string;
  message: string;
  groupId?: string;
  expenseId?: string;
  settlementId?: string;
  read: boolean;
  createdAt: string;
}

export interface GroupInvite {
  id: string;
  groupId: string;
  email: string;
  invitedBy: string; // User ID
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  expiresAt?: string;
}

