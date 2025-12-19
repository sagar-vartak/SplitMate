'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { supabaseAuth } from '@/lib/supabase-auth';
import { supabaseStorage } from '@/lib/supabase-storage';
import { User, Group } from '@/types';

export default function Dashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(true);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;
    let groupsUnsubscribe: (() => void) | null = null;

    // Set a timeout to prevent infinite loading
    timeoutId = setTimeout(() => {
      if (mounted) {
        console.warn('Dashboard loading timeout - setting loading to false');
        setLoading(false);
      }
    }, 5000); // 5 second timeout

    // Check session directly first (fastest way)
    const checkAuthAndLoad = async () => {
      try {
        // Check session directly from Supabase first (fast, from localStorage)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        console.log('Dashboard: Session check - session exists:', !!session);
        console.log('Dashboard: Session error:', sessionError);
        
        if (sessionError) {
          console.error('Dashboard: Session error:', sessionError);
          if (mounted) {
            clearTimeout(timeoutId);
            setLoading(false);
            router.push('/');
          }
          return;
        }
        
        if (!session?.user) {
          console.log('Dashboard: No session found, redirecting to login');
          if (mounted) {
            clearTimeout(timeoutId);
            setLoading(false);
            router.push('/');
          }
          return;
        }
        
        console.log('Dashboard: Session found, getting user data:', session.user.email);
        
        // Get full user data
        const user = await supabaseAuth.getCurrentUser();

        if (!mounted) return;

        if (!user) {
          console.error('Dashboard: Failed to get user data despite having session');
          clearTimeout(timeoutId);
          setLoading(false);
          router.push('/');
          return;
        }

        console.log('Dashboard: User data loaded, loading groups:', user.email);
        setCurrentUser(user);
        setLoading(false); // Auth is done, show the page
        setLoadingGroups(true); // Start loading groups indicator
        
        // Load groups (don't timeout this - let it complete)
        try {
          const userGroups = await supabaseStorage.getGroups(user.id);
          
          if (mounted) {
            setGroups(userGroups);
            setLoadingGroups(false); // Groups loaded
            clearTimeout(timeoutId);
            console.log('Dashboard: Groups loaded, dashboard ready');
          }

          // Subscribe to real-time updates
          if (mounted) {
            groupsUnsubscribe = supabaseStorage.subscribeToGroups(user.id, (updatedGroups) => {
              if (mounted) {
                setGroups(updatedGroups);
              }
            });
          }
        } catch (error) {
          console.error('Error loading groups:', error);
          if (mounted) {
            setGroups([]);
            setLoadingGroups(false); // Stop loading indicator even on error
            clearTimeout(timeoutId);
          }
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        if (mounted) {
          clearTimeout(timeoutId);
          setLoading(false);
          router.push('/');
        }
      }
    };

    checkAuthAndLoad();

    // Also listen for auth state changes (for real-time updates)
    const unsubscribe = supabaseAuth.onAuthStateChanged((user) => {
      if (!mounted) return;
      
      console.log('Dashboard: Auth state changed:', user ? user.email : 'no user');
      
      clearTimeout(timeoutId);
      
      if (!user) {
        console.log('Dashboard: User signed out, redirecting');
        router.push('/');
        return;
      }

      // Only update if we don't already have this user
      if (!currentUser || currentUser.id !== user.id) {
        console.log('Dashboard: User changed, updating');
        setCurrentUser(user);
        setLoading(false);
        setLoadingGroups(true); // Start loading groups

        // Clean up old subscription
        if (groupsUnsubscribe) {
          groupsUnsubscribe();
        }

        // Load groups for the new user
        supabaseStorage.getGroups(user.id).then((userGroups) => {
          if (mounted) {
            setGroups(userGroups);
            setLoadingGroups(false);
          }
        }).catch((error) => {
          console.error('Error loading groups:', error);
          if (mounted) {
            setGroups([]);
            setLoadingGroups(false);
          }
        });

        // Subscribe to real-time updates
        groupsUnsubscribe = supabaseStorage.subscribeToGroups(user.id, (updatedGroups) => {
          if (mounted) {
            setGroups(updatedGroups);
            // Don't set loadingGroups to false here - it's already false after initial load
          }
        });
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      unsubscribe();
      if (groupsUnsubscribe) {
        groupsUnsubscribe();
      }
    };
  }, [router]);

  const handleSignOut = async () => {
    try {
      await supabaseAuth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-money-green-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-green-100">
      <nav className="bg-white shadow-md border-b-2 border-money-green-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-money-green-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">SplitMate</h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="Notifications"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
              </button>
              {currentUser.avatar && (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="text-gray-600">Hello, {currentUser.name}</span>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-3xl font-bold text-gray-800">Your Groups</h2>
          <Link
            href="/groups/new"
            className="bg-money-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-money-green-700 transition-colors shadow-md hover:shadow-lg"
          >
            Create Group
          </Link>
        </div>

        {loadingGroups ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-money-green-600 mb-4"></div>
              <p className="text-gray-600 text-lg">Loading your groups...</p>
              <p className="text-gray-400 text-sm mt-2">Please wait</p>
            </div>
          </div>
        ) : groups.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 mb-4">You don't have any groups yet.</p>
              <Link
                href="/groups/new"
                className="inline-block bg-money-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-money-green-700 transition-colors shadow-md hover:shadow-lg"
              >
                Create Your First Group
              </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map(group => (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all p-6 border border-green-100 hover:border-money-green-300"
              >
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{group.name}</h3>
                {group.description && (
                  <p className="text-gray-600 text-sm mb-4">{group.description}</p>
                )}
                <div className="text-sm text-gray-500">
                  {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
