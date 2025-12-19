'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabaseAuth } from '@/lib/supabase-auth';
import { supabaseStorage } from '@/lib/supabase-storage';
import { supabase } from '@/lib/supabase';
import { User, Group } from '@/types';
import { useToast } from '@/components/ToastContainer';

export default function InviteAcceptancePage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;
  const toast = useToast();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);
  const [group, setGroup] = useState<Group | null>(null);

  useEffect(() => {
    const loadInvitation = async () => {
      try {
        setLoading(true);
        
        // Step 1: Get invitation by token (this works without auth due to RLS policy)
        const { data: invitationData, error: inviteError } = await supabase
          .from('group_invites')
          .select('*')
          .eq('token', token)
          .single();

        if (inviteError || !invitationData) {
          console.error('Error fetching invitation:', inviteError);
          toast.showError('Invalid or expired invitation link');
          setTimeout(() => router.push('/dashboard'), 2000);
          return;
        }

        // Check if expired
        const expiresAt = new Date(invitationData.expires_at);
        if (expiresAt < new Date() && invitationData.status === 'pending') {
          toast.showError('This invitation has expired');
          setTimeout(() => router.push('/dashboard'), 2000);
          return;
        }

        if (invitationData.status !== 'pending') {
          toast.showError('This invitation has already been used');
          setTimeout(() => router.push('/dashboard'), 2000);
          return;
        }

        // Set invitation
        setInvitation(invitationData);

        // Step 2: Get group data using the SECURITY DEFINER function
        // This bypasses RLS and allows reading group data for valid invitations
        const { data: groupDataArray, error: groupError } = await supabase
          .rpc('get_group_for_invitation', { invitation_token: token });

        if (groupError || !groupDataArray || groupDataArray.length === 0) {
          console.error('Error fetching group:', groupError);
          console.error('Group ID:', invitationData.group_id);
          toast.showError('Group not found. Please check that the invitation link is valid.');
          setTimeout(() => router.push('/dashboard'), 2000);
          return;
        }

        // The function returns a table, so we get the first row
        const groupData = groupDataArray[0];

        // Transform to Group type
        const group: Group = {
          id: groupData.id,
          name: groupData.name,
          description: groupData.description || undefined,
          members: groupData.members || [],
          createdAt: groupData.created_at,
          currency: groupData.currency || 'USD',
          createdBy: groupData.created_by || undefined,
        };

        setGroup(group);

        // Check if user is logged in
        const user = await supabaseAuth.getCurrentUser();
        if (user) {
          setCurrentUser(user);
        }
      } catch (error) {
        console.error('Error loading invitation:', error);
        toast.showError('Failed to load invitation');
        setTimeout(() => router.push('/dashboard'), 2000);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      loadInvitation();
    }
  }, [token, router, toast]);

  const handleAccept = async () => {
    if (!currentUser) {
      // Redirect to login with return URL
      router.push(`/?invite=${token}`);
      return;
    }

    if (!invitation || !group) {
      toast.showError('Invalid invitation');
      return;
    }

    try {
      setAccepting(true);
      const updatedGroup = await supabaseStorage.acceptInvitation(token, currentUser.id);
      
      if (updatedGroup) {
        toast.showSuccess(`Successfully joined "${group.name}"! 🎉`);
        setTimeout(() => {
          router.push(`/groups/${group.id}`);
        }, 1000);
      }
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast.showError(error.message || 'Failed to accept invitation. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-money-green-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (!invitation || !group) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full border border-green-100 text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Invitation</h1>
          <p className="text-gray-600 mb-6">
            This invitation link is invalid or has expired.
          </p>
          <Link
            href="/dashboard"
            className="inline-block bg-money-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-money-green-700 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full border border-green-100">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-money-green-600 rounded-full mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Group Invitation
          </h1>
          <p className="text-gray-600">
            You've been invited to join a group
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">Group Name</div>
            <div className="text-lg font-semibold text-gray-900">{group.name}</div>
            {group.description && (
              <div className="text-sm text-gray-600 mt-1">{group.description}</div>
            )}
          </div>

          {!currentUser && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Please sign in to accept this invitation and join the group.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {!currentUser ? (
            <Link
              href={`/?invite=${token}`}
              className="w-full bg-money-green-600 text-white py-3 rounded-lg font-semibold hover:bg-money-green-700 transition-colors shadow-md hover:shadow-lg text-center block"
            >
              Sign In to Accept
            </Link>
          ) : (
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full bg-money-green-600 text-white py-3 rounded-lg font-semibold hover:bg-money-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              {accepting ? 'Accepting...' : 'Accept Invitation'}
            </button>
          )}

          <Link
            href="/dashboard"
            className="w-full bg-gray-200 text-gray-800 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors text-center block"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}

