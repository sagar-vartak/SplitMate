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
}

export interface Balance {
  userId: string;
  groupId: string;
  amount: number; // Positive = owes, Negative = is owed
}

export interface Settlement {
  from: string; // User ID
  to: string; // User ID
  amount: number;
  groupId: string;
}

