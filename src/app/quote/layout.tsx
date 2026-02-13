import type { Metadata } from 'next';

/** Client-facing layout: quote result pages /quote/[id]. No CleanQuote branding in link previews. */
export const metadata: Metadata = {
  title: { absolute: 'Get Your Quote' },
  description: 'View your instant quote',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: 'Get Your Quote',
    description: 'View your instant quote',
    images: [], // No image — avoids CleanQuote logo in link previews
  },
  twitter: {
    card: 'summary',
    title: 'Get Your Quote',
    description: 'View your instant quote',
  },
  robots: { index: true, follow: true },
};

export default function QuoteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
