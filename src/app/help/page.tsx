import Link from 'next/link';

const guides = [
  {
    slug: 'google-maps-api',
    title: 'Google Maps API key',
    description: 'Create a Google Cloud API key and enable Maps, Places, and Geocoding so address autocomplete and service area checks work on your quote form.',
  },
  {
    slug: 'ghl-integration',
    title: 'HighLevel integration (PIT token & Location ID)',
    description: 'Get your HighLevel Private Integration Token (PIT) and Location ID so leads, contacts, appointments, and opportunities sync with CleanQuote.',
  },
  {
    slug: 'service-area-polygon',
    title: 'Service area polygon in Google',
    description: 'Create and draw a service area polygon in Google My Maps, export to KML, and upload it to CleanQuote to qualify leads by location.',
  },
] as const;

export default function HelpPage() {
  return (
    <div className="space-y-8">
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
