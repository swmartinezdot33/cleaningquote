import Link from 'next/link';
import type { Metadata } from 'next';
import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd';

export const metadata: Metadata = {
  title: 'Add CleanQuote Sidebar Menu Items with Custom JS (GHL)',
  description:
    'Use GHL Agency Custom JS to inject extra sidebar menu items (Dashboard, Quotes, Contacts, Inbox, etc.) that open CleanQuote pages in the same iframe, when the marketplace app only allows one menu item.',
};

export default function GHLSidebarCustomJSPage() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', path: '/' },
          { name: 'Help', path: '/help' },
          { name: 'GHL Sidebar Custom JS', path: '/help/ghl-sidebar-custom-js' },
        ]}
      />
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/help" className="hover:text-primary hover:underline">
          Help
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">GHL Sidebar Custom JS</span>
      </nav>

      <h1 className="text-2xl font-bold text-foreground">
        Add CleanQuote Sidebar Menu Items with Custom JS
      </h1>
      <p className="text-muted-foreground">
        The GHL marketplace app install allows only <strong className="text-foreground">one</strong> custom
        menu item. You can use <strong className="text-foreground">Agency Custom JS</strong> to inject
        additional sidebar entries (Dashboard, Quotes, Contacts, Inbox, Leads, Tools, Service Areas,
        Pricing, Settings) that load CleanQuote pages in the same iframe with the correct location
        context.
      </p>

      <h2 className="text-lg font-semibold text-foreground mt-8">Steps</h2>
      <ol className="list-decimal list-inside space-y-2 text-foreground">
        <li>
          In GHL, go to <strong className="text-foreground">Agency</strong> (or Company) →{' '}
          <strong className="text-foreground">Settings</strong> → <strong className="text-foreground">Company</strong> →{' '}
          <strong className="text-foreground">Custom JS</strong>.
        </li>
        <li>
          Add this script tag (paste into the Custom JS area):
          <pre className="mt-2 rounded-lg bg-muted p-3 text-sm overflow-x-auto">
{`<script src="https://www.cleanquote.io/api/script/ghl-sidebar-menu.js" crossorigin="anonymous"></script>`}
          </pre>
        </li>
        <li>
          Save. The script runs on all sub-accounts. Menu items only appear when you are in a{' '}
          <strong className="text-foreground">location (sub-account)</strong> context so that a
          location ID is available.
        </li>
      </ol>

      <h2 className="text-lg font-semibold text-foreground mt-8">How it works</h2>
      <p className="text-muted-foreground">
        The script gets the current location ID from GHL (via <code className="bg-muted px-1 rounded">AppUtils.Utilities.getCurrentLocation()</code> when
        available, or from the page URL). It injects a small list of menu items into the GHL
        sidebar. When you click an item, it finds the CleanQuote iframe (the one opened by your
        single Custom Menu Link) and sets its <code className="bg-muted px-1 rounded">src</code> to{' '}
        <code className="bg-muted px-1 rounded">/v2/location/{'{locationId}'}?page=quotes</code> (or
        contacts, inbox, etc.). Your app then loads the correct dashboard page with location
        context.
      </p>

      <h2 className="text-lg font-semibold text-foreground mt-8">White-label or different domain</h2>
      <p className="text-muted-foreground">
        To use a different base URL (e.g. my.cleanquote.io), set it before the script runs:
      </p>
      <pre className="mt-2 rounded-lg bg-muted p-3 text-sm overflow-x-auto">
{`<script>window.CLEANQUOTE_SIDEBAR_BASE = 'https://my.cleanquote.io';</script>
<script src="https://www.cleanquote.io/api/script/ghl-sidebar-menu.js" crossorigin="anonymous"></script>`}
      </pre>

      <div className="mt-6 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-200">
        <p className="font-medium">Important</p>
        <p className="mt-1 text-sm">
          You must be inside a <strong className="text-foreground">sub-account (location)</strong>,
          not the Agency view, for the injected menu items to appear. Open CleanQuote at least once
          from your single Custom Menu Link so the iframe is loaded; then the script can navigate it
          when you click the injected items. If the iframe is not found, the script opens the
          CleanQuote URL in a new tab.
        </p>
      </div>

      <h2 className="text-lg font-semibold text-foreground mt-8">Caveats</h2>
      <ul className="list-disc list-inside space-y-1 text-foreground">
        <li>
          GHL’s sidebar DOM is not documented. If GHL updates their UI, the script’s selectors may
          need updating; the injected container has <code className="bg-muted px-1 rounded">id="cleanquote-ghl-sidebar-menu"</code> for
          debugging.
        </li>
        <li>
          If menu items do not appear, ensure you are in a location context (URL contains{' '}
          <code className="bg-muted px-1 rounded">/location/</code> or similar) and that Custom JS is enabled for
          your agency.
        </li>
        <li>
          If clicks open a new tab instead of updating the iframe, open CleanQuote from the
          sidebar once so the iframe exists, then try the injected items again.
        </li>
      </ul>

      <p className="mt-6">
        <Link href="/help/ghl-custom-menu-link" className="text-primary underline hover:no-underline">
          Set up the single Custom Menu Link first
        </Link>
        {' · '}
        <Link href="/help" className="text-primary underline hover:no-underline">
          Back to setup guides
        </Link>
      </p>
    </article>
  );
}
