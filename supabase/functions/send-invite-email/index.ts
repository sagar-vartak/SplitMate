// Supabase Edge Function to send invitation emails
// This keeps email sending within the Supabase ecosystem

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'SplitMate <onboarding@resend.dev>';

interface InviteRequest {
  groupId: string;
  email: string;
  invitedBy: string;
  accessToken: string;
}

serve(async (req) => {
  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      });
    }

    const { groupId, email, invitedBy, accessToken }: InviteRequest = await req.json();

    if (!groupId || !email || !invitedBy || !accessToken) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    // Create Supabase client with user's access token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user || user.id !== invitedBy) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    // Get group
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (groupError || !groupData) {
      return new Response(
        JSON.stringify({ error: 'Group not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    // Verify user is a member
    const members = groupData.members || [];
    if (!Array.isArray(members) || !members.includes(invitedBy)) {
      return new Response(
        JSON.stringify({ error: 'You must be a member of this group' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    // Get inviter's name
    const { data: inviterData } = await supabase
      .from('users')
      .select('name')
      .eq('id', invitedBy)
      .single();
    
    const inviterName = inviterData?.name || 'Someone';

    // Generate invitation token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitationId = crypto.randomUUID();

    // Save invitation
    const { error: inviteError } = await supabase
      .from('group_invites')
      .insert({
        id: invitationId,
        group_id: groupId,
        email: email.toLowerCase().trim(),
        invited_by: invitedBy,
        token: token,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
      });

    if (inviteError) {
      console.error('Error creating invitation:', inviteError);
      return new Response(
        JSON.stringify({ error: 'Failed to create invitation' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    // Generate invitation link
    const baseUrl = Deno.env.get('NEXT_PUBLIC_APP_URL') || 'http://localhost:3000';
    const invitationLink = `${baseUrl}/invite/${token}`;

    // Send email if Resend is configured
    if (RESEND_API_KEY) {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: RESEND_FROM_EMAIL,
            to: email,
            subject: `${inviterName} invited you to join "${groupData.name}" on SplitMate`,
            html: `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Group Invitation - SplitMate</title>
                </head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">💰 SplitMate</h1>
                  </div>
                  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #1f2937; margin-top: 0;">You've been invited!</h2>
                    <p style="font-size: 16px; color: #4b5563;">
                      <strong>${inviterName}</strong> has invited you to join the group <strong>"${groupData.name}"</strong> on SplitMate.
                    </p>
                    <p style="font-size: 16px; color: #4b5563;">
                      SplitMate helps you split expenses with friends easily. Click the button below to accept the invitation and start splitting expenses!
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${invitationLink}" 
                         style="display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                        Accept Invitation
                      </a>
                    </div>
                    <p style="font-size: 14px; color: #6b7280; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                      If the button doesn't work, copy and paste this link into your browser:<br>
                      <a href="${invitationLink}" style="color: #10b981; word-break: break-all;">${invitationLink}</a>
                    </p>
                    <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">
                      This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
                    </p>
                  </div>
                </body>
              </html>
            `,
          }),
        });

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json();
          console.error('Resend API error:', errorData);
        }
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        // Don't fail the request if email fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        invitation: {
          id: invitationId,
          email: email.toLowerCase().trim(),
          status: 'pending',
          token: token,
          link: invitationLink,
        },
        message: RESEND_API_KEY 
          ? 'Invitation email sent successfully' 
          : 'Invitation created. Email service not configured.',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  } catch (error) {
    console.error('Error in send-invite-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }
});

