'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { supabaseAuth } from '@/lib/supabase-auth';
import { User } from '@/types';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the code from URL (for OAuth) - check both query params and hash
        let code = searchParams.get('code');
        let errorParam = searchParams.get('error');
        let errorDescription = searchParams.get('error_description');
        
        // Also check hash fragment (Supabase OAuth sometimes uses hash)
        if (typeof window !== 'undefined' && !code) {
          const hash = window.location.hash.substring(1);
          const hashParams = new URLSearchParams(hash);
          code = code || hashParams.get('code') || hashParams.get('access_token');
          errorParam = errorParam || hashParams.get('error');
          errorDescription = errorDescription || hashParams.get('error_description');
        }

        if (errorParam) {
          setError(errorDescription || errorParam);
          setTimeout(() => {
            router.push('/');
          }, 3000);
          return;
        }

        if (code) {
          console.log('OAuth code received, exchanging for session...');
          
          // Exchange code for session
          // This should automatically persist the session when persistSession: true
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            console.error('Exchange error:', exchangeError);
            setError(exchangeError.message);
            setTimeout(() => {
              router.push('/');
            }, 3000);
            return;
          }

          if (data.session && data.user) {
            console.log('Session received from OAuth:', data.user.email);
            
            // Verify session is actually saved to localStorage
            // Wait a bit and check multiple times to ensure persistence
            let sessionPersisted = false;
            for (let i = 0; i < 5; i++) {
              await new Promise(resolve => setTimeout(resolve, 200));
              const { data: { session: verifySession } } = await supabase.auth.getSession();
              if (verifySession && verifySession.user.id === data.user.id) {
                console.log('Session verified in localStorage (attempt', i + 1, ')');
                sessionPersisted = true;
                break;
              }
            }
            
            if (!sessionPersisted) {
              console.error('Session was not persisted to localStorage!');
              // Try to manually set the session
              const { error: setSessionError } = await supabase.auth.setSession({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
              });
              if (setSessionError) {
                console.error('Failed to manually set session:', setSessionError);
              } else {
                console.log('Session manually set successfully');
              }
            }
            
            // Verify one more time
            const { data: { session: finalSession } } = await supabase.auth.getSession();
            if (!finalSession) {
              console.error('Session still not found after all attempts!');
              setError('Failed to save session. Please try signing in again.');
              setTimeout(() => {
                router.push('/');
              }, 3000);
              return;
            }
            
            console.log('Session confirmed in localStorage, proceeding...');
            
            // Create or get user profile
            let userData = await supabaseAuth.getCurrentUser();
            if (!userData && data.user) {
              // Create user profile if it doesn't exist
              const newUser = {
                id: data.user.id,
                name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User',
                email: data.user.email || '',
                avatar: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || undefined,
              };
              try {
                // Try to save the user profile
                const { supabaseStorage } = await import('@/lib/supabase-storage');
                await supabaseStorage.saveUser(newUser);
                userData = await supabaseAuth.getCurrentUser();
              } catch (saveError) {
                console.error('Error saving user profile:', saveError);
                // Use the user data we have even if save fails
                userData = newUser as User;
              }
            }
            
            if (userData) {
              console.log('User data ready, redirecting to dashboard...');
              // Use window.location for a full page reload to ensure auth state is refreshed
              window.location.href = '/dashboard';
            } else {
              console.error('No user data available');
              router.push('/');
            }
          } else {
            console.error('No session or user in OAuth response');
            router.push('/');
          }
        } else {
          // Check if there's already a session (for direct access or refresh)
          const { data, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('Session error:', sessionError);
            setError(sessionError.message);
            setTimeout(() => {
              router.push('/');
            }, 3000);
            return;
          }

          if (data.session) {
            const userData = await supabaseAuth.getCurrentUser();
            if (userData) {
              window.location.href = '/dashboard';
            } else {
              router.push('/');
            }
          } else {
            router.push('/');
          }
        }
      } catch (error: any) {
        console.error('Callback error:', error);
        setError(error.message || 'An error occurred');
        setTimeout(() => {
          router.push('/');
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Redirecting to home page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-money-green-600 mx-auto mb-4"></div>
        <p className="text-gray-700">Completing sign in...</p>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-money-green-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
