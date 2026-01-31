import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';

export const metadata = {
  title: 'Privacy Policy | CleanQuote.io',
  description: 'Privacy Policy for CleanQuote.io — how we collect, use, and protect your data.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <BrandLogo />
          </Link>
          <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Back to home
          </Link>
        </div>
      </header>
      <main className="flex-1 py-12 px-4 sm:px-6">
        <div className="mx-auto max-w-3xl prose prose-slate dark:prose-invert">
          <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: January 31, 2026</p>

          <h2 className="text-xl font-semibold text-foreground mt-8">1. Introduction</h2>
          <p className="text-muted-foreground">
            CleanQuote.io (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) respects your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services. By using the Service, you consent to the practices described in this policy.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">2. Information We Collect</h2>
          <h3 className="text-lg font-medium text-foreground mt-4">Account and Profile Information</h3>
          <p className="text-muted-foreground">
            When you create an account, we collect your email address and password (hashed). We support magic link (passwordless) sign-in via email. You may optionally provide your name or other profile details. Account data is stored by Supabase for authentication.
          </p>
          <h3 className="text-lg font-medium text-foreground mt-4">Organization and Team Data</h3>
          <p className="text-muted-foreground">
            When you create organizations or subaccounts, we store organization names, slugs, and member associations. When you invite team members by email, we send invite emails via Supabase Auth and/or Resend and store invitation records. Pending invitations include email addresses and role assignments until accepted or expired.
          </p>
          <h3 className="text-lg font-medium text-foreground mt-4">Product and Configuration Data</h3>
          <p className="text-muted-foreground">
            We store your quote tool configurations, including: pricing tables and structures (including Excel imports); custom survey questions and field mappings; widget and form settings; service area polygons (KML data); GoHighLevel (GHL) integration settings (API token, location ID, pipeline/stage mappings, calendar IDs, custom field mappings); tracking codes; and Google Maps API key (when you provide it). This data is stored in Supabase (PostgreSQL) and Vercel KV (Redis) for caching and configuration.
          </p>
          <h3 className="text-lg font-medium text-foreground mt-4">Quote and Lead Data</h3>
          <p className="text-muted-foreground">
            When your customers submit quote forms, we collect and store: contact information (name, email, phone, address); home details (square footage, bedrooms, baths, pets, condition, frequency); and calculated quote results. This data is stored in Supabase and may be synced to your GoHighLevel account when you have configured that integration. You are the data controller for this end-user data; we process it on your behalf.
          </p>
          <h3 className="text-lg font-medium text-foreground mt-4">Payment and Billing Information</h3>
          <p className="text-muted-foreground">
            Payment processing is handled by Stripe. We do not store full credit card numbers. Stripe collects and processes payment details in accordance with their privacy policy. We store Stripe customer IDs and subscription status to manage access.
          </p>
          <h3 className="text-lg font-medium text-foreground mt-4">Email and Communications</h3>
          <p className="text-muted-foreground">
            We use Resend for transactional emails (magic links, password resets, invite emails, checkout confirmations). If you use a support email address that receives inbound mail via Resend, those emails may be processed, stored, and displayed in our support inbox. Email metadata and content may be temporarily cached.
          </p>
          <h3 className="text-lg font-medium text-foreground mt-4">Technical and Log Data</h3>
          <p className="text-muted-foreground">
            We collect IP addresses, browser type, device information, referrer URLs, and general usage logs to operate, secure, and improve the Service. When the quote widget is embedded with UTM parameters, we may pass those parameters through for your tracking purposes. Our hosting provider (Vercel) may collect similar technical data.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">3. How We Use Your Information</h2>
          <p className="text-muted-foreground">
            We use the information we collect to: provide and maintain the Service; authenticate users and manage sessions; process payments and manage subscriptions; send transactional emails (magic links, invite emails, password resets, checkout confirmations); store and display quotes and leads; sync data to GoHighLevel when you configure that integration; perform service area checks using geocoding when enabled; support organization and team management; improve the Service; comply with legal obligations; and communicate with you about the Service. We do not sell your personal information.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">4. Third-Party Services and Data Processors</h2>
          <p className="text-muted-foreground">
            We use the following third-party services to operate the Service. Each processes data as described and has its own privacy policy:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
            <li><strong className="text-foreground">Supabase</strong> — Authentication (email, password hashes, session tokens), user management, PostgreSQL database (accounts, organizations, members, invitations, tools, quotes). Data may be stored in the US or other regions per Supabase.</li>
            <li><strong className="text-foreground">Stripe</strong> — Payment processing, subscription management, customer billing records. Stripe collects payment details directly; we do not store full card numbers.</li>
            <li><strong className="text-foreground">Vercel</strong> — Hosting, serverless functions, edge network. Request logs and deployment data may be processed.</li>
            <li><strong className="text-foreground">Vercel KV (Upstash Redis)</strong> — Caching, configuration storage (pricing, survey, widget settings, GHL config, service area polygons). Data may be stored in the US or EU per Upstash.</li>
            <li><strong className="text-foreground">Resend</strong> — Transactional email delivery (magic links, invite emails, checkout confirmations). Resend may process inbound email if you use a receiving address. Email content passes through their systems.</li>
            <li><strong className="text-foreground">GoHighLevel (GHL)</strong> — When you configure GHL integration, we transmit contact and opportunity data to GHL on your behalf. GHL processes this data per their privacy policy. You are responsible for your GHL account.</li>
            <li><strong className="text-foreground">Google Maps / Places API</strong> — When you provide your own Google Maps API key, address autocomplete and geocoding requests are sent to Google. We do not use a shared Google key; you control this integration and are subject to Google&apos;s privacy policy for that usage.</li>
          </ul>
          <p className="text-muted-foreground mt-4">
            We do not control these third parties. Their practices are governed by their own policies. We select providers that implement appropriate security measures.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">5. Data Sharing and Disclosure</h2>
          <p className="text-muted-foreground">
            We share data only as necessary to provide the Service: with the processors listed above; with GoHighLevel when you configure that integration (we transmit lead/quote data you instruct us to sync); as required by law or to protect our rights; or with your consent. We do not sell, rent, or trade your personal information. In the event of a merger or acquisition, your data may be transferred as part of that transaction.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">6. Cookies and Similar Technologies</h2>
          <p className="text-muted-foreground">
            We use cookies and similar technologies (e.g., local storage) to: maintain your authentication session (Supabase auth cookies); remember your selected organization (selected_org_id); and support the Service. Essential cookies are required for the Service to function. You can manage cookie preferences in your browser settings; disabling cookies may limit functionality.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">7. Data Retention</h2>
          <p className="text-muted-foreground">
            We retain your account, organization, and product data for as long as your account is active. Quote and lead data is retained for the life of your account. After account termination, we may retain data for a reasonable period for backup, legal, regulatory, or operational purposes. You may request deletion of your data by contacting us; we will process requests in accordance with applicable law.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">8. Data Security</h2>
          <p className="text-muted-foreground">
            We implement reasonable technical and organizational measures to protect your data, including encryption in transit (TLS/HTTPS) and at rest where supported by our processors. Access to production data is restricted. Passwords are hashed; we do not store plaintext passwords. No method of transmission over the internet is 100% secure; we cannot guarantee absolute security.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">9. Your Rights</h2>
          <p className="text-muted-foreground">
            Depending on your location, you may have the right to: access your data; correct inaccurate data; request deletion; restrict or object to processing; data portability; withdraw consent; and opt out of certain sales or sharing (we do not sell personal information). California residents: see CCPA section below. EU/EEA residents: you may have additional rights under GDPR, including the right to lodge a complaint with a supervisory authority. To exercise these rights, contact us at{' '}
            <a href="mailto:support@cleanquote.io" className="text-primary hover:underline">support@cleanquote.io</a>.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">10. California Privacy Rights (CCPA)</h2>
          <p className="text-muted-foreground">
            If you are a California resident, you may have the right to: know what personal information we collect and how it is used; request deletion of your personal information; opt out of the &quot;sale&quot; or &quot;sharing&quot; of your information (we do not sell personal information); and non-discrimination for exercising your rights. To make a request, contact us at support@cleanquote.io. We will verify your identity before processing.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">11. Data Transfers</h2>
          <p className="text-muted-foreground">
            Your data may be transferred to and processed in countries other than your own, including the United States. Our processors (Supabase, Stripe, Vercel, Upstash, Resend) may store data in various regions. We take appropriate safeguards, including contractual commitments where applicable, to ensure your data receives an adequate level of protection. By using the Service, you consent to such transfers.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">12. End-User Data (Quote Form Submissions)</h2>
          <p className="text-muted-foreground">
            When your customers submit quote forms, you are the data controller for that end-user data. We process it on your behalf as a data processor to generate quotes, store submissions, and sync to GHL when configured. You are responsible for obtaining consent, providing privacy notices, and complying with applicable laws (e.g., CCPA, GDPR) for data collected through your forms. We recommend you have a privacy policy that covers your collection of customer data via our quote widget.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">13. Children</h2>
          <p className="text-muted-foreground">
            The Service is not directed at individuals under 16. We do not knowingly collect personal information from children under 16. If you become aware that we have collected such data, please contact us and we will take steps to delete it.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">14. Changes to This Policy</h2>
          <p className="text-muted-foreground">
            We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on this page and updating the &quot;Last updated&quot; date. Your continued use of the Service after changes constitutes acceptance. For significant changes, we may provide additional notice (e.g., email).
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">15. Contact Us</h2>
          <p className="text-muted-foreground">
            For privacy-related questions, to exercise your rights, or to request data deletion, contact us at{' '}
            <a href="mailto:support@cleanquote.io" className="text-primary hover:underline">
              support@cleanquote.io
            </a>
            .
          </p>

          <p className="mt-12 text-sm text-muted-foreground">
            <Link href="/" className="text-primary hover:underline">
              ← Back to CleanQuote.io
            </Link>
          </p>
        </div>
      </main>
      <footer className="border-t border-border py-6">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <BrandLogo />
          </Link>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/" className="hover:text-foreground">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
