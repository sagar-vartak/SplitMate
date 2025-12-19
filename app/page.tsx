'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { supabaseAuth } from '@/lib/supabase-auth';
import { User } from '@/types';
import { useToast } from '@/components/ToastContainer';

export default function Home() {
  const router = useRouter();
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;
    let authUnsubscribe: (() => void) | null = null;

    // Set a timeout to prevent infinite loading
    timeoutId = setTimeout(() => {
      if (mounted) {
        console.warn('Auth check timeout - setting loading to false');
        setLoading(false);
      }
    }, 10000); // 10 second timeout (increased to allow for network delays)

    // Check session immediately (Supabase should have it in localStorage)
    const checkSession = async () => {
      try {
        // Check session directly from Supabase first (fastest)
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('Session found directly:', session.user.email);
          // Get full user data
          const user = await supabaseAuth.getCurrentUser();
          
          if (!mounted) return;
          
          if (user) {
            console.log('User found, redirecting to dashboard:', user.email);
            clearTimeout(timeoutId);
            setCurrentUser(user);
            setLoading(false);
            if (!hasShownWelcome) {
              toast.showSuccess(`Welcome back, ${user.name}! 👋`);
              setHasShownWelcome(true);
            }
            router.push('/dashboard');
            return;
          }
        } else {
          console.log('No session found in localStorage');
        }
      } catch (error) {
        console.error('Error checking session:', error);
      }
      
      if (mounted) {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };

    // Set up auth state listener (for real-time changes)
           authUnsubscribe = supabaseAuth.onAuthStateChanged((user) => {
             if (!mounted) return;

             console.log('Auth state changed callback:', user ? user.email : 'no user');
             clearTimeout(timeoutId);
             setCurrentUser(user);
             setLoading(false);

             if (user && !hasShownWelcome) {
               toast.showSuccess(`Welcome, ${user.name}! 🎉`);
               setHasShownWelcome(true);
               router.push('/dashboard');
             } else if (user) {
               router.push('/dashboard');
             }
           });

    // Do immediate check
    checkSession();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      if (authUnsubscribe) {
        authUnsubscribe();
      }
    };
  }, [router]);

  const handleSignInWithGoogle = async () => {
    try {
      setSigningIn(true);
      await supabaseAuth.signInWithGoogle();
      // OAuth redirects, so we don't need to do anything else here
    } catch (error: any) {
      if (error.message === 'OAuth redirect initiated') {
        // This is expected - OAuth will redirect
        return;
      }
      console.error('Sign in error:', error);
      toast.showError('Failed to sign in with Google. Please try again.');
      setSigningIn(false);
    }
  };

  if (loading) {
    return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-money-green-600 mx-auto mb-4"></div>
        <p className="text-gray-700">Loading...</p>
      </div>
    </div>
    );
  }

  if (currentUser) {
    router.push('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full border border-green-100">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-money-green-600 rounded-full mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            SplitMate
          </h1>
          <p className="text-gray-600">
            Split expenses with friends easily
          </p>
        </div>
        
        <div className="space-y-4">
                 <button
                   onClick={handleSignInWithGoogle}
                   disabled={signingIn}
                   className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 text-gray-800 py-3 px-4 rounded-lg font-semibold hover:bg-green-50 hover:border-money-green-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                 >
            {signingIn ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </>
            )}
          </button>
          
          <div className="text-center text-sm text-gray-500 mt-6">
            <p>By signing in, you agree to share your data</p>
            <p>across all your devices.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
