import { CANONICAL_SITE_URL } from '@/lib/canonical-url';

export type BreadcrumbItem = { name: string; path: string };

interface BreadcrumbJsonLdProps {
  items: BreadcrumbItem[];
}

/**
 * Renders BreadcrumbList JSON-LD for SEO (breadcrumb rich results in SERPs).
 * Paths should be relative (e.g. "/help", "/help/google-maps-api").
 */
export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  const base = CANONICAL_SITE_URL.replace(/\/$/, '');
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${base}${item.path.startsWith('/') ? item.path : `/${item.path}`}`,
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
