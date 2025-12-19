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
          // Exchange code for session
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
            // Wait a bit to ensure session is persisted
            await new Promise(resolve => setTimeout(resolve, 500));
            
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
              // Use window.location for a full page reload to ensure auth state is refreshed
              window.location.href = '/dashboard';
            } else {
              router.push('/');
            }
          } else {
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
