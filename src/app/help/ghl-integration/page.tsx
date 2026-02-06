import Link from 'next/link';
import type { Metadata } from 'next';
import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd';

export const metadata: Metadata = {
  title: 'HighLevel integration (PIT token & Location ID)',
  description:
    'Get your HighLevel Private Integration Token (PIT) and Location ID so leads, contacts, appointments, and opportunities sync with CleanQuote.',
};

export default function GHLIntegrationHelpPage() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <BreadcrumbJsonLd items={[{ name: 'Home', path: '/' }, { name: 'Help', path: '/help' }, { name: 'HighLevel integration', path: '/help/ghl-integration' }]} />
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/help" className="hover:text-primary hover:underline">
          Help
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">HighLevel integration (PIT token &amp; Location ID)</span>
      </nav>

      <h1 className="text-2xl font-bold text-foreground">HighLevel Integration: PIT Token and Location ID</h1>
      <p className="text-muted-foreground">
        Use this guide to set up your HighLevel Private Integration Token (PIT) and Location ID in CleanQuote so leads, contacts, appointments, and opportunities sync correctly.
      </p>

      <h2 className="text-lg font-semibold text-foreground mt-8">1. Where to get the PIT token</h2>
      <ol className="list-decimal list-inside space-y-2 text-foreground">
        <li>
          Log in to your <a href="https://app.gohighlevel.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">HighLevel dashboard</a>.
        </li>
        <li>
          <strong className="text-foreground">For a Location-level PIT</strong> (recommended for security):
          <ul className="ml-6 mt-2 list-disc list-inside space-y-1 text-muted-foreground">
            <li>Select your sub-account (location) from the account switcher.</li>
            <li>Go to <strong className="text-foreground">Settings</strong> → <strong className="text-foreground">Integrations</strong> → <strong className="text-foreground">API</strong>.</li>
            <li>Click <strong className="text-foreground">Create new Integration</strong> or use an existing one.</li>
          </ul>
        </li>
        <li>
          <strong className="text-foreground">For an Agency-level PIT</strong>:
          <ul className="ml-6 mt-2 list-disc list-inside space-y-1 text-muted-foreground">
            <li>Go to <strong className="text-foreground">Settings</strong> → <strong className="text-foreground">Private Integrations</strong> (may be under Labs if not visible).</li>
            <li>Click <strong className="text-foreground">Create new Integration</strong>.</li>
          </ul>
        </li>
        <li>
          Give the integration a name (e.g., &quot;CleanQuote&quot;) and select the required scopes: <strong className="text-foreground">contacts.write</strong> (required), <strong className="text-foreground">opportunities.readonly</strong>, <strong className="text-foreground">opportunities.write</strong>, <strong className="text-foreground">calendars.write</strong>, <strong className="text-foreground">calendars.readonly</strong>, <strong className="text-foreground">locations.readonly</strong>, <strong className="text-foreground">locations/customFields.readonly</strong>, <strong className="text-foreground">locations/tags.readonly</strong>, <strong className="text-foreground">locations/tags.write</strong>, <strong className="text-foreground">users.readonly</strong> (for appointments).
        </li>
        <li>
          Copy the token. It typically starts with <code className="bg-muted px-1 rounded">ghl_pit_</code>. You won&apos;t be able to view it again later, so save it somewhere secure.
        </li>
      </ol>

      <h2 className="text-lg font-semibold text-foreground mt-8">2. Where to find the Location ID</h2>
      <ol className="list-decimal list-inside space-y-2 text-foreground">
        <li>
          Open the sub-account (location) in your HighLevel dashboard.
        </li>
        <li>
          Look at the browser URL. The Location ID is the string after <code className="bg-muted px-1 rounded">/location/</code>, for example: <code className="bg-muted px-1 rounded">https://app.gohighlevel.com/v2/location/ve9EPM428h8vShlRW1KT/...</code> → <strong className="text-foreground">ve9EPM428h8vShlRW1KT</strong>.
        </li>
        <li>
          You can also find it under <strong className="text-foreground">Settings</strong> → <strong className="text-foreground">Business Profile</strong> or <strong className="text-foreground">Integrations</strong> → <strong className="text-foreground">API</strong> on the location.
        </li>
      </ol>

      <h2 className="text-lg font-semibold text-foreground mt-8">3. Where to plug them into CleanQuote</h2>
      <p className="text-foreground mb-2">
        HighLevel is connected <strong className="text-foreground">once per organization</strong>. All tools in that org use the same connection. Per-tool CRM behavior (pipelines, calendars, tags) is set separately in each tool&apos;s Settings.
      </p>
      <ol className="list-decimal list-inside space-y-2 text-foreground">
        <li>
          In CleanQuote, go to <strong className="text-foreground">Dashboard</strong> → <strong className="text-foreground">Settings</strong> (org-level menu).
        </li>
        <li>
          Find the <strong className="text-foreground">HighLevel Integration</strong> section.
        </li>
        <li>
          Paste your <strong className="text-foreground">PIT token</strong> into the API token field.
        </li>
        <li>
          Enter your <strong className="text-foreground">Location ID</strong> in the Location ID field.
        </li>
        <li>
          Click <strong className="text-foreground">Save HighLevel connection</strong>.
        </li>
      </ol>

      <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-2">Required scopes</p>
        <p className="text-sm text-amber-800 dark:text-amber-300">
          Your PIT token must include at least: <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">contacts.write</code>, <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">opportunities.readonly</code>, <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">opportunities.write</code>, <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">calendars.write</code>, <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">calendars.readonly</code>, <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">users.readonly</code>. Add <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">locations/tags.readonly</code> and <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">locations/tags.write</code> for service area tagging.
        </p>
      </div>

      <p className="mt-6">
        <Link href="/help" className="text-primary underline hover:no-underline">
          ← Back to setup guides
        </Link>
      </p>
    </article>
  );
}
