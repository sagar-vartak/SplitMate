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
      console.log('Initiating Google OAuth...');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' 
            ? `${window.location.origin}/auth/callback`
            : '/auth/callback',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          // Ensure session is persisted
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        console.error('OAuth initiation error:', error);
        throw error;
      }
      
      console.log('OAuth redirect initiated');
      // OAuth will redirect, so we don't need to return anything
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  },

  signOut: async (): Promise<void> => {
    try {
      // Sign out and clear session from localStorage
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Explicitly clear localStorage to ensure session is removed
      if (typeof window !== 'undefined') {
        // Clear all Supabase-related storage
      // Supabase uses keys like: sb-{projectRef}-auth-token
      if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach(key => {
          if (key.includes('supabase') || key.startsWith('sb-')) {
            localStorage.removeItem(key);
          }
        });
      }
      }
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  },

  getCurrentUser: async (): Promise<User | null> => {
    try {
      // First check session from localStorage (fast, works offline)
      // Supabase automatically persists sessions in localStorage when persistSession: true
      let { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // Log for debugging - check all Supabase storage keys
      if (typeof window !== 'undefined') {
        const allKeys = Object.keys(localStorage).filter(key => key.includes('supabase') || key.includes('sb-'));
        console.log('Supabase storage keys found:', allKeys);
        allKeys.forEach(key => {
          const value = localStorage.getItem(key);
          console.log(`Storage key ${key}:`, value ? 'exists' : 'missing');
        });
        console.log('Session check - session exists:', !!session);
        console.log('Session check - session error:', sessionError);
        if (session) {
          console.log('Session user:', session.user.email);
          console.log('Session expires at:', new Date(session.expires_at! * 1000).toLocaleString());
        }
      }
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        // Try to refresh the session if there's an error
        try {
          const refreshResult = await supabase.auth.refreshSession();
          if (refreshResult.data?.session?.user) {
            session = refreshResult.data.session;
            console.log('Session refreshed successfully');
          } else {
            console.log('No session after refresh');
            return null;
          }
        } catch (refreshError) {
          console.error('Error refreshing session:', refreshError);
          return null;
        }
      }
      
      if (!session?.user) {
        // No session found - user needs to sign in
        console.log('No session found - user needs to sign in');
        return null;
      }
      
      // Check if session is expired and refresh if needed
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = session.expires_at || 0;
      const timeUntilExpiry = expiresAt - now;
      
      console.log('Session expires in:', timeUntilExpiry, 'seconds');
      
      // Refresh if expired or expiring soon (within 5 minutes)
      if (expiresAt > 0 && timeUntilExpiry < 300) {
        try {
          console.log('Refreshing session (expiring soon or expired)');
          const refreshResult = await supabase.auth.refreshSession();
          if (refreshResult.error || !refreshResult.data?.session?.user) {
            console.error('Failed to refresh session:', refreshResult.error);
            return null;
          }
          // Use refreshed session
          session = refreshResult.data.session;
          console.log('Session refreshed successfully');
        } catch (refreshError) {
          console.error('Error refreshing expired session:', refreshError);
          // Don't return null here - use the existing session even if refresh fails
          // The session might still be valid for a short time
        }
      }

      // If we have a valid session, we can return a user object immediately
      // We'll try to get the full profile, but if it fails, we'll use session data
      console.log('Session is valid, creating user object from session');
      
      // Create user object from session data (this is always available)
      const userFromSession: User = {
        id: session.user.id,
        name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
        email: session.user.email || '',
        avatar: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || undefined,
      };
      
      console.log('User object created from session:', userFromSession.email);
      
      // Try to get user profile from database (non-blocking)
      // If this fails or times out, we still return the user from session
      try {
        const userProfile = await Promise.race([
          supabaseStorage.getUser(session.user.id),
          new Promise<User | null>((resolve) => {
            setTimeout(() => resolve(null), 1000); // 1 second timeout
          })
        ]);
        
        if (userProfile) {
          console.log('User profile found in database');
          return userProfile;
        } else {
          console.log('User profile not found or timed out, using session data');
          // Try to save the user profile (non-blocking, don't wait)
          supabaseStorage.saveUser(userFromSession).catch(err => {
            console.log('Failed to save user profile (non-critical):', err);
          });
          return userFromSession;
        }
      } catch (error) {
        console.error('Error getting user profile (non-critical):', error);
        // Return user from session even if profile fetch fails
        return userFromSession;
      }
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  onAuthStateChanged: (callback: (user: User | null) => void): (() => void) => {
    // Listen for auth state changes (sign in, sign out, token refresh, etc.)
    // This automatically handles session persistence and token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (session?.user) {
        // User is signed in - get their profile with timeout
        // Create user from session immediately (fast)
        const userFromSession: User = {
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          avatar: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || undefined,
        };
        
        // Call callback immediately with session data (don't wait for DB)
        console.log('Calling callback with user from session:', userFromSession.email);
        callback(userFromSession);
        
        // Try to get full profile in background (non-blocking)
        try {
          const fullUserData = await Promise.race([
            supabaseAuth.getCurrentUser(),
            new Promise<User | null>((resolve) => {
              setTimeout(() => resolve(null), 2000); // 2 second timeout
            })
          ]);
          
          // If we got full profile and it's different, call callback again
          if (fullUserData && fullUserData.id === userFromSession.id) {
            console.log('Got full user profile, updating callback');
            callback(fullUserData);
          }
        } catch (error) {
          console.error('Error getting full user profile (non-critical):', error);
          // Don't call callback again - we already called it with session data
        }
      } else {
        // User is signed out - clear callback
        console.log('User signed out, calling callback with null');
        callback(null);
      }
    });

    // Also check initial session state immediately (for page reloads)
    // This ensures users stay logged in when they refresh the page
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Create user from session immediately
        const userFromSession: User = {
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          avatar: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || undefined,
        };
        
        console.log('Initial session check - calling callback with user from session:', userFromSession.email);
        callback(userFromSession);
        
        // Try to get full profile in background
        supabaseAuth.getCurrentUser().then(fullUserData => {
          if (fullUserData && fullUserData.id === userFromSession.id) {
            console.log('Got full user profile on init, updating callback');
            callback(fullUserData);
          }
        }).catch(() => {
          // Already called with session data, so ignore error
        });
      } else {
        console.log('Initial session check - no session, calling callback with null');
        callback(null);
      }
    }).catch(() => {
      console.log('Initial session check - error, calling callback with null');
      callback(null);
    });

    return () => {
      subscription.unsubscribe();
    };
  },
};

