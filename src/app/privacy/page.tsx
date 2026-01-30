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
          <p className="text-muted-foreground">Last updated: January 30, 2026</p>

          <h2 className="text-xl font-semibold text-foreground mt-8">1. Introduction</h2>
          <p className="text-muted-foreground">
            CleanQuote.io (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) respects your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">2. Information We Collect</h2>
          <h3 className="text-lg font-medium text-foreground mt-4">Account Information</h3>
          <p className="text-muted-foreground">
            When you create an account, we collect your email address and password. You may optionally provide your name or other profile details.
          </p>
          <h3 className="text-lg font-medium text-foreground mt-4">Usage and Product Data</h3>
          <p className="text-muted-foreground">
            We collect information about how you use the Service, including your quote forms, pricing configurations, survey questions, and integration settings (e.g., GoHighLevel).
          </p>
          <h3 className="text-lg font-medium text-foreground mt-4">Lead and End-User Data</h3>
          <p className="text-muted-foreground">
            When your customers use your quote forms (e.g., address, home size, contact info), we process that data on your behalf to generate quotes. You control this data as the account owner.
          </p>
          <h3 className="text-lg font-medium text-foreground mt-4">Technical and Log Data</h3>
          <p className="text-muted-foreground">
            We collect IP addresses, browser type, device information, and general usage logs to operate and improve the Service.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">3. How We Use Your Information</h2>
          <p className="text-muted-foreground">
            We use the information we collect to: provide and maintain the Service; process payments; send transactional emails (e.g., magic links, password resets); support integrations (e.g., GHL); improve the Service; comply with legal obligations; and communicate with you about the Service.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">4. Third-Party Services</h2>
          <p className="text-muted-foreground">
            We use the following third-party services, each with its own privacy policy:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li><strong className="text-foreground">Supabase</strong> — authentication and database (data storage)</li>
            <li><strong className="text-foreground">Stripe</strong> — payment processing</li>
            <li><strong className="text-foreground">Vercel</strong> — hosting and infrastructure</li>
            <li><strong className="text-foreground">GoHighLevel (GHL)</strong> — CRM integration (you configure this)</li>
            <li><strong className="text-foreground">Google Maps</strong> — address autocomplete and geocoding (when enabled)</li>
            <li><strong className="text-foreground">Resend or similar</strong> — transactional email (magic links, etc.)</li>
          </ul>
          <p className="text-muted-foreground mt-4">
            Your data may be processed by these providers in accordance with their policies and applicable data processing agreements.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">5. Cookies and Similar Technologies</h2>
          <p className="text-muted-foreground">
            We use cookies and similar technologies to maintain your session, remember preferences, and support authentication. Essential cookies are required for the Service to function. You can manage cookie preferences in your browser settings.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">6. Data Retention</h2>
          <p className="text-muted-foreground">
            We retain your account and product data for as long as your account is active. After account termination, we may retain data for a reasonable period for legal, regulatory, or operational purposes. You may request deletion of your data by contacting us.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">7. Data Security</h2>
          <p className="text-muted-foreground">
            We implement reasonable technical and organizational measures to protect your data, including encryption in transit and at rest. No method of transmission over the internet is 100% secure; we cannot guarantee absolute security.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">8. Your Rights</h2>
          <p className="text-muted-foreground">
            Depending on your location, you may have the right to: access your data; correct inaccurate data; request deletion; restrict or object to processing; data portability; and withdraw consent. To exercise these rights, contact us at support@cleanquote.io. You may also have the right to lodge a complaint with a supervisory authority.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">9. Data Transfers</h2>
          <p className="text-muted-foreground">
            Your data may be transferred to and processed in countries other than your own. We take appropriate safeguards to ensure your data receives an adequate level of protection.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">10. Children</h2>
          <p className="text-muted-foreground">
            The Service is not directed at individuals under 16. We do not knowingly collect personal information from children under 16. If you become aware of such data, please contact us.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">11. Changes to This Policy</h2>
          <p className="text-muted-foreground">
            We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on this page and updating the &quot;Last updated&quot; date. Your continued use of the Service after changes constitutes acceptance.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">12. Contact Us</h2>
          <p className="text-muted-foreground">
            For privacy-related questions or to exercise your rights, contact us at{' '}
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
