import Link from 'next/link';
import type { Metadata } from 'next';
import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd';

export const metadata: Metadata = {
  title: 'Google Maps',
  description:
    'CleanQuote provides Google Maps for address autocomplete and service area checks. No setup required for customers.',
};

export default function GoogleMapsApiHelpPage() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <BreadcrumbJsonLd items={[{ name: 'Home', path: '/' }, { name: 'Help', path: '/help' }, { name: 'Google Maps', path: '/help/google-maps-api' }]} />
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/help" className="hover:text-primary hover:underline">
          Help
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Google Maps</span>
      </nav>

      <h1 className="text-2xl font-bold text-foreground">Google Maps</h1>
      <p className="text-muted-foreground">
        CleanQuote includes Google Maps for address autocomplete and service area checks. No configuration is required on your side—your quote form gets these features automatically as part of your subscription.
      </p>

      <h2 className="text-lg font-semibold text-foreground mt-8">What you get</h2>
      <ul className="list-disc list-inside space-y-1 text-foreground">
        <li><strong>Address autocomplete</strong> — As visitors type an address, suggestions appear from Google Places.</li>
        <li><strong>Geocoding</strong> — Addresses are converted to coordinates for accurate service area checks.</li>
        <li><strong>Service area check</strong> — When you upload a KML polygon, we use the same integration to see if an address is inside or outside your area.</li>
      </ul>

      <p className="mt-6 text-sm text-muted-foreground">
        The platform key is configured by CleanQuote. Usage is covered by your subscription; you do not need a Google Cloud account or API key.
      </p>

      <p className="mt-4">
        <Link href="/dashboard" className="text-primary underline hover:no-underline">
          Back to dashboard
        </Link>
      </p>
    </article>
  );
}
