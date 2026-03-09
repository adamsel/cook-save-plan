import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { sendEmail } from '../_shared/email.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, householdName, inviterName, role } = await req.json();

    if (!email || !householdName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, householdName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const signupUrl = `${Deno.env.get('APP_URL') || 'https://recipestash.app'}/signup`;
    const roleText = role === 'admin' ? 'an admin' : 'a member';

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #10b981; margin: 0;">Recipe Stash</h1>
          <p style="color: #666; margin-top: 5px;">Meal planning for families</p>
        </div>

        <h2 style="color: #1f2937; margin-bottom: 16px;">You're invited to join a household!</h2>

        <p style="color: #4b5563; line-height: 1.6;">
          <strong>${inviterName || 'Someone'}</strong> has invited you to join their household
          <strong>"${householdName}"</strong> on Recipe Stash as ${roleText}.
        </p>

        <p style="color: #4b5563; line-height: 1.6;">
          With Recipe Stash, you can plan meals together, share recipes, and create shopping lists as a household.
        </p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${signupUrl}"
             style="display: inline-block; background: #10b981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Create Your Account
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
          Once you create an account with this email address (${email}), you'll automatically
          be added to the "${householdName}" household.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />

        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          If you didn't expect this invitation, you can safely ignore this email.
        </p>
      </div>
    `;

    console.log(`Sending household invitation to: ${email} for household: ${householdName}`);

    const result = await sendEmail({
      to: email,
      subject: `${inviterName || 'Someone'} invited you to join "${householdName}" on Recipe Stash`,
      html,
    });

    if (result.success) {
      console.log(`Household invitation email sent successfully to: ${email}`);
    } else {
      console.error(`Failed to send household invitation email to: ${email}:`, result.error);
    }

    return new Response(
      JSON.stringify({ success: result.success, error: result.error }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending household invitation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
