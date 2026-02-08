import Link from 'next/link';
import type { Metadata } from 'next';
import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd';

export const metadata: Metadata = {
  title: 'Add CleanQuote as a Custom Menu Link in GoHighLevel',
  description: 'Configure CleanQuote in your GHL sidebar using a Custom Menu Link with the correct URL so location context is passed.',
};

export default function GHLCustomMenuLinkHelpPage() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', path: '/' },
          { name: 'Help', path: '/help' },
          { name: 'GHL Custom Menu Link', path: '/help/ghl-custom-menu-link' },
        ]}
      />
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/help" className="hover:text-primary hover:underline">
          Help
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">GHL Custom Menu Link</span>
      </nav>

      <h1 className="text-2xl font-bold text-foreground">Add CleanQuote as a Custom Menu Link</h1>
      <p className="text-muted-foreground">
        CleanQuote receives the <strong className="text-foreground">location ID from GHL user context</strong> (postMessage) when the app is embedded in a Custom Menu Link. No need to pass locationId in the URL.
      </p>

      <h2 className="text-lg font-semibold text-foreground mt-8">Steps</h2>
      <ol className="list-decimal list-inside space-y-2 text-foreground">
        <li>
          In GHL, go to <strong className="text-foreground">Settings</strong> → <strong className="text-foreground">Custom Menu Links</strong>.
        </li>
        <li>
          Create a new link or edit the existing CleanQuote link.
        </li>
        <li>
          Set the <strong className="text-foreground">URL</strong> to:
          <pre className="mt-2 rounded-lg bg-muted p-3 text-sm overflow-x-auto">
{`https://www.cleanquote.io/dashboard`}
          </pre>
          <p className="mt-2 text-sm text-muted-foreground">
            For white-label (my.cleanquote.io, etc.), append <code className="bg-muted px-1 rounded">&amp;sessionKey</code> so GHL passes user context to the iframe.
          </p>
        </li>
        <li>
          Set <strong className="text-foreground">Sidebar Preference</strong> to <strong className="text-foreground">Sub-Account&apos;s sidebar</strong> (or both).
        </li>
        <li>
          Choose <strong className="text-foreground">Open in an Embedded Page (iFrame)</strong> so CleanQuote runs inside GHL.
        </li>
        <li>
          Save the link.
        </li>
      </ol>

      <h2 className="text-lg font-semibold text-foreground mt-8">How it works</h2>
      <p className="text-muted-foreground">
        CleanQuote requests user context from GHL via postMessage. GHL responds with encrypted session data; we decrypt it on our backend using your Shared Secret (GHL_APP_SSO_KEY). The decrypted data includes <code className="bg-muted px-1 rounded">activeLocation</code> (location ID). Ensure your Marketplace App Shared Secret matches GHL_APP_SSO_KEY in Vercel.
      </p>

      <div className="mt-6 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-200">
        <p className="font-medium">Important</p>
        <p className="mt-1 text-sm">
          Users must open CleanQuote from inside a sub-account (location), not from the Agency view. User context with location ID is only sent when viewing a specific location.
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
