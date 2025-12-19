import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { User, Group, Expense } from '@/types';

// Convert Firestore timestamp to ISO string
const timestampToISO = (timestamp: any): string => {
  if (timestamp?.toDate) {
    return timestamp.toDate().toISOString();
  }
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  return timestamp || new Date().toISOString();
};

// Convert data with timestamps
const convertTimestamps = (data: any): any => {
  if (!data) return data;
  const converted = { ...data };
  if (converted.createdAt) {
    converted.createdAt = timestampToISO(converted.createdAt);
  }
  return converted;
};

export const firestore = {
  // Users
  getUsers: async (): Promise<User[]> => {
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamps(doc.data()),
      })) as User[];
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  },

  getUser: async (userId: string): Promise<User | null> => {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        return {
          id: userSnap.id,
          ...convertTimestamps(userSnap.data()),
        } as User;
      }
      return null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },

  saveUser: async (user: User): Promise<void> => {
    try {
      const userRef = doc(db, 'users', user.id);
      await setDoc(userRef, {
        name: user.name,
        email: user.email,
        avatar: user.avatar || null,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.error('Error saving user:', error);
      throw error;
    }
  },

  deleteUser: async (userId: string): Promise<void> => {
    try {
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  },

  // Groups
  getGroups: async (userId?: string): Promise<Group[]> => {
    try {
      const groupsRef = collection(db, 'groups');
      let q = query(groupsRef);
      
      if (userId) {
        q = query(groupsRef, where('members', 'array-contains', userId));
      }
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamps(doc.data()),
      })) as Group[];
    } catch (error) {
      console.error('Error getting groups:', error);
      return [];
    }
  },

  getGroup: async (groupId: string): Promise<Group | null> => {
    try {
      const groupRef = doc(db, 'groups', groupId);
      const groupSnap = await getDoc(groupRef);
      if (groupSnap.exists()) {
        return {
          id: groupSnap.id,
          ...convertTimestamps(groupSnap.data()),
        } as Group;
      }
      return null;
    } catch (error) {
      console.error('Error getting group:', error);
      return null;
    }
  },

  saveGroup: async (group: Group, createdBy?: string): Promise<void> => {
    try {
      const groupRef = doc(db, 'groups', group.id);
      const groupData: any = {
        name: group.name,
        description: group.description || null,
        members: group.members,
        updatedAt: serverTimestamp(),
      };
      
      if (createdBy) {
        groupData.createdBy = createdBy;
      }
      
      if (!group.createdAt) {
        groupData.createdAt = serverTimestamp();
      }
      
      await setDoc(groupRef, groupData, { merge: true });
    } catch (error) {
      console.error('Error saving group:', error);
      throw error;
    }
  },

  deleteGroup: async (groupId: string): Promise<void> => {
    try {
      const groupRef = doc(db, 'groups', groupId);
      await deleteDoc(groupRef);
      
      // Also delete related expenses
      const expenses = await firestore.getExpensesByGroup(groupId);
      await Promise.all(expenses.map(expense => firestore.deleteExpense(expense.id)));
    } catch (error) {
      console.error('Error deleting group:', error);
      throw error;
    }
  },

  // Expenses
  getExpenses: async (): Promise<Expense[]> => {
    try {
      const expensesRef = collection(db, 'expenses');
      const snapshot = await getDocs(expensesRef);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamps(doc.data()),
      })) as Expense[];
    } catch (error) {
      console.error('Error getting expenses:', error);
      return [];
    }
  },

  getExpensesByGroup: async (groupId: string): Promise<Expense[]> => {
    try {
      const expensesRef = collection(db, 'expenses');
      const q = query(expensesRef, where('groupId', '==', groupId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamps(doc.data()),
      })) as Expense[];
    } catch (error) {
      console.error('Error getting expenses by group:', error);
      return [];
    }
  },

  saveExpense: async (expense: Expense): Promise<void> => {
    try {
      const expenseRef = doc(db, 'expenses', expense.id);
      await setDoc(expenseRef, {
        groupId: expense.groupId,
        description: expense.description,
        amount: expense.amount,
        paidBy: expense.paidBy,
        splitAmong: expense.splitAmong,
        splitType: expense.splitType,
        splits: expense.splits || null,
        createdAt: expense.createdAt ? Timestamp.fromDate(new Date(expense.createdAt)) : serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.error('Error saving expense:', error);
      throw error;
    }
  },

  deleteExpense: async (expenseId: string): Promise<void> => {
    try {
      const expenseRef = doc(db, 'expenses', expenseId);
      await deleteDoc(expenseRef);
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  },

  // Real-time listeners
  subscribeToGroups: (
    userId: string,
    callback: (groups: Group[]) => void
  ): (() => void) => {
    const groupsRef = collection(db, 'groups');
    const q = query(groupsRef, where('members', 'array-contains', userId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groups = snapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamps(doc.data()),
      })) as Group[];
      callback(groups);
    }, (error) => {
      console.error('Error in groups subscription:', error);
    });

    return unsubscribe;
  },

  subscribeToExpenses: (
    groupId: string,
    callback: (expenses: Expense[]) => void
  ): (() => void) => {
    const expensesRef = collection(db, 'expenses');
    const q = query(expensesRef, where('groupId', '==', groupId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const expenses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamps(doc.data()),
      })) as Expense[];
      callback(expenses);
    }, (error) => {
      console.error('Error in expenses subscription:', error);
    });

    return unsubscribe;
  },
};

