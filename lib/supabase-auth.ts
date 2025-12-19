import { supabase } from './supabase';
import { supabaseStorage } from './supabase-storage';
import { User } from '@/types';

export const supabaseAuth = {
  signUp: async (email: string, password: string, name: string): Promise<User> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
          emailRedirectTo: typeof window !== 'undefined' 
            ? `${window.location.origin}/auth/callback`
            : undefined,
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error('No user returned');

      // Create user profile
      const userData: User = {
        id: data.user.id,
        name: name,
        email: email,
        avatar: data.user.user_metadata?.avatar_url || undefined,
      };

      await supabaseStorage.saveUser(userData);
      return userData;
    } catch (error: any) {
      console.error('Error signing up:', error);
      throw error;
    }
  },

  signIn: async (email: string, password: string): Promise<User> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('No user returned');

      // Get or create user profile
      let userData = await supabaseStorage.getUser(data.user.id);
      if (!userData) {
        userData = {
          id: data.user.id,
          name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User',
          email: data.user.email || '',
          avatar: data.user.user_metadata?.avatar_url || undefined,
        };
        await supabaseStorage.saveUser(userData);
      }

      return userData;
    } catch (error: any) {
      console.error('Error signing in:', error);
      throw error;
    }
  },

  signInWithGoogle: async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' 
            ? `${window.location.origin}/auth/callback`
            : '/auth/callback',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
      // OAuth will redirect, so we don't need to return anything
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  },

  signOut: async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  },

  getCurrentUser: async (): Promise<User | null> => {
    try {
      // First check session (faster, doesn't require network)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        return null;
      }
      
      if (!session?.user) return null;

      // Try to get user profile, but don't wait too long
      const getUserProfile = async () => {
        try {
          let userData = await supabaseStorage.getUser(session.user.id);
          if (!userData) {
            // Create user profile if it doesn't exist (404 means user not found)
            userData = {
              id: session.user.id,
              name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
              email: session.user.email || '',
              avatar: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || undefined,
            };
            try {
              await supabaseStorage.saveUser(userData);
              // Fetch again to get the saved user
              userData = await supabaseStorage.getUser(session.user.id) || userData;
            } catch (saveError: any) {
              console.error('Error saving user profile:', saveError);
              // Still return the user data even if save fails
              // This might happen if RLS policies block the insert
            }
          }
          return userData;
        } catch (error) {
          console.error('Error getting user profile:', error);
          // Return basic user data if profile fetch fails
          return {
            id: session.user.id,
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
            email: session.user.email || '',
            avatar: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || undefined,
          } as User;
        }
      };

      // Add timeout to prevent hanging
      const userData = await Promise.race([
        getUserProfile(),
        new Promise<User>((resolve) => {
          setTimeout(() => {
            resolve({
              id: session.user.id,
              name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
              email: session.user.email || '',
              avatar: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || undefined,
            } as User);
          }, 2000); // 2 second timeout
        })
      ]);

      return userData;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  onAuthStateChanged: (callback: (user: User | null) => void): (() => void) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const userData = await supabaseAuth.getCurrentUser();
        callback(userData);
      } else {
        callback(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  },
};

