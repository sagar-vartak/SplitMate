'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseAuth } from '@/lib/supabase-auth';
import { supabaseStorage } from '@/lib/supabase-storage';
import { User, Group } from '@/types';

export default function Dashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

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

    // Initial check
    const checkAuthAndLoad = async () => {
      try {
        const user = await Promise.race([
          supabaseAuth.getCurrentUser(),
          new Promise<User | null>((resolve) => 
            setTimeout(() => resolve(null), 3000)
          )
        ]) as User | null;

        if (!mounted) return;

        if (!user) {
          clearTimeout(timeoutId);
          router.push('/');
          return;
        }

        setCurrentUser(user);
        
        // Load groups with timeout
        try {
          const userGroups = await Promise.race([
            supabaseStorage.getGroups(user.id),
            new Promise<Group[]>((resolve) => 
              setTimeout(() => resolve([]), 3000)
            )
          ]) as Group[];
          
          if (mounted) {
            setGroups(userGroups);
            clearTimeout(timeoutId);
            setLoading(false);
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
            clearTimeout(timeoutId);
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        if (mounted) {
          clearTimeout(timeoutId);
          setLoading(false);
        }
      }
    };

    checkAuthAndLoad();

    // Also listen for auth state changes
    const unsubscribe = supabaseAuth.onAuthStateChanged((user) => {
      if (!mounted) return;
      
      clearTimeout(timeoutId);
      
      if (!user) {
        router.push('/');
        return;
      }

      setCurrentUser(user);
      setLoading(false);

      // Clean up old subscription
      if (groupsUnsubscribe) {
        groupsUnsubscribe();
      }

      // Subscribe to real-time updates
      groupsUnsubscribe = supabaseStorage.subscribeToGroups(user.id, (updatedGroups) => {
        if (mounted) {
          setGroups(updatedGroups);
        }
      });
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-800">Splitwise Clone</h1>
            <div className="flex items-center gap-4">
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
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
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
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Create Group
          </Link>
        </div>

        {groups.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 mb-4">You don't have any groups yet.</p>
            <Link
              href="/groups/new"
              className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
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
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
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
