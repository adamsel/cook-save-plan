import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TermsPage() {
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
          <h1>Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: {lastUpdated}</p>

          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using {appName} ("the Service"), you agree to be bound by these Terms of Service.
            If you do not agree to these terms, please do not use the Service.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            {appName} is a meal planning and recipe management application that allows users to:
          </p>
          <ul>
            <li>Store and organize recipes</li>
            <li>Create weekly meal plans</li>
            <li>Generate shopping lists</li>
            <li>Collaborate with household members</li>
            <li>Discover new recipes</li>
          </ul>

          <h2>3. User Accounts</h2>
          <p>
            To use certain features of the Service, you must create an account. You are responsible for:
          </p>
          <ul>
            <li>Maintaining the confidentiality of your account credentials</li>
            <li>All activities that occur under your account</li>
            <li>Notifying us immediately of any unauthorized use</li>
          </ul>

          <h2>4. User Content</h2>
          <p>
            You retain ownership of any content you submit to the Service (recipes, meal plans, etc.).
            By submitting content, you grant us a license to store, display, and process that content
            to provide the Service to you.
          </p>

          <h2>5. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Service for any illegal purpose</li>
            <li>Upload malicious content or code</li>
            <li>Attempt to access other users' accounts</li>
            <li>Interfere with the proper operation of the Service</li>
            <li>Scrape or harvest data from the Service without permission</li>
          </ul>

          <h2>6. Third-Party Services</h2>
          <p>
            The Service may integrate with third-party services (such as Spoonacular for recipe discovery).
            Your use of these features is subject to the respective third parties' terms and privacy policies.
          </p>

          <h2>7. Payment Terms</h2>
          <p>
            Certain features require a paid subscription. Subscriptions are billed in advance on a monthly
            or annual basis. Refunds are provided in accordance with applicable law.
          </p>

          <h2>8. Limitation of Liability</h2>
          <p>
            THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. TO THE MAXIMUM EXTENT PERMITTED
            BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
            DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
          </p>

          <h2>9. Changes to Terms</h2>
          <p>
            We may modify these terms at any time. We will notify users of significant changes via email
            or in-app notification. Continued use of the Service after changes constitutes acceptance.
          </p>

          <h2>10. Termination</h2>
          <p>
            We may terminate or suspend your account at any time for violations of these terms.
            You may delete your account at any time through the Settings page.
          </p>

          <h2>11. Contact</h2>
          <p>
            For questions about these terms, contact us at: {contactEmail}
          </p>

          <hr className="my-8" />

          <p className="text-sm text-muted-foreground">
            {companyName} | {appName}
          </p>
        </article>
      </div>
    </div>
  );
}
