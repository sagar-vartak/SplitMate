import {
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  User as FirebaseUser,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from './firebase';
import { firestore } from './firestore';
import { User } from '@/types';

const googleProvider = new GoogleAuthProvider();

export const authService = {
  signInWithGoogle: async (): Promise<User> => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      
      // Create or update user in Firestore
      const userData: User = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || 'Unknown',
        email: firebaseUser.email || '',
        avatar: firebaseUser.photoURL || undefined,
      };
      
      await firestore.saveUser(userData);
      
      return userData;
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  },

  signOut: async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  },

  getCurrentUser: (): FirebaseUser | null => {
    return auth.currentUser;
  },

  onAuthStateChanged: (callback: (user: FirebaseUser | null) => void): (() => void) => {
    return onAuthStateChanged(auth, callback);
  },

  getCurrentUserData: async (): Promise<User | null> => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;
    
    const userData = await firestore.getUser(firebaseUser.uid);
    if (userData) return userData;
    
    // If user doesn't exist in Firestore, create it
    const newUser: User = {
      id: firebaseUser.uid,
      name: firebaseUser.displayName || 'Unknown',
      email: firebaseUser.email || '',
      avatar: firebaseUser.photoURL || undefined,
    };
    
    await firestore.saveUser(newUser);
    return newUser;
  },
};

