const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

// Use Resend's test domain until you verify your own domain
// Test domain only sends to your verified Resend email address
// To use your own domain: verify it at https://resend.com/domains
const DEFAULT_FROM_EMAIL = 'Recipe Stash <onboarding@resend.dev>';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured');
    return false;
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
      console.error('Resend API error:', JSON.stringify(responseData));
      return false;
    }

    console.log('Email sent successfully:', JSON.stringify(responseData));
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}
