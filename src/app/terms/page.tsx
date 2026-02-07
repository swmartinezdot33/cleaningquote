import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';

export const metadata = {
  title: 'Terms of Service | CleanQuote.io',
  description: 'Terms of Service for CleanQuote.io — smart quoting for cleaning companies.',
};

export default function TermsPage() {
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
          <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: January 31, 2026</p>

          <h2 className="text-xl font-semibold text-foreground mt-8">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground">
            By accessing or using CleanQuote.io (&quot;Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service. If you are using the Service on behalf of an organization, you represent that you have authority to bind that organization.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">2. Description of Service</h2>
          <p className="text-muted-foreground">
            CleanQuote.io is a sales solution delivered as a web application (no software to download). It helps cleaning companies create custom quote forms, calculate instant estimates, embed quote widgets on websites, and integrate with third-party tools. The Service includes quote generation, lead capture, calendar and callback booking, service area mapping, pricing configuration, survey customization, and related features. You access the Service through your web browser; it is built on Next.js, React, and other open-source and commercial technologies.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">3. Third-Party Services and Technologies</h2>
          <p className="text-muted-foreground">
            The Service relies on third-party infrastructure, APIs, and services. Your use of the Service is subject to the availability, terms, and policies of these providers. We do not control and are not responsible for third-party services. The Service utilizes:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
            <li><strong className="text-foreground">Supabase</strong> — authentication, user management, and PostgreSQL database storage</li>
            <li><strong className="text-foreground">Stripe</strong> — payment processing, subscriptions, and billing</li>
            <li><strong className="text-foreground">Vercel</strong> — hosting, deployment, and serverless infrastructure</li>
            <li><strong className="text-foreground">Vercel KV (Upstash Redis)</strong> — caching, configuration storage, and session data</li>
            <li><strong className="text-foreground">Resend</strong> — transactional email (magic links, invite emails, notifications)</li>
            <li><strong className="text-foreground">HighLevel</strong> — CRM integration when you configure it (contacts, opportunities, calendars, pipelines)</li>
            <li><strong className="text-foreground">Google Maps / Places API</strong> — address autocomplete and geocoding when you provide and configure your own API key</li>
          </ul>
          <p className="text-muted-foreground mt-4">
            Outages, rate limits, changes to APIs, or discontinuation of any third-party service may affect the Service. We have no liability for third-party failures or changes. You agree to comply with all applicable third-party terms.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">4. User Integrations and API Keys</h2>
          <p className="text-muted-foreground">
            Certain features require you to provide your own API keys or connect your own accounts:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
            <li><strong className="text-foreground">Google Maps API Key</strong> — If you enable address autocomplete or geocoding, you must provide your own Google Cloud API key. You are solely responsible for Google Cloud billing, compliance with Google&apos;s Terms of Service and API terms, and any usage limits. We are not liable for charges or issues arising from your Google Cloud usage.</li>
            <li><strong className="text-foreground">HighLevel</strong> — HighLevel integration uses your HighLevel API token and Location ID. You are responsible for your HighLevel account, API limits, and compliance with HighLevel&apos;s terms. We do not guarantee HighLevel API availability or compatibility with future HighLevel changes.</li>
          </ul>

          <h2 className="text-xl font-semibold text-foreground mt-8">5. Account Registration</h2>
          <p className="text-muted-foreground">
            You must create an account to use the Service. You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. You must provide accurate and complete information when registering. You may invite team members; you are responsible for their use of the Service under your account.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">6. Payment and Subscription</h2>
          <p className="text-muted-foreground">
            Payment is processed by Stripe. You agree to pay all applicable fees and taxes. Subscription fees are billed in advance. Refunds are subject to our refund policy at the time of purchase. You authorize us to charge your payment method. Failure to pay may result in suspension or termination. Price changes will be communicated in advance; continued use after changes constitutes acceptance.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">7. Acceptable Use</h2>
          <p className="text-muted-foreground">
            You agree not to: (a) use the Service for any illegal purpose or in violation of any laws; (b) transmit malicious code, spam, or harmful content; (c) attempt to gain unauthorized access to the Service, other accounts, or third-party systems; (d) use the Service to collect personal data from end users without proper consent and lawful basis; (e) resell or redistribute the Service without written authorization; (f) interfere with or disrupt the Service or its infrastructure; (g) exceed reasonable usage or abuse APIs; (h) use the Service to violate any third-party rights; or (i) reverse engineer, decompile, or attempt to extract source code except as permitted by law.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">8. Your Data and Content</h2>
          <p className="text-muted-foreground">
            You retain ownership of your data, including pricing, survey questions, leads, and end-user data collected through your quote forms. By using the Service, you grant us a limited, non-exclusive license to process, store, and transmit your data as necessary to provide the Service. You represent that you have the right to provide such data and that your use complies with applicable privacy laws. See our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link> for details.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">9. Embed Widget and End-User Data</h2>
          <p className="text-muted-foreground">
            When you embed our quote widget on your site or share links, your end users&apos; data (e.g., address, contact info, home details) is processed to generate quotes and may be synced to your HighLevel account if configured. You are the data controller for such end-user data; we process it on your behalf as a processor. You are responsible for obtaining consent, providing privacy notices, and complying with applicable laws (e.g., CCPA, GDPR) for data collected through your forms.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">10. Intellectual Property</h2>
          <p className="text-muted-foreground">
            CleanQuote.io, including its platform, web application, design, branding, documentation, and all related intellectual property, is owned by us or our licensors. You may not copy, modify, create derivative works, or use our trademarks except as expressly permitted. You may use the embed widget and shareable links as provided for their intended purpose.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">11. Disclaimers</h2>
          <p className="text-muted-foreground">
            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT GUARANTEE UNINTERRUPTED, ERROR-FREE, OR SECURE SERVICE. WE DO NOT WARRANT THAT QUOTES, PRICING CALCULATIONS, OR INTEGRATIONS WILL BE ACCURATE OR COMPLETE. YOUR USE OF THIRD-PARTY INTEGRATIONS, APIs, AND EMBEDDED CONTENT IS AT YOUR OWN RISK AND SUBJECT TO THEIR TERMS. SOME JURISDICTIONS DO NOT ALLOW WARRANTY DISCLAIMERS; IN SUCH CASES, THE ABOVE MAY NOT APPLY TO YOU.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">12. Limitation of Liability</h2>
          <p className="text-muted-foreground">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, CLEANQUOTE.IO, ITS AFFILIATES, AND THEIR RESPECTIVE OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF PROFITS, REVENUE, DATA, BUSINESS OPPORTUNITIES, OR GOODWILL, WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), STRICT LIABILITY, OR ANY OTHER LEGAL THEORY. IN NO EVENT SHALL OUR TOTAL AGGREGATE LIABILITY EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR ONE HUNDRED DOLLARS ($100), WHICHEVER IS GREATER. THESE LIMITATIONS APPLY EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. SOME JURISDICTIONS DO NOT ALLOW LIMITATION OF LIABILITY; IN SUCH CASES, OUR LIABILITY WILL BE LIMITED TO THE MAXIMUM EXTENT PERMITTED BY LAW.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">13. Indemnification</h2>
          <p className="text-muted-foreground">
            You agree to indemnify, defend, and hold harmless CleanQuote.io and its affiliates, officers, directors, employees, and agents from and against any claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys&apos; fees) arising from: (a) your use of the Service; (b) your violation of these Terms or any law; (c) your content, data, or end-user data; (d) your use of third-party integrations (e.g., HighLevel, Google Maps); or (e) any dispute between you and your end users or third parties.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">14. Force Majeure</h2>
          <p className="text-muted-foreground">
            We shall not be liable for any failure or delay in performing our obligations due to circumstances beyond our reasonable control, including but not limited to acts of God, war, terrorism, labor disputes, third-party service failures (e.g., Supabase, Stripe, Vercel, HighLevel), internet or telecommunications outages, government actions, or natural disasters.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">15. Termination</h2>
          <p className="text-muted-foreground">
            We may suspend or terminate your account if you breach these Terms. You may cancel your account at any time. Upon termination, your right to use the Service ceases immediately. We may retain your data for a reasonable period as permitted by law and our data retention policies. Sections that by their nature should survive termination (e.g., Intellectual Property, Limitation of Liability, Indemnification, Governing Law) shall survive.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">16. Data Retention and Export</h2>
          <p className="text-muted-foreground">
            We retain your data while your account is active. After termination, we may retain data for backup, legal, or operational purposes. You may export your data during the term; contact us for assistance. We are not obligated to retain your data indefinitely after termination.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">17. Changes</h2>
          <p className="text-muted-foreground">
            We may update these Terms from time to time. We will notify you of material changes by posting the updated Terms on this page and updating the &quot;Last updated&quot; date. Your continued use of the Service after changes constitutes acceptance. If you do not agree, you must stop using the Service.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">18. Governing Law and Dispute Resolution</h2>
          <p className="text-muted-foreground">
            These Terms shall be governed by the laws of the United States and the State of Delaware, without regard to conflict of law principles. Any dispute arising from these Terms or the Service shall be resolved exclusively in the state or federal courts located in Delaware, and you consent to personal jurisdiction there. You waive any right to a jury trial and any right to participate in a class action or representative proceeding. To the extent permitted by law, you agree to resolve any dispute on an individual basis.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">19. General</h2>
          <p className="text-muted-foreground">
            These Terms constitute the entire agreement between you and CleanQuote.io. If any provision is held invalid, the remaining provisions remain in effect. Our failure to enforce any right does not waive that right. You may not assign these Terms without our consent; we may assign them without restriction.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">20. Contact</h2>
          <p className="text-muted-foreground">
            For questions about these Terms, contact us at{' '}
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
