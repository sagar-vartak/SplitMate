import { User, Group, Expense } from '@/types';

const STORAGE_KEYS = {
  USERS: 'splitwise_users',
  GROUPS: 'splitwise_groups',
  EXPENSES: 'splitwise_expenses',
  CURRENT_USER: 'splitwise_current_user',
};

export const storage = {
  // Users
  getUsers: (): User[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : [];
  },

  saveUser: (user: User): void => {
    const users = storage.getUsers();
    const existingIndex = users.findIndex(u => u.id === user.id);
    if (existingIndex >= 0) {
      users[existingIndex] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  deleteUser: (userId: string): void => {
    const users = storage.getUsers().filter(u => u.id !== userId);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  // Groups
  getGroups: (): Group[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.GROUPS);
    return data ? JSON.parse(data) : [];
  },

  saveGroup: (group: Group): void => {
    const groups = storage.getGroups();
    const existingIndex = groups.findIndex(g => g.id === group.id);
    if (existingIndex >= 0) {
      groups[existingIndex] = group;
    } else {
      groups.push(group);
    }
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
  },

  deleteGroup: (groupId: string): void => {
    const groups = storage.getGroups().filter(g => g.id !== groupId);
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
    // Also delete related expenses
    const expenses = storage.getExpenses().filter(e => e.groupId !== groupId);
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  },

  // Expenses
  getExpenses: (): Expense[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    return data ? JSON.parse(data) : [];
  },

  getExpensesByGroup: (groupId: string): Expense[] => {
    return storage.getExpenses().filter(e => e.groupId === groupId);
  },

  saveExpense: (expense: Expense): void => {
    const expenses = storage.getExpenses();
    const existingIndex = expenses.findIndex(e => e.id === expense.id);
    if (existingIndex >= 0) {
      expenses[existingIndex] = expense;
    } else {
      expenses.push(expense);
    }
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  },

  deleteExpense: (expenseId: string): void => {
    const expenses = storage.getExpenses().filter(e => e.id !== expenseId);
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  },

  // Current User
  getCurrentUser: (): User | null => {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  },

  setCurrentUser: (user: User | null): void => {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  },
};

