'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseAuth } from '@/lib/supabase-auth';
import { supabaseStorage } from '@/lib/supabase-storage';
import { User, Group } from '@/types';
import { useToast } from '@/components/ToastContainer';

export default function NewGroup() {
  const router = useRouter();
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const unsubscribe = supabaseAuth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push('/');
        return;
      }

      try {
        setCurrentUser(user);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleCreateGroup = async () => {
    if (!groupName.trim() || !currentUser) return;

    try {
      setCreating(true);
      const newGroup: Group = {
        id: Date.now().toString(),
        name: groupName.trim(),
        description: description.trim() || undefined,
        members: [currentUser.id], // Only creator is a member initially
        createdAt: new Date().toISOString(),
        currency: currency,
        createdBy: currentUser.id,
      };

      await supabaseStorage.saveGroup(newGroup, currentUser.id);
      toast.showSuccess(`Group "${groupName.trim()}" created successfully! 🎉`);
      toast.showInfo('You can invite members via email from the group page.');
      router.push(`/groups/${newGroup.id}`);
    } catch (error) {
      console.error('Error creating group:', error);
      toast.showError('Failed to create group. Please try again.');
    } finally {
      setCreating(false);
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
            <Link href="/dashboard" className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <div className="w-8 h-8 bg-money-green-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              SplitMate
            </Link>
            <span className="text-gray-800 font-semibold">Create New Group</span>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md border border-green-100 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <svg className="w-6 h-6 text-money-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Group
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Group Name *
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-money-green-500 focus:border-transparent text-gray-800"
                placeholder="e.g., Roommates, Trip to Paris"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-money-green-500 focus:border-transparent text-gray-800"
                rows={3}
                placeholder="Add a description for this group"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Currency *
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-money-green-500 text-gray-800 bg-white"
              >
                <option value="USD">$ US Dollar (USD)</option>
                <option value="EUR">€ Euro (EUR)</option>
                <option value="GBP">£ British Pound (GBP)</option>
                <option value="INR">₹ Indian Rupee (INR)</option>
                <option value="JPY">¥ Japanese Yen (JPY)</option>
                <option value="CAD">C$ Canadian Dollar (CAD)</option>
                <option value="AUD">A$ Australian Dollar (AUD)</option>
              </select>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">Invite Members After Creation</p>
                  <p className="text-xs text-blue-700">
                    You'll be the only member initially. After creating the group, you can invite others via email from the group page.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || creating}
                className="flex-1 bg-money-green-600 text-white py-2 rounded-lg font-semibold hover:bg-money-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md"
              >
                {creating ? 'Creating...' : 'Create Group'}
              </button>
              <Link
                href="/dashboard"
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors text-center"
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
