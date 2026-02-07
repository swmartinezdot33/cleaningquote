import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help & setup guides',
  description:
    'CleanQuote help and setup guides: Google Maps API key, HighLevel integration, service area polygon, survey builder, pricing structure, and custom domain for cleaning quote software.',
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Help & setup guides | CleanQuote.io',
    description:
      'Step-by-step guides for CleanQuote: Google Maps API, HighLevel, service area, survey builder, pricing, and custom domain.',
  },
};

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/help" className="text-lg font-semibold text-primary">
            CleanQuote Help
          </Link>
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-primary hover:underline">
            Back to dashboard
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
