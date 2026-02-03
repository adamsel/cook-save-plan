const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

// For testing: Using Resend test domain (only sends to verified recipients)
// For production: Replace with your verified domain (e.g., invites@recipestash.app)
// Verify domain at https://resend.com/domains
const DEFAULT_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'Recipe Stash <onboarding@resend.dev>';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

interface SendEmailResult {
  success: boolean;
  error?: string;
}

export async function sendEmail(options: EmailOptions): Promise<SendEmailResult> {
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured');
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  const fromEmail = options.from || DEFAULT_FROM_EMAIL;

  try {
    console.log(`Sending email to: ${options.to}, from: ${fromEmail}`);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      const errorMsg = responseData.message || responseData.error || JSON.stringify(responseData);
      console.error('Resend API error:', errorMsg);
      return { success: false, error: errorMsg };
    }

    console.log('Email sent successfully:', JSON.stringify(responseData));
    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}
