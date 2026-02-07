import Link from 'next/link';
import type { Metadata } from 'next';
import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd';

export const metadata: Metadata = {
  title: 'Getting started',
  description:
    'Quick path from sign-up to your first embedded CleanQuote widget: sign up, set password, configure your tool, and embed on your site.',
};

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.cleanquote.io';

export default function GettingStartedHelpPage() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', path: '/' },
          { name: 'Help', path: '/help' },
          { name: 'Getting started', path: '/help/getting-started' },
        ]}
      />
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/help" className="hover:text-primary hover:underline">
          Help
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Getting started</span>
      </nav>

      <h1 className="text-2xl font-bold text-foreground">CleanQuote Getting Started Guide</h1>
      <p className="text-muted-foreground">
        Quick path from sign-up to your first embedded quote widget.
      </p>

      <h2 className="text-lg font-semibold text-foreground mt-8">1. Sign up</h2>
      <ul className="list-disc list-inside space-y-1 text-foreground">
        <li>
          Go to <a href={baseUrl} className="text-primary underline hover:no-underline">CleanQuote</a> (or your production URL).
        </li>
        <li>
          Click <strong>Get started</strong> / <strong>Subscribe</strong> and complete checkout (Stripe).
        </li>
        <li>
          You&apos;ll receive an email to <strong>set your password</strong> (from CleanQuote or your Resend address).
        </li>
      </ul>

      <h2 className="text-lg font-semibold text-foreground mt-8">2. Set your password</h2>
      <ul className="list-disc list-inside space-y-1 text-foreground">
        <li>Open the email and click <strong>Set password</strong> (or the link in the email).</li>
        <li>Choose a strong password and confirm.</li>
        <li>You&apos;ll be signed in and redirected to your <strong>Dashboard</strong>.</li>
      </ul>

      <h2 className="text-lg font-semibold text-foreground mt-8">3. Your first quoting tool</h2>
      <ul className="list-disc list-inside space-y-1 text-foreground">
        <li>
          In the Dashboard you&apos;ll see your <strong>organization</strong> and a default <strong>tool</strong> (or &quot;Quote form&quot;).
        </li>
        <li>
          <strong>To create another tool:</strong> use <strong>Add tool</strong> (or equivalent) and give it a name and slug (e.g. <code className="bg-muted px-1 rounded">my-cleaning-quote</code>).
        </li>
        <li>
          <strong>Configure the tool:</strong>
          <ul className="ml-6 mt-2 list-disc list-inside space-y-1 text-muted-foreground">
            <li><strong className="text-foreground">Pricing:</strong> Create pricing structures under <strong className="text-foreground">Dashboard → Pricing</strong>; assign one to this tool in <strong className="text-foreground">Tool → Settings → Pricing Structure</strong>.</li>
            <li><strong className="text-foreground">Form / survey:</strong> Adjust questions and fields if needed.</li>
            <li><strong className="text-foreground">CRM (optional):</strong> Connect your CRM in <strong className="text-foreground">Settings → HighLevel Integration</strong> (one per org); then set pipelines, calendars, tags, and webhooks per tool in <strong className="text-foreground">Tool Settings → Advanced Configuration</strong>.</li>
            <li><strong className="text-foreground">Service area (optional):</strong> Add areas under <strong className="text-foreground">Dashboard → Service areas</strong> (ZIP code or draw/upload KML); assign to the tool in <strong className="text-foreground">Tool Settings → Service Area(s)</strong>.</li>
          </ul>
        </li>
      </ul>
      <p className="text-foreground mt-2">Your quote form URL will look like:</p>
      <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
        {baseUrl}/t/&#123;your-org-slug&#125;/&#123;tool-slug&#125;
      </pre>
      <p className="text-muted-foreground text-sm">Example: {baseUrl}/t/acme-cleaning/default</p>

      <h2 className="text-lg font-semibold text-foreground mt-8">4. Embed the widget on your site</h2>
      <p className="font-medium text-foreground">Option A – iframe (simplest)</p>
      <p className="text-foreground">Add this to your website where you want the quote form:</p>
      <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap">{`<iframe
  src="${baseUrl}/t/{your-org-slug}/{tool-slug}"
  title="Get Your Quote"
  width="100%"
  height="800"
  frameborder="0"
  style="border: none; max-width: 600px;"
></iframe>`}</pre>
      <p className="text-muted-foreground text-sm mt-2">
        Replace <code className="bg-muted px-1 rounded">&#123;your-org-slug&#125;</code> and <code className="bg-muted px-1 rounded">&#123;tool-slug&#125;</code> with your actual org and tool slugs (see the Dashboard or the form URL).
      </p>
      <p className="font-medium text-foreground mt-4">Option B – direct link</p>
      <p className="text-foreground">Link a button or text to the form URL:</p>
      <p className="font-mono text-sm bg-muted p-2 rounded break-all">{baseUrl}/t/&#123;your-org-slug&#125;/&#123;tool-slug&#125;</p>
      <p className="text-muted-foreground text-sm mt-2">
        <strong>Optional:</strong> Add UTM parameters for tracking, e.g. <code className="bg-muted px-1 rounded">.../default?utm_source=website&utm_medium=homepage</code>
      </p>

      <h2 className="text-lg font-semibold text-foreground mt-8">5. Test the flow</h2>
      <ol className="list-decimal list-inside space-y-2 text-foreground">
        <li>Open your embed or form URL in an incognito/private window.</li>
        <li>Fill out the form and submit a quote.</li>
        <li>Confirm you receive the quote (and, if GHL is connected, that the contact/opportunity appears in GHL).</li>
      </ol>

      <h2 className="text-lg font-semibold text-foreground mt-8">Support</h2>
      <p className="text-foreground">
        <strong>Need help?</strong> Use the &quot;Help&quot; or &quot;Contact&quot; link in the dashboard, or refer to the other <Link href="/help" className="text-primary underline hover:no-underline">setup guides</Link>.
      </p>

      <p className="mt-8 text-sm text-muted-foreground">Last updated: February 2026</p>

      <p className="mt-6">
        <Link href="/help" className="text-primary underline hover:no-underline">
          ← Back to setup guides
        </Link>
      </p>
    </article>
  );
}
