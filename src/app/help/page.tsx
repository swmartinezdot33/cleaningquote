import Link from 'next/link';
import type { Metadata } from 'next';
import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd';

export const metadata: Metadata = {
  title: 'Setup guides',
  description:
    'Step-by-step CleanQuote setup guides: Google Maps API key, HighLevel integration, service area polygon, survey builder, pricing structure, and custom domain for the CleanQuote sales solution.',
};

const guides = [
  {
    slug: 'getting-started',
    title: 'Getting started',
    description: 'Quick path from sign-up to your first embedded quote widget: sign up, set password, configure your tool, and embed on your site.',
  },
  {
    slug: 'google-maps-api',
    title: 'Google Maps',
    description: 'Address autocomplete and service area checks are included; CleanQuote provides the integration. No setup required.',
  },
  {
    slug: 'ghl-integration',
    title: 'HighLevel integration (PIT token & Location ID)',
    description: 'Connect HighLevel once per org in Settings. Get your PIT token and Location ID so leads, contacts, appointments, and opportunities sync with CleanQuote.',
  },
  {
    slug: 'ghl-config',
    title: 'Advanced Configuration (CRM & Webhooks)',
    description: 'Per-tool CRM settings, form behavior (iframe, internal tool), and webhooks for Zapier or other CRMs. Set your connection in Settings first.',
  },
  {
    slug: 'service-area-polygon',
    title: 'Service area polygon and ZIP codes',
    description: 'Add service areas by US ZIP code or draw/upload polygons. Mix ZIP zones and drawn shapes in the same map; assign areas to tools in Tool Settings.',
  },
  {
    slug: 'survey-builder',
    title: 'Survey builder',
    description: 'Add, edit, reorder quote form questions and map them to HighLevel fields for lead sync.',
  },
  {
    slug: 'pricing-structure-builder',
    title: 'Pricing structure builder',
    description: 'Create pricing structures (manual or Excel); assign which structure each tool uses in Tool Settings → Pricing Structure. Each structure has its own initial cleaning and multipliers.',
  },
  {
    slug: 'custom-domain',
    title: 'Custom domain for public links',
    description: 'Set your custom domain in Public link base URL and save. CleanQuote adds it automatically and shows you the DNS records to add at your registrar.',
  },
] as const;

export default function HelpPage() {
  return (
    <div className="space-y-8">
      <BreadcrumbJsonLd items={[{ name: 'Home', path: '/' }, { name: 'Help', path: '/help' }]} />
      <div>
        <h1 className="text-2xl font-bold text-foreground">Setup guides</h1>
        <p className="mt-1 text-muted-foreground">
          Step-by-step instructions for configuring integrations in CleanQuote.
        </p>
      </div>
      <ul className="space-y-4">
        {guides.map((g) => (
          <li key={g.slug}>
            <Link
              href={`/help/${g.slug}`}
              className="block rounded-lg border border-border bg-card p-4 shadow-sm transition-colors hover:bg-muted/50 hover:border-primary/30"
            >
              <h2 className="font-semibold text-foreground">{g.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{g.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
