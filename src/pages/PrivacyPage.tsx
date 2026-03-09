import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrivacyPage() {
  const lastUpdated = "January 27, 2026";
  const appName = "Recipe Stash";
  const companyName = "Recipe Stash";
  const contactEmail = "elizaadams720@gmail.com";

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl mx-auto px-4 py-8">
        <Link to="/">
          <Button variant="ghost" size="sm" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to app
          </Button>
        </Link>

        <article className="prose prose-slate dark:prose-invert max-w-none">
          <h1>Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: {lastUpdated}</p>

          <h2>1. Introduction</h2>
          <p>
            This Privacy Policy explains how {appName} ("we", "our", or "us") collects, uses, and protects
            your personal information when you use our meal planning service.
          </p>

          <h2>2. Information We Collect</h2>

          <h3>2.1 Account Information</h3>
          <p>When you create an account, we collect:</p>
          <ul>
            <li>Email address</li>
            <li>Password (securely hashed)</li>
            <li>Display name (optional)</li>
          </ul>

          <h3>2.2 User Content</h3>
          <p>Information you provide while using the Service:</p>
          <ul>
            <li>Recipes you create or import</li>
            <li>Meal plans</li>
            <li>Shopping lists</li>
            <li>Pantry items</li>
            <li>Household settings</li>
          </ul>

          <h3>2.3 Usage Data</h3>
          <p>We automatically collect:</p>
          <ul>
            <li>Log data (IP address, browser type, access times)</li>
            <li>Error reports (for debugging and improvement)</li>
            <li>Feature usage patterns (anonymized)</li>
          </ul>

          <h2>3. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul>
            <li>Provide and maintain the Service</li>
            <li>Enable features like household sharing and recipe collaboration</li>
            <li>Send important notifications (account security, service updates)</li>
            <li>Improve the Service based on usage patterns</li>
            <li>Debug errors and fix issues</li>
            <li>Process payments (for premium subscriptions)</li>
          </ul>

          <h2>4. Data Sharing</h2>

          <h3>4.1 Third-Party Services</h3>
          <p>We use the following third-party services:</p>
          <ul>
            <li><strong>Supabase</strong> - Database and authentication (data stored in their infrastructure)</li>
            <li><strong>Google Gemini AI</strong> - Recipe parsing and smart features (recipe text may be processed)</li>
            <li><strong>Spoonacular</strong> - Recipe discovery (searches are anonymized)</li>
            <li><strong>Sentry</strong> - Error monitoring (error context may include user ID)</li>
            <li><strong>Stripe</strong> - Payment processing (payment info handled by Stripe)</li>
          </ul>

          <h3>4.2 Household Sharing</h3>
          <p>
            When you share recipes or meal plans with household members, those members can view
            and (if permitted) edit that content. You control who has access via the app settings.
          </p>

          <h3>4.3 Public Recipes</h3>
          <p>
            If you make a recipe public, it may be visible to anyone with the link.
            You can make recipes private at any time.
          </p>

          <h2>5. Data Security</h2>
          <p>We protect your data through:</p>
          <ul>
            <li>Encryption in transit (HTTPS/TLS)</li>
            <li>Encryption at rest (database encryption)</li>
            <li>Secure password hashing (bcrypt)</li>
            <li>Row-level security policies (database access controls)</li>
            <li>Regular security audits</li>
          </ul>

          <h2>6. Data Retention</h2>
          <p>
            We retain your data as long as your account is active. When you delete your account,
            we delete your personal data within 30 days, except where required by law.
          </p>

          <h2>7. Your Rights</h2>
          <p>Depending on your location, you may have the right to:</p>
          <ul>
            <li><strong>Access</strong> - Request a copy of your data</li>
            <li><strong>Correction</strong> - Request correction of inaccurate data</li>
            <li><strong>Deletion</strong> - Request deletion of your data</li>
            <li><strong>Portability</strong> - Request your data in a portable format</li>
            <li><strong>Opt-out</strong> - Opt out of certain data processing</li>
          </ul>
          <p>To exercise these rights, contact us at {contactEmail}.</p>

          <h2>8. Cookies</h2>
          <p>
            We use essential cookies for authentication and session management. We do not use
            tracking cookies or third-party advertising cookies.
          </p>

          <h2>9. Children's Privacy</h2>
          <p>
            The Service is not intended for children under 13. We do not knowingly collect
            personal information from children under 13. If you believe we have collected
            such information, please contact us immediately.
          </p>

          <h2>10. International Data Transfers</h2>
          <p>
            Your data may be processed in countries other than your own. We ensure appropriate
            safeguards are in place for international transfers.
          </p>

          <h2>11. Changes to This Policy</h2>
          <p>
            We may update this policy from time to time. We will notify you of significant changes
            via email or in-app notification. The "Last updated" date at the top indicates the
            most recent revision.
          </p>

          <h2>12. Contact Us</h2>
          <p>
            For privacy-related questions or concerns, contact us at:
          </p>
          <ul>
            <li>Email: {contactEmail}</li>
          </ul>

          <hr className="my-8" />

          <p className="text-sm text-muted-foreground">
            {companyName} | {appName}
          </p>
        </article>
      </div>
    </div>
  );
}
