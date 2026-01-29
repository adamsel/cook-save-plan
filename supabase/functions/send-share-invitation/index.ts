import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { sendEmail } from "../_shared/email.ts";
import {
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
  RATE_LIMITS,
} from "../_shared/rateLimiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  recipeTitle: string;
  sharerName: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting
  const clientIP = getClientIP(req);
  const rateLimit = checkRateLimit(clientIP, RATE_LIMITS.GENERAL);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit, corsHeaders);
  }

  try {
    const { email, recipeTitle, sharerName }: InvitationRequest = await req.json();

    if (!email || !recipeTitle) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, recipeTitle" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const appUrl = Deno.env.get("APP_URL") || "https://recipestash.app";
    const signupUrl = `${appUrl}/signup`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #10b981; margin: 0;">Recipe Stash</h1>
        </div>

        <h2 style="color: #1f2937; margin-bottom: 16px;">You've been invited!</h2>

        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          <strong>${sharerName || "Someone"}</strong> shared a recipe with you:
        </p>

        <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="font-size: 18px; font-weight: 600; color: #1f2937; margin: 0;">
            ${recipeTitle}
          </p>
        </div>

        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          Create your free account to view the recipe and start planning meals together.
        </p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${signupUrl}" style="display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Create Account
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />

        <p style="color: #9ca3af; font-size: 14px; text-align: center;">
          If you didn't expect this email, you can safely ignore it.
        </p>
      </div>
    `;

    const success = await sendEmail({
      to: email,
      subject: `${sharerName || "Someone"} shared a recipe with you on Recipe Stash`,
      html,
    });

    if (!success) {
      // Don't fail the request if email fails - the pending share is still created
      console.warn("Failed to send invitation email to:", email);
    }

    return new Response(
      JSON.stringify({ success }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Send invitation error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send invitation" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
