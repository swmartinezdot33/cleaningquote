import Link from 'next/link';
import type { Metadata } from 'next';
import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd';

export const metadata: Metadata = {
  title: 'Google Maps API key',
  description:
    'Create a Google Cloud API key and enable Maps, Places, and Geocoding so address autocomplete and service area checks work on your CleanQuote quote form.',
};

export default function GoogleMapsApiHelpPage() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <BreadcrumbJsonLd items={[{ name: 'Home', path: '/' }, { name: 'Help', path: '/help' }, { name: 'Google Maps API key', path: '/help/google-maps-api' }]} />
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/help" className="hover:text-primary hover:underline">
          Help
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Google Maps API key</span>
      </nav>

      <h1 className="text-2xl font-bold text-foreground">Google Maps API key</h1>
      <p className="text-muted-foreground">
        Use this guide to create a Google Maps API key and add it to CleanQuote so address autocomplete and service area checks work on your quote form.
      </p>

      <h2 className="text-lg font-semibold text-foreground mt-8">1. Where to get the key</h2>
      <ol className="list-decimal list-inside space-y-2 text-foreground">
        <li>
          Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">Google Cloud Console</a> and sign in with your Google account.
        </li>
        <li>
          Create or select a project (top bar: project dropdown → New project or choose an existing one).
        </li>
        <li>
          Enable the APIs CleanQuote needs:
          <ul className="ml-6 mt-2 list-disc list-inside space-y-1 text-muted-foreground">
            <li><strong className="text-foreground">Maps JavaScript API</strong> — for the map and address UI</li>
            <li><strong className="text-foreground">Places API</strong> — for address autocomplete</li>
            <li><strong className="text-foreground">Geocoding API</strong> — for converting addresses to coordinates (service area check)</li>
          </ul>
          To enable each: go to <strong className="text-foreground">APIs &amp; Services → Library</strong>, search for the API name, open it, and click <strong className="text-foreground">Enable</strong>.
        </li>
        <li>
          Create an API key: go to <strong className="text-foreground">APIs &amp; Services → Credentials</strong> → <strong className="text-foreground">+ Create credentials</strong> → <strong className="text-foreground">API key</strong>. Copy the key (you can restrict it later by HTTP referrer or IP if you want).
        </li>
      </ol>

      <h2 className="text-lg font-semibold text-foreground mt-8">2. Where to plug it into CleanQuote</h2>
      <ol className="list-decimal list-inside space-y-2 text-foreground">
        <li>
          In CleanQuote, open <strong className="text-foreground">Dashboard → Tools</strong>, then select your quoting tool.
        </li>
        <li>
          Go to the <strong className="text-foreground">Settings</strong> tab.
        </li>
        <li>
          Find the <strong className="text-foreground">Google Maps API Key</strong> card and expand it.
        </li>
        <li>
          Paste your API key into the <strong className="text-foreground">API key</strong> field and click <strong className="text-foreground">Save Google Maps key</strong>.
        </li>
      </ol>

      <p className="mt-6 text-sm text-muted-foreground">
        Google Cloud may charge for usage beyond the free tier. You are responsible for billing and compliance with Google&apos;s terms. Restricting the key (e.g. by referrer to your CleanQuote quote pages) is recommended.
      </p>

      <p className="mt-4">
        <Link href="/dashboard" className="text-primary underline hover:no-underline">
          Back to dashboard
        </Link>
      </p>
    </article>
  );
}
