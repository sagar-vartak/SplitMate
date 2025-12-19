'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseAuth } from '@/lib/supabase-auth';
import { User } from '@/types';

export default function Home() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    // Set a timeout to prevent infinite loading
    timeoutId = setTimeout(() => {
      if (mounted) {
        console.warn('Auth check timeout - setting loading to false');
        setLoading(false);
      }
    }, 5000); // 5 second timeout

    // Check if user is already signed in
    const checkSession = async () => {
      try {
        const user = await Promise.race([
          supabaseAuth.getCurrentUser(),
          new Promise<User | null>((resolve) => 
            setTimeout(() => resolve(null), 3000)
          )
        ]) as User | null;

        if (!mounted) return;

        if (user) {
          clearTimeout(timeoutId);
          setCurrentUser(user);
          setLoading(false);
          router.push('/dashboard');
          return;
        }
      } catch (error) {
        console.error('Error checking session:', error);
      }
      
      if (mounted) {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };

    checkSession();

    // Also listen for auth state changes
    const unsubscribe = supabaseAuth.onAuthStateChanged((user) => {
      if (!mounted) return;
      
      clearTimeout(timeoutId);
      setCurrentUser(user);
      setLoading(false);
      
      if (user) {
        router.push('/dashboard');
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      unsubscribe();
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
      alert('Failed to sign in with Google. Please try again.');
      setSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (currentUser) {
    router.push('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">
          Welcome to Splitwise Clone
        </h1>
        <p className="text-gray-600 text-center mb-8">
          Split expenses with friends easily
        </p>
        
        <div className="space-y-4">
          <button
            onClick={handleSignInWithGoogle}
            disabled={signingIn}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
