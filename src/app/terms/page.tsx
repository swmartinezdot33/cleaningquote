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
          <p className="text-muted-foreground">Last updated: January 30, 2026</p>

          <h2 className="text-xl font-semibold text-foreground mt-8">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground">
            By accessing or using CleanQuote.io (&quot;Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">2. Description of Service</h2>
          <p className="text-muted-foreground">
            CleanQuote.io is a software platform that helps cleaning companies create custom quote forms, calculate instant estimates, embed quote widgets on websites, and integrate with tools such as GoHighLevel (GHL). The Service includes quote generation, lead capture, calendar and callback booking, and related features.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">3. Account Registration</h2>
          <p className="text-muted-foreground">
            You must create an account to use the Service. You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. You must provide accurate and complete information when registering.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">4. Payment and Subscription</h2>
          <p className="text-muted-foreground">
            If you purchase a subscription or one-time product through CleanQuote.io, payment is processed by Stripe. You agree to pay all applicable fees and any applicable taxes. Subscription fees are billed in advance. Refunds are subject to our refund policy as stated at the time of purchase or in your subscription confirmation.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">5. Acceptable Use</h2>
          <p className="text-muted-foreground">
            You agree not to: (a) use the Service for any illegal purpose or in violation of any laws; (b) transmit malicious code, spam, or harmful content; (c) attempt to gain unauthorized access to the Service or its systems; (d) use the Service to collect personal data from end users without proper consent; (e) resell or redistribute the Service without authorization; or (f) interfere with or disrupt the Service or its infrastructure.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">6. Your Data and Content</h2>
          <p className="text-muted-foreground">
            You retain ownership of your data, including pricing, survey questions, and leads. By using the Service, you grant us a limited license to process, store, and transmit your data as necessary to provide the Service. See our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link> for how we handle your information.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">7. Intellectual Property</h2>
          <p className="text-muted-foreground">
            CleanQuote.io, including its software, design, branding, and documentation, is owned by us. You may not copy, modify, or create derivative works except as expressly permitted.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">8. Disclaimers</h2>
          <p className="text-muted-foreground">
            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE UNINTERRUPTED OR ERROR-FREE SERVICE. YOUR USE OF THIRD-PARTY INTEGRATIONS (E.G., GHL, STRIPE) IS SUBJECT TO THEIR TERMS AND POLICIES.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">9. Limitation of Liability</h2>
          <p className="text-muted-foreground">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, CLEANQUOTE.IO AND ITS AFFILIATES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE MONTHS PRECEDING THE CLAIM.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">10. Termination</h2>
          <p className="text-muted-foreground">
            We may suspend or terminate your account if you breach these terms. You may cancel your account at any time. Upon termination, your right to use the Service ceases. We may retain your data for a reasonable period as permitted by law.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">11. Changes</h2>
          <p className="text-muted-foreground">
            We may update these Terms from time to time. We will notify you of material changes by posting the updated Terms on this page and updating the &quot;Last updated&quot; date. Continued use of the Service after changes constitutes acceptance.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">12. Governing Law</h2>
          <p className="text-muted-foreground">
            These Terms shall be governed by the laws of the United States. Any disputes shall be resolved in the courts of competent jurisdiction.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">13. Contact</h2>
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
